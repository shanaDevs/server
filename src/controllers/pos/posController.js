const db = require('../../models');
const { Op } = require('sequelize');

/**
 * Create complete POS transaction (Sale + Payments)
 * POST /api/pos/transaction
 */
exports.createPOSTransaction = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const {
            customerId,
            items,
            payments,
            discountAmount = 0,
            taxRate = 0,
            saleType = 'retail',
            notes,
            returnItems = []
        } = req.body;

        // Validate required fields
        if (!items || items.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Items are required'
            });
        }

        if (!payments || payments.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'At least one payment is required'
            });
        }

        // Calculate SALE ITEMS totals only
        // Note: Overall discount applies ONLY to sale items, NOT to return items
        let subtotal = 0;
        let totalTaxAmountVal = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await db.Product.findByPk(item.productId, { transaction });

            if (!product) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: `Product with ID ${item.productId} not found`
                });
            }

            const itemQty = parseFloat(item.quantity || 0);
            const itemPrice = parseFloat(item.unitPrice || 0);
            const itemTotal = itemQty * itemPrice;
            const itemDiscount = parseFloat(item.discount || 0);
            const itemNetTotal = itemTotal - itemDiscount;

            // Calculate item-wise tax
            let itemTaxPercentage = 0;
            let itemTaxAmount = 0;
            let itemTaxType = 'none';

            if (product.isTaxable !== false) {
                itemTaxPercentage = parseFloat(product.taxRate || taxRate || 0);
                itemTaxType = product.taxType === 'fixed' ? 'fixed' : 'percentage';

                if (itemTaxType === 'fixed') {
                    itemTaxAmount = itemTaxPercentage * itemQty;
                } else {
                    itemTaxAmount = itemNetTotal * (itemTaxPercentage / 100);
                }
            }

            subtotal += itemNetTotal;
            totalTaxAmountVal += itemTaxAmount;

            processedItems.push({
                productId: item.productId,
                productName: product.name,
                quantity: itemQty,
                unitPrice: itemPrice,
                discount: itemDiscount,
                total: itemNetTotal, // Store pre-tax total for consistency
                taxPercentage: itemTaxPercentage,
                taxAmount: itemTaxAmount,
                taxType: itemTaxType
            });
        }

        // Calculate final amounts for SALE ITEMS ONLY
        // Overall discount is applied to sale items subtotal, not return items
        const finalDiscountAmount = parseFloat(discountAmount || 0);
        const netAmount = subtotal - finalDiscountAmount + totalTaxAmountVal;

        // Calculate payment totals
        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const remainingAmount = netAmount - totalPaid;

        // Determine payment status
        let paymentStatus = 'pending';
        if (totalPaid >= netAmount - 0.01) { // Tolerate small floating point diffs
            paymentStatus = 'paid';
        } else if (totalPaid > 0) {
            paymentStatus = 'partial';
        }

        // Generate sale number
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        const lastSale = await db.Sale.findOne({
            where: {
                saleNumber: { [Op.like]: `SALE-${dateStr}-%` }
            },
            order: [['createdAt', 'DESC']],
            transaction
        });

        let sequence = 1;
        if (lastSale) {
            const lastSequence = parseInt(lastSale.saleNumber.split('-')[1] || lastSale.saleNumber.split('-')[2]); // Handle both formats
            if (!isNaN(lastSequence)) {
                sequence = lastSequence + 1;
            }
        }
        const saleNumber = `SALE-${dateStr}-${String(sequence).padStart(5, '0')}`;

        // Get system settings for taxName
        const settings = await db.SystemSettings.findOne({ transaction });
        const taxName = settings?.taxName || 'VAT';

        // Create sale
        const sale = await db.Sale.create({
            saleNumber,
            customerId: customerId || null,
            subtotal,
            discountAmount: finalDiscountAmount,
            taxAmount: totalTaxAmountVal,
            taxPercentage: items.length === 1 ? processedItems[0].taxPercentage : (taxRate || 0),
            taxName,
            totalAmount: netAmount,
            paidAmount: totalPaid,
            creditAmount: Math.max(0, remainingAmount),
            paymentStatus,
            saleStatus: 'completed',
            saleType,
            saleDate: new Date(),
            createdBy: req.user.id,
            branchId: req.branchId,
            notes
        }, { transaction });

        // Create sale items
        for (const item of processedItems) {
            await db.SaleItem.create({
                saleId: sale.id,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                totalAmount: item.total, // Using totalAmount field (pre-tax)
                taxPercentage: item.taxPercentage,
                taxAmount: item.taxAmount,
                taxType: item.taxType,
                branchId: req.branchId
            }, { transaction });

            // Update inventory
            await db.Inventory.decrement('quantity', {
                by: item.quantity,
                where: {
                    productId: item.productId,
                    branchId: req.branchId
                },
                transaction
            });
        }

        // Create Sale Return Items
        for (const returnItem of processedReturnItems) {
            await db.SaleReturnItem.create({
                saleId: sale.id,
                productId: returnItem.productId,
                productName: returnItem.productName,
                quantity: returnItem.quantity,
                unitPrice: returnItem.unitPrice,
                discountAmount: returnItem.discountAmount,
                totalAmount: returnItem.totalAmount, // Pre-tax
                taxPercentage: returnItem.taxPercentage,
                taxAmount: returnItem.taxAmount,
                taxType: returnItem.taxType,
                returnReason: returnItem.returnReason,
                condition: returnItem.condition
            }, { transaction });

            // Restore inventory
            const latestBatch = await db.Inventory.findOne({
                where: {
                    productId: returnItem.productId,
                    quantity: { [Op.gt]: 0 }
                },
                order: [['createdAt', 'DESC']],
                transaction
            });

            if (latestBatch) {
                await db.Inventory.create({
                    productId: returnItem.productId,
                    grnId: latestBatch.grnId,
                    supplierId: latestBatch.supplierId,
                    supplierName: latestBatch.supplierName,
                    supplierPhone: latestBatch.supplierPhone,
                    referenceType: 'sale_return',
                    batchNumber: latestBatch.batchNumber,
                    expiryDate: latestBatch.expiryDate,
                    locationId: latestBatch.locationId,
                    branchId: req.branchId,
                    quantity: returnItem.quantity,
                    unitCost: latestBatch.unitCost,
                    sellingPrice: latestBatch.sellingPrice,
                    mrp: latestBatch.mrp,
                    performedBy: req.user.id,
                    remarks: `Return from POS Sale ${saleNumber}`
                }, { transaction });
            } else {
                await db.Inventory.create({
                    productId: returnItem.productId,
                    referenceType: 'sale_return',
                    quantity: returnItem.quantity,
                    branchId: req.branchId,
                    unitCost: 0,
                    sellingPrice: returnItem.unitPrice,
                    performedBy: req.user.id,
                    remarks: `Return from POS Sale ${saleNumber} - New batch`
                }, { transaction });
            }

            // Log to product audit
            await db.ProductAuditLog.create({
                productId: returnItem.productId,
                action: 'stock_adjusted',
                changedBy: req.user.id,
                branchId: req.branchId,
                notes: `Return from POS Sale ${saleNumber}`
            }, { transaction });
        }

        // Create payments
        const createdPayments = [];
        for (const payment of payments) {
            const salePayment = await db.SalePayment.create({
                saleId: sale.id,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod || 'cash',
                paymentDate: new Date(),
                referenceNumber: payment.referenceNumber || null,
                cardType: payment.cardType || null,
                cardLastFour: payment.cardLastFour || null,
                bankName: payment.bankName || null,
                notes: payment.notes || null,
                processedBy: req.user.id,
                totalAmount: netAmount, // Or netPayable? Ideally Sale Amount, but Payment relates to whole txn
                paidAmount: totalPaid,
                remainingAmount: remainingAmount,
                paymentStatus: paymentStatus,
                branchId: req.branchId
            }, { transaction });

            createdPayments.push(salePayment);
        }

        // Update customer credit if partial payment (credit sale)
        if (customerId && remainingAmount > 0) {
            // Get current customer credit balance
            const customer = await db.Customer.findByPk(customerId, { transaction });
            if (customer) {
                const previousCredit = parseFloat(customer.currentCredit) || 0;
                const newCreditBalance = previousCredit + remainingAmount;

                // Update customer's current credit balance
                await customer.update({
                    currentCredit: newCreditBalance
                }, { transaction });

                // Create CustomerCredit transaction record
                await db.CustomerCredit.create({
                    customerId: customerId,
                    transactionType: 'credit_issued',
                    amount: remainingAmount,
                    balanceAmount: newCreditBalance,
                    referenceType: 'sale',
                    referenceId: sale.id,
                    status: 'pending',
                    notes: `Credit from sale ${saleNumber}`,
                    performedBy: req.user.id,
                    branchId: req.branchId
                }, { transaction });
            }
        }

        await transaction.commit();

        // Fetch complete sale with items and payments
        const completeSale = await db.Sale.findByPk(sale.id, {
            include: [
                {
                    model: db.SaleItem,
                    as: 'items',
                    include: [{
                        model: db.Product,
                        as: 'product',
                        attributes: ['id', 'name', 'productCode']
                    }]
                },
                {
                    model: db.SalePayment,
                    as: 'payments'
                },
                {
                    model: db.Customer,
                    as: 'customer',
                    attributes: ['id', 'customerName', 'phone', 'email']
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Transaction completed successfully',
            data: {
                sale: completeSale,
                summary: {
                    saleNumber: sale.saleNumber,
                    totalAmount: totalAmount,
                    discountAmount: discountAmount,
                    taxAmount: taxAmount,
                    netAmount: netAmount,
                    totalPaid: totalPaid,
                    remainingAmount: remainingAmount,
                    paymentStatus: paymentStatus,
                    itemCount: items.length,
                    paymentCount: payments.length
                }
            }
        });

    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// ==================== HELD BILL FUNCTIONS ====================

/**
 * Hold/Save a bill for later
 * POST /api/pos/hold-bill
 */
exports.holdBill = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const {
            customerId,
            holdName,
            items,
            subtotal,
            discountAmount = 0,
            discountPercentage = 0,
            taxRate = 0,
            taxAmount,
            totalAmount,
            saleType = 'retail',
            notes,
            expiresAt,
            returnItems = []
        } = req.body;

        // Calculate SALE ITEMS totals and enrich items with tax info
        // Note: Overall discount applies ONLY to sale items, NOT to return items
        let calculatedSubtotal = 0;
        let calculatedTaxAmount = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await db.Product.findByPk(item.productId, { transaction });

            const itemQty = parseFloat(item.quantity || 0);
            const itemPrice = parseFloat(item.unitPrice || 0);
            const itemDiscount = parseFloat(item.discount || 0);
            const itemNetTotal = (itemQty * itemPrice) - itemDiscount;

            let itemTaxPercentage = 0;
            let itemTaxAmount = 0;
            let itemTaxType = 'none';

            if (product && product.isTaxable !== false) {
                // Use product specific tax or default
                itemTaxPercentage = product.taxRate ? parseFloat(product.taxRate) : parseFloat(taxRate || 0);
                itemTaxType = product.taxType === 'fixed' ? 'fixed' : 'percentage';

                if (itemTaxType === 'fixed') {
                    itemTaxAmount = itemTaxPercentage * itemQty;
                } else {
                    itemTaxAmount = itemNetTotal * (itemTaxPercentage / 100);
                }
            } else if (!product) {
                // If product not found (shouldn't happen with validation), use default tax if provided
                itemTaxPercentage = parseFloat(taxRate || 0);
                itemTaxAmount = itemNetTotal * (itemTaxPercentage / 100);
                itemTaxType = 'percentage';
            }

            calculatedSubtotal += itemNetTotal;
            calculatedTaxAmount += itemTaxAmount;

            processedItems.push({
                ...item,
                quantity: itemQty,
                unitPrice: itemPrice,
                discount: itemDiscount,
                total: itemNetTotal,
                taxPercentage: itemTaxPercentage,
                taxAmount: itemTaxAmount,
                taxType: itemTaxType
            });
        }

        // Calculate totals for SALE ITEMS ONLY
        // The overall discount is applied ONLY to sale items, not return items
        const finalSubtotal = subtotal || calculatedSubtotal;
        const finalDiscountAmount = parseFloat(discountAmount || 0);
        const finalTaxAmount = taxAmount || calculatedTaxAmount;
        
        // Important: finalTotalAmount should be (sale items subtotal - overall discount + tax on discounted amount)
        const finalTotalAmount = totalAmount || (finalSubtotal - finalDiscountAmount + finalTaxAmount);

        // Get system settings for taxName
        const settings = await db.SystemSettings.findOne({ transaction });
        const taxNamePrefix = settings?.taxName || 'VAT';

        // Create held bill
        const heldBill = await db.HeldBill.create({
            customerId: customerId || null,
            holdName: holdName || null,
            items: JSON.stringify(processedItems),
            subtotal: finalSubtotal,
            discountAmount: finalDiscountAmount,
            discountPercentage,
            taxRate: taxRate || 0,
            taxAmount: finalTaxAmount,
            totalAmount: finalTotalAmount,
            saleType,
            notes,
            status: 'held',
            expiresAt,
            createdBy: req.user.id,
            branchId: req.branchId,
            returnItems: returnItems && returnItems.length > 0 ? JSON.stringify(returnItems) : null
        }, { transaction });

        await transaction.commit();

        // Fetch with associations
        const completeBill = await db.HeldBill.findByPk(heldBill.id, {
            include: [
                {
                    model: db.Customer,
                    as: 'customer',
                    attributes: ['id', 'customerName', 'phone']
                },
                {
                    model: db.User,
                    as: 'creator',
                    attributes: ['id', 'userName', 'firstName', 'lastName']
                }
            ]
        });

        // Parse items back to object for response
        const responseData = completeBill.toJSON();
        if (responseData.items && typeof responseData.items === 'string') {
            responseData.items = JSON.parse(responseData.items);
        }
        if (responseData.returnItems && typeof responseData.returnItems === 'string') {
            responseData.returnItems = JSON.parse(responseData.returnItems);
        }

        res.status(201).json({
            success: true,
            message: 'Bill held successfully',
            data: responseData
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Get all held bills
 * GET /api/pos/held-bills
 */
exports.getHeldBills = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status = 'held', customerId, search } = req.query;
        const offset = (page - 1) * parseInt(limit);

        const where = { status };

        // Apply branch filter
        if (req.branchAccess && !req.branchAccess.canAccessAllBranches) {
            where.branchId = req.branchId;
        }

        if (customerId) {
            where.customerId = customerId;
        }

        if (search) {
            where[Op.or] = [
                { holdNumber: { [Op.like]: `%${search}%` } },
                { holdName: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await db.HeldBill.findAndCountAll({
            where,
            include: [
                {
                    model: db.Customer,
                    as: 'customer',
                    attributes: ['id', 'customerName', 'phone'],
                    required: false
                },
                {
                    model: db.User,
                    as: 'creator',
                    attributes: ['id', 'userName', 'firstName', 'lastName']
                }
            ],
            limit: parseInt(limit),
            offset,
            order: [['holdDate', 'DESC']]
        });

        // Parse items for each bill
        const parsedRows = rows.map(bill => {
            const billData = bill.toJSON();
            if (billData.items && typeof billData.items === 'string') {
                billData.items = JSON.parse(billData.items);
            }
            if (billData.returnItems && typeof billData.returnItems === 'string') {
                billData.returnItems = JSON.parse(billData.returnItems);
            }
            return billData;
        });

        res.json({
            success: true,
            data: parsedRows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get single held bill by ID
 * GET /api/pos/held-bills/:id
 */
exports.getHeldBillById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const heldBill = await db.HeldBill.findByPk(id, {
            include: [
                {
                    model: db.Customer,
                    as: 'customer',
                    attributes: ['id', 'customerName', 'customerCode', 'phone', 'email', 'discountPercentage']
                },
                {
                    model: db.User,
                    as: 'creator',
                    attributes: ['id', 'userName', 'firstName', 'lastName']
                },
                {
                    model: db.User,
                    as: 'loader',
                    attributes: ['id', 'userName', 'firstName', 'lastName']
                }
            ]
        });

        if (!heldBill) {
            return res.status(404).json({
                success: false,
                message: 'Held bill not found'
            });
        }

        // Parse items
        const billData = heldBill.toJSON();
        if (billData.items && typeof billData.items === 'string') {
            billData.items = JSON.parse(billData.items);
        }
        if (billData.returnItems && typeof billData.returnItems === 'string') {
            billData.returnItems = JSON.parse(billData.returnItems);
        }

        // Enrich items with product details
        if (billData.items && Array.isArray(billData.items)) {
            const productIds = billData.items.map(item => item.productId);
            const products = await db.Product.findAll({
                where: { id: { [Op.in]: productIds } },
                attributes: ['id', 'name', 'productCode', 'sellingPrice', 'imageUrl']
            });

            const productMap = {};
            products.forEach(p => { productMap[p.id] = p.toJSON(); });

            billData.items = billData.items.map(item => ({
                ...item,
                product: productMap[item.productId] || null
            }));
        }

        res.json({
            success: true,
            data: billData
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Load a held bill to POS (mark as loaded)
 * PUT /api/pos/held-bills/:id/load
 */
exports.loadHeldBill = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;

        const heldBill = await db.HeldBill.findByPk(id, { transaction });

        if (!heldBill) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Held bill not found'
            });
        }

        if (heldBill.status !== 'held') {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Cannot load bill with status: ${heldBill.status}`
            });
        }

        // Check if expired
        if (heldBill.expiresAt && new Date() > new Date(heldBill.expiresAt)) {
            await heldBill.update({ status: 'expired' }, { transaction });
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'This held bill has expired'
            });
        }

        // Mark as loaded
        await heldBill.update({
            status: 'loaded',
            loadedAt: new Date(),
            loadedBy: req.user.id
        }, { transaction });

        await transaction.commit();

        // Fetch with details
        const loadedBill = await db.HeldBill.findByPk(id, {
            include: [
                {
                    model: db.Customer,
                    as: 'customer',
                    attributes: ['id', 'customerName', 'customerCode', 'phone', 'email', 'discountPercentage', 'loyaltyPoints']
                }
            ]
        });

        // Parse items and enrich with product details
        const billData = loadedBill.toJSON();
        if (billData.items && typeof billData.items === 'string') {
            billData.items = JSON.parse(billData.items);
        }
        if (billData.returnItems && typeof billData.returnItems === 'string') {
            billData.returnItems = JSON.parse(billData.returnItems);
        }

        if (billData.items && Array.isArray(billData.items)) {
            const productIds = billData.items.map(item => item.productId);
            const products = await db.Product.findAll({
                where: { id: { [Op.in]: productIds } },
                include: [{
                    model: db.Inventory,
                    as: 'inventories',
                    where: { branchId: req.branchId },
                    required: false
                }]
            });

            const productMap = {};
            products.forEach(p => { productMap[p.id] = p.toJSON(); });

            billData.items = billData.items.map(item => ({
                ...item,
                product: productMap[item.productId] || null,
                currentStock: productMap[item.productId]?.inventories?.[0]?.quantity || 0
            }));
        }

        // Parse return items
        if (billData.returnItems && Array.isArray(billData.returnItems)) {
            // You might want to enrich return items with product details too, 
            // but usually they just need basic product info which should be in the saved JSON.
            // If needed valid product check, we can allow it.
        }

        res.json({
            success: true,
            message: 'Bill loaded to POS successfully',
            data: billData
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Update a held bill
 * PUT /api/pos/held-bills/:id
 */
exports.updateHeldBill = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const {
            customerId,
            holdName,
            items,
            subtotal,
            discountAmount,
            discountPercentage,
            taxRate,
            taxAmount,
            totalAmount,
            saleType,
            notes,
            returnItems
        } = req.body;

        const heldBill = await db.HeldBill.findByPk(id, { transaction });

        if (!heldBill) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Held bill not found'
            });
        }

        if (heldBill.status !== 'held' && heldBill.status !== 'loaded') {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Cannot update bill with status: ${heldBill.status}`
            });
        }

        // Update the bill
        const updateData = {};
        if (customerId !== undefined) updateData.customerId = customerId;
        if (holdName !== undefined) updateData.holdName = holdName;
        if (items !== undefined) updateData.items = JSON.stringify(items);
        if (returnItems !== undefined) updateData.returnItems = JSON.stringify(returnItems);
        if (subtotal !== undefined) updateData.subtotal = subtotal;
        if (discountAmount !== undefined) updateData.discountAmount = discountAmount;
        if (discountPercentage !== undefined) updateData.discountPercentage = discountPercentage;
        if (taxRate !== undefined) updateData.taxRate = taxRate;
        if (taxAmount !== undefined) updateData.taxAmount = taxAmount;
        if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
        if (saleType !== undefined) updateData.saleType = saleType;
        if (notes !== undefined) updateData.notes = notes;

        // Reset to held status if it was loaded
        if (heldBill.status === 'loaded') {
            updateData.status = 'held';
        }

        await heldBill.update(updateData, { transaction });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Held bill updated successfully',
            data: heldBill
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Complete a held bill (convert to sale)
 * POST /api/pos/held-bills/:id/complete
 */
exports.completeHeldBill = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { payments } = req.body;

        if (!payments || payments.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'At least one payment is required'
            });
        }

        const heldBill = await db.HeldBill.findByPk(id, { transaction });

        if (!heldBill) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Held bill not found'
            });
        }

        if (heldBill.status === 'completed') {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'This bill has already been completed'
            });
        }

        if (heldBill.status === 'cancelled') {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cannot complete a cancelled bill'
            });
        }

        let items = heldBill.items;
        if (typeof items === 'string') {
            items = JSON.parse(items);
        }
        let returnItems = heldBill.returnItems;
        if (returnItems && typeof returnItems === 'string') {
            returnItems = JSON.parse(returnItems);
        }

        // Process RETURN ITEMS separately
        // Important: Return items are NOT subject to the overall discount
        // They only have their own item-level discounts if any
        // The overall discount was already applied only to sale items in the held bill
        let returnSubtotalVal = 0;
        let returnTaxAmountVal = 0;
        let returnTotalAmountVal = 0;
        const processedReturnItems = [];

        if (returnItems && Array.isArray(returnItems)) {
            for (const returnItem of returnItems) {
                const itemQty = parseFloat(returnItem.quantity || 0);
                const itemPrice = parseFloat(returnItem.unitPrice || 0);
                const itemDiscount = parseFloat(returnItem.discount || 0);
                const itemSubtotal = itemQty * itemPrice;
                const itemNet = itemSubtotal - itemDiscount;

                // Determine Tax
                let rTaxRate = 0;
                let rTaxType = 'percentage';

                if (returnItem.taxPercentage !== undefined) {
                    rTaxRate = parseFloat(returnItem.taxPercentage);
                    rTaxType = returnItem.taxType || 'percentage';
                } else {
                    const product = await db.Product.findByPk(returnItem.productId);
                    if (product && product.isTaxable) {
                        rTaxRate = parseFloat(product.taxRate || 0);
                        rTaxType = product.taxType === 'fixed' ? 'fixed' : 'percentage';
                    }
                }

                let itemTaxAmt = 0;
                if (rTaxType === 'fixed') {
                    itemTaxAmt = rTaxRate * itemQty;
                } else {
                    itemTaxAmt = itemNet * (rTaxRate / 100);
                }

                const itemGross = itemNet + itemTaxAmt;

                returnSubtotalVal += itemNet;
                returnTaxAmountVal += itemTaxAmt;
                returnTotalAmountVal += itemGross;

                processedReturnItems.push({
                    productId: returnItem.productId,
                    productName: returnItem.productName || 'Returned Item',
                    quantity: itemQty,
                    unitPrice: itemPrice,
                    discountAmount: itemDiscount,
                    totalAmount: itemNet, // Pre-tax
                    taxPercentage: rTaxRate,
                    taxAmount: itemTaxAmt,
                    taxType: rTaxType,
                    returnReason: returnItem.returnReason,
                    condition: returnItem.condition || 'good'
                });
            }
        }

        // Calculate net payable
        // Note: heldBill.totalAmount = (sale items subtotal - overall discount + tax on sale items)
        // Return items are subtracted separately and are NOT subject to the overall discount
        // Final calculation: Net Payable = Sale Total (with discount applied) - Return Items Total
        const netPayable = parseFloat(heldBill.totalAmount) - returnTotalAmountVal;

        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const remainingAmount = netPayable - totalPaid;

        let paymentStatus = 'pending';
        if (totalPaid >= netPayable - 0.01) {
            paymentStatus = 'paid';
        } else if (totalPaid > 0) {
            paymentStatus = 'partial';
        }

        // Generate sale number
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        const lastSale = await db.Sale.findOne({
            where: {
                saleNumber: { [Op.like]: `SALE-${dateStr}-%` }
            },
            order: [['createdAt', 'DESC']],
            transaction
        });

        let sequence = 1;
        if (lastSale) {
            const lastSequence = parseInt(lastSale.saleNumber.split('-')[1] || lastSale.saleNumber.split('-')[2]);
            if (!isNaN(lastSequence)) {
                sequence = lastSequence + 1;
            }
        }
        const saleNumber = `SALE-${dateStr}-${String(sequence).padStart(5, '0')}`;

        // Get system settings for taxName
        const settings = await db.SystemSettings.findOne({ transaction });
        const taxName = settings?.taxName || 'VAT';

        // Create sale
        const sale = await db.Sale.create({
            saleNumber,
            customerId: heldBill.customerId,
            subtotal: heldBill.subtotal,
            discountAmount: heldBill.discountAmount,
            discountPercentage: heldBill.discountPercentage,
            taxAmount: heldBill.taxAmount,
            taxPercentage: heldBill.taxRate,
            taxName,
            returnTaxAmount: returnTaxAmountVal,
            returnTotalAmount: returnTotalAmountVal,
            totalAmount: heldBill.totalAmount, // Gross Sales
            paidAmount: totalPaid,
            creditAmount: Math.max(0, remainingAmount),
            paymentStatus,
            saleStatus: 'completed',
            saleType: heldBill.saleType,
            saleDate: new Date(),
            cashierId: req.user.id,
            createdBy: req.user.id,
            branchId: req.branchId,
            notes: heldBill.notes
        }, { transaction });

        // Create sale items and update inventory
        for (const item of items) {
            await db.SaleItem.create({
                saleId: sale.id,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount || 0,
                totalAmount: item.total || (item.quantity * item.unitPrice - (item.discount || 0)),
                taxPercentage: item.taxPercentage || 0,
                taxAmount: item.taxAmount || 0,
                taxType: item.taxType || 'none',
                branchId: req.branchId
            }, { transaction });

            // Update inventory
            await db.Inventory.decrement('quantity', {
                by: item.quantity,
                where: {
                    productId: item.productId,
                    branchId: req.branchId
                },
                transaction
            });
        }

        // Create Sale Return Items
        for (const returnItem of processedReturnItems) {
            await db.SaleReturnItem.create({
                saleId: sale.id,
                productId: returnItem.productId,
                productName: returnItem.productName,
                quantity: returnItem.quantity,
                unitPrice: returnItem.unitPrice,
                discountAmount: returnItem.discountAmount,
                totalAmount: returnItem.totalAmount, // Pre-tax
                taxPercentage: returnItem.taxPercentage,
                taxAmount: returnItem.taxAmount,
                taxType: returnItem.taxType,
                returnReason: returnItem.returnReason,
                condition: returnItem.condition
            }, { transaction });

            // Restore inventory
            const latestBatch = await db.Inventory.findOne({
                where: {
                    productId: returnItem.productId,
                    quantity: { [Op.gt]: 0 }
                },
                order: [['createdAt', 'DESC']],
                transaction
            });

            if (latestBatch) {
                await db.Inventory.create({
                    productId: returnItem.productId,
                    grnId: latestBatch.grnId,
                    supplierId: latestBatch.supplierId,
                    supplierName: latestBatch.supplierName,
                    supplierPhone: latestBatch.supplierPhone,
                    referenceType: 'sale_return',
                    batchNumber: latestBatch.batchNumber,
                    expiryDate: latestBatch.expiryDate,
                    locationId: latestBatch.locationId,
                    branchId: req.branchId,
                    quantity: returnItem.quantity, // Positive for stock in
                    unitCost: latestBatch.unitCost,
                    sellingPrice: latestBatch.sellingPrice,
                    mrp: latestBatch.mrp,
                    performedBy: req.user.id,
                    remarks: `Return from held bill ${heldBill.holdNumber}`
                }, { transaction });
            } else {
                await db.Inventory.create({
                    productId: returnItem.productId,
                    referenceType: 'sale_return',
                    quantity: returnItem.quantity,
                    branchId: req.branchId,
                    unitCost: 0,
                    sellingPrice: returnItem.unitPrice,
                    performedBy: req.user.id,
                    remarks: `Return from held bill ${heldBill.holdNumber} - New batch`
                }, { transaction });
            }

            // Log to product audit
            await db.ProductAuditLog.create({
                productId: returnItem.productId,
                action: 'stock_adjusted',
                changedBy: req.user.id,
                branchId: req.branchId,
                notes: `Return from held bill ${heldBill.holdNumber}`
            }, { transaction });
        }

        // Create payments
        for (const payment of payments) {
            await db.SalePayment.create({
                saleId: sale.id,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod || 'cash',
                paymentDate: new Date(),
                referenceNumber: payment.referenceNumber || null,
                cardType: payment.cardType || null,
                cardLastFour: payment.cardLastFour || null,
                bankName: payment.bankName || null,
                notes: payment.notes || null,
                processedBy: req.user.id,
                totalAmount: heldBill.totalAmount,
                paidAmount: totalPaid,
                remainingAmount: remainingAmount,
                paymentStatus: paymentStatus,
                branchId: req.branchId
            }, { transaction });
        }

        // Update customer credit if partial payment
        if (heldBill.customerId && remainingAmount > 0) {
            await db.Customer.increment('currentCredit', {
                by: remainingAmount,
                where: { id: heldBill.customerId },
                transaction
            });

            await db.CustomerCredit.create({
                customerId: heldBill.customerId,
                transactionType: 'credit_issued',
                amount: remainingAmount,
                balanceAmount: remainingAmount,
                referenceType: 'sale',
                status: 'pending',
                notes: `Credit from sale ${saleNumber}`,
                performedBy: req.user.id,
                branchId: req.branchId
            }, { transaction });
        }

        // Update held bill status
        await heldBill.update({
            status: 'completed',
            completedAt: new Date(),
            completedSaleId: sale.id
        }, { transaction });

        await transaction.commit();

        // Fetch complete sale
        const completeSale = await db.Sale.findByPk(sale.id, {
            include: [
                {
                    model: db.SaleItem,
                    as: 'items',
                    include: [{
                        model: db.Product,
                        as: 'product',
                        attributes: ['id', 'name', 'productCode']
                    }]
                },
                {
                    model: db.SalePayment,
                    as: 'payments'
                },
                {
                    model: db.Customer,
                    as: 'customer',
                    attributes: ['id', 'customerName', 'phone', 'email']
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Bill completed successfully',
            data: {
                sale: completeSale,
                heldBillId: heldBill.id
            }
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Cancel a held bill
 * PUT /api/pos/held-bills/:id/cancel
 */
exports.cancelHeldBill = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const heldBill = await db.HeldBill.findByPk(id, { transaction });

        if (!heldBill) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Held bill not found'
            });
        }

        if (heldBill.status === 'completed') {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a completed bill'
            });
        }

        await heldBill.update({
            status: 'cancelled',
            notes: heldBill.notes ? `${heldBill.notes}\n\nCANCELLED: ${reason || 'No reason provided'}` : `CANCELLED: ${reason || 'No reason provided'}`
        }, { transaction });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Held bill cancelled successfully',
            data: heldBill
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Delete a held bill (permanently)
 * DELETE /api/pos/held-bills/:id
 */
exports.deleteHeldBill = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;

        const heldBill = await db.HeldBill.findByPk(id, { transaction });

        if (!heldBill) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Held bill not found'
            });
        }

        if (heldBill.status === 'completed') {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cannot delete a completed bill'
            });
        }

        await heldBill.destroy({ transaction });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Held bill deleted successfully'
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Get held bills statistics
 * GET /api/pos/held-bills/statistics
 */
exports.getHeldBillsStatistics = async (req, res, next) => {
    try {
        const where = {};

        if (req.branchAccess && !req.branchAccess.canAccessAllBranches) {
            where.branchId = req.branchId;
        }

        const statistics = await db.HeldBill.findAll({
            where,
            attributes: [
                'status',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount']
            ],
            group: ['status'],
            raw: true
        });

        const result = {
            held: { count: 0, totalAmount: 0 },
            loaded: { count: 0, totalAmount: 0 },
            completed: { count: 0, totalAmount: 0 },
            cancelled: { count: 0, totalAmount: 0 },
            expired: { count: 0, totalAmount: 0 }
        };

        statistics.forEach(stat => {
            result[stat.status] = {
                count: parseInt(stat.count) || 0,
                totalAmount: parseFloat(stat.totalAmount) || 0
            };
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get POS transaction statistics
 * GET /api/pos/statistics
 */
exports.getPOSStatistics = async (req, res, next) => {
    try {
        const { startDate, endDate, saleType, paymentMethod, cashierId } = req.query;

        const branchId = req.branchId;
        const branchAccess = req.branchAccess;

        // Build where clause for sales
        const saleWhere = {
            saleStatus: 'completed',
            isDeleted: false
        };

        // Apply branch filter
        if (branchAccess && !branchAccess.canAccessAllBranches) {
            saleWhere.branchId = branchId;
        } else if (!branchAccess && branchId) {
            saleWhere.branchId = branchId;
        }

        if (saleType) {
            saleWhere.saleType = saleType;
        }

        if (cashierId) {
            saleWhere.createdBy = cashierId;
        }

        if (startDate || endDate) {
            saleWhere.saleDate = {};
            if (startDate) {
                saleWhere.saleDate[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                saleWhere.saleDate[Op.lte] = endDateTime;
            }
        }

        // Get sales statistics
        const salesStats = await db.Sale.findAll({
            where: saleWhere,
            attributes: [
                [db.sequelize.fn('COUNT', db.sequelize.col('Sale.id')), 'totalSales'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalRevenue'],
                [db.sequelize.fn('SUM', db.sequelize.col('discount_amount')), 'totalDiscounts'],
                [db.sequelize.fn('SUM', db.sequelize.col('tax_amount')), 'totalTax'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'netRevenue'],
                [db.sequelize.fn('AVG', db.sequelize.col('total_amount')), 'averageOrderValue']
            ],
            raw: true
        });

        // Get sales by payment status
        const salesByPaymentStatus = await db.Sale.findAll({
            where: saleWhere,
            attributes: [
                'paymentStatus',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'total']
            ],
            group: ['paymentStatus'],
            raw: true
        });

        // Get sales by type
        const salesByType = await db.Sale.findAll({
            where: saleWhere,
            attributes: [
                'saleType',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'total']
            ],
            group: ['saleType'],
            raw: true
        });

        // Build where clause for payments
        const paymentWhere = {};

        if (branchAccess && !branchAccess.canAccessAllBranches) {
            paymentWhere.branchId = branchId;
        } else if (!branchAccess && branchId) {
            paymentWhere.branchId = branchId;
        }

        if (paymentMethod) {
            paymentWhere.paymentMethod = paymentMethod;
        }

        if (startDate || endDate) {
            paymentWhere.paymentDate = {};
            if (startDate) {
                paymentWhere.paymentDate[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                paymentWhere.paymentDate[Op.lte] = endDateTime;
            }
        }

        // Get payment statistics
        const paymentsByMethod = await db.SalePayment.findAll({
            where: paymentWhere,
            attributes: [
                'paymentMethod',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
            ],
            group: ['paymentMethod'],
            raw: true
        });

        // Format response
        const statistics = {
            overview: {
                totalSales: parseInt(salesStats[0].totalSales) || 0,
                totalRevenue: parseFloat(salesStats[0].totalRevenue) || 0,
                totalDiscounts: parseFloat(salesStats[0].totalDiscounts) || 0,
                totalTax: parseFloat(salesStats[0].totalTax) || 0,
                netRevenue: parseFloat(salesStats[0].netRevenue) || 0,
                averageOrderValue: parseFloat(salesStats[0].averageOrderValue) || 0
            },
            byPaymentStatus: {},
            bySaleType: {},
            byPaymentMethod: {}
        };

        // Format payment status breakdown
        salesByPaymentStatus.forEach(item => {
            statistics.byPaymentStatus[item.paymentStatus] = {
                count: parseInt(item.count),
                total: parseFloat(item.total)
            };
        });

        // Format sale type breakdown
        salesByType.forEach(item => {
            statistics.bySaleType[item.saleType] = {
                count: parseInt(item.count),
                total: parseFloat(item.total)
            };
        });

        // Format payment method breakdown
        paymentsByMethod.forEach(item => {
            statistics.byPaymentMethod[item.paymentMethod] = {
                count: parseInt(item.count),
                total: parseFloat(item.total)
            };
        });

        res.json({
            success: true,
            data: statistics,
            filters: {
                startDate: startDate || null,
                endDate: endDate || null,
                saleType: saleType || null,
                paymentMethod: paymentMethod || null,
                cashierId: cashierId || null
            }
        });

    } catch (error) {
        next(error);
    }
};
