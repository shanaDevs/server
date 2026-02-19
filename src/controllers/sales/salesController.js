const { validationResult } = require('express-validator');
const db = require('../../models');
const { Sale, SaleItem, SalePayment, Customer, CustomerLoyalty, CustomerCredit, CustomerPurchaseHistory, Product, Inventory, InventoryLedger, User, ProductAuditLog } = db;
const saleService = require('../../services/sales/saleService');
const autoPOService = require('../../services/purchaseOrders/autoPOService');
const promotionService = require('../../services/promotion/promotionService');
const emailService = require('../../services/emails/emailService');
const { Op } = require('sequelize');
const { generateSalesReceipt } = require('../../utils/pdfGenerator');
const { requireBranchId, addBranchFilter, addBranchId, getBranchConfig } = require('../../utils/branchHelper');
const path = require('path');
const fs = require('fs').promises;

// Create new sale
exports.createSale = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const transaction = await db.sequelize.transaction();

    try {
        // Get branch ID
        let branchId;
        try {
            branchId = requireBranchId(req);
        } catch (err) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: err.message, error: 'BRANCH_REQUIRED' });
        }

        // Check for active counter session
        const activeSession = await db.CounterSession.findOne({
            where: {
                userId: req.user.id,
                branchId,
                status: 'OPEN'
            },
            transaction
        });

        if (!activeSession) {
            await transaction.rollback();
            return res.status(403).json({
                success: false,
                message: 'No active counter session found. Please open a counter before making sales.',
                error: 'SESSION_REQUIRED'
            });
        }

        const data = {
            ...req.body,
            branchId,
            counterSessionId: activeSession.id, // Link to the active session
            user: req.user,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        };

        const sale = await saleService.createSale(data, transaction);
        await transaction.commit();

        // Trigger Auto PO Check (async, don't wait for it to avoid blocking response)
        if (req.body.items && req.body.items.length > 0) {
            autoPOService.processAutoPO(req.body.items, branchId).catch(err => {
                console.error('Background Auto PO process failed:', err);
            });
        }

        // Prepare response object
        const response = {
            success: true,
            message: 'Sale created successfully',
            sale,
            paymentSummary: {
                totalAmount: parseFloat(sale.totalAmount),
                paidAmount: parseFloat(sale.paidAmount),
                remainingAmount: parseFloat(sale.creditAmount),
                changeAmount: parseFloat(sale.changeAmount),
                paymentStatus: sale.paymentStatus
            },
            emailStatus: null
        };

        // Send email notification to customer (async, but track status)
        if (sale.customerId) {
            console.log(`📧 Attempting to send receipt email for sale ${sale.saleNumber}...`);
            sendSaleReceiptEmail(sale.id)
                .then(result => {
                    if (result.success) {
                        console.log(`✅ Receipt email sent successfully to ${result.email}`);
                    } else {
                        console.warn(`⚠️ Email not sent: ${result.reason}`);
                    }
                })
                .catch(err => {
                    console.error(`❌ Failed to send sale receipt email:`, err.message);
                });
            response.emailStatus = 'sending';
        } else {
            console.log('ℹ️ No customer attached to sale - email not sent');
            response.emailStatus = 'no_customer';
        }

        res.status(201).json(response);
    } catch (error) {
        if (transaction && !transaction.finished) { await transaction.rollback(); }
        console.error('Error creating sale:', error);

        if (error.data) {
            return res.status(400).json({ success: false, message: error.message, error: 'INSUFFICIENT_STOCK', data: error.data });
        }
        if (error.message && error.message.includes('not found')) {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ message: 'Error creating sale', error: error.message });
    }
};

// Get all sales
exports.getAllSales = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);
        const { page = 1, limit = 10, ...queryFilters } = req.query;

        const pagination = {
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        };

        const result = await saleService.getAllSales(queryFilters, pagination, branchConfig);
        res.json({
            success: true,
            data: result.rows,
            totalSales: result.count,
            pagination: {
                total: result.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(result.count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ message: 'Error fetching sales', error: error.message });
    }
};

// Get sale by ID
exports.getSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await saleService.getSaleById(id);

        if (!result) {
            return res.status(404).json({ message: 'Sale not found' });
        }

        res.json(result);
    } catch (error) {
        console.error('Error fetching sale:', error);
        res.status(500).json({ message: 'Error fetching sale', error: error.message });
    }
};

// Update sale
exports.updateSale = async (req, res) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { id } = req.params;
        const { notes, customerNotes, saleDate } = req.body;

        const sale = await Sale.findByPk(id, { transaction });
        if (!sale) {
            if (transaction && !transaction.finished) { await transaction.rollback(); }
            return res.status(404).json({ message: 'Sale not found' });
        }

        if (sale.saleStatus === 'cancelled') {
            if (transaction && !transaction.finished) { await transaction.rollback(); }
            return res.status(400).json({ message: 'Cannot update a cancelled sale' });
        }

        const updateData = { notes, customerNotes };
        if (saleDate) {
            const date = new Date(saleDate);
            updateData.saleDate = date;
            updateData.createdAt = date;
            updateData.updatedAt = date;

            // Also update associated items and payments for consistency
            await SaleItem.update(
                { createdAt: date, updatedAt: date },
                { where: { saleId: id }, transaction, silent: true }
            );
            await SalePayment.update(
                { createdAt: date, updatedAt: date, paymentDate: date },
                { where: { saleId: id }, transaction, silent: true }
            );
        }

        await sale.update(updateData, {
            transaction,
            silent: !!saleDate // Use silent to prevent automatic updatedAt overwrite if saleDate is provided
        });

        await transaction.commit();
        res.json({ message: 'Sale updated successfully', sale });
    } catch (error) {
        if (transaction && !transaction.finished) { await transaction.rollback(); }
        console.error('Error updating sale:', error);
        res.status(500).json({ message: 'Error updating sale', error: error.message });
    }
};

// Cancel sale
exports.cancelSale = async (req, res) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { id } = req.params;

        const sale = await Sale.findByPk(id, {
            include: [{ model: SaleItem, as: 'items' }],
            transaction
        });

        if (!sale) {
            if (transaction && !transaction.finished) { await transaction.rollback(); }
            return res.status(404).json({ message: 'Sale not found' });
        }

        if (sale.saleStatus === 'cancelled') {
            if (transaction && !transaction.finished) { await transaction.rollback(); }
            return res.status(400).json({ message: 'Sale is already cancelled' });
        }

        // Restore inventory
        for (const item of sale.items) {
            const product = await Product.findByPk(item.productId, { transaction });

            // Calculate current balance
            const inventoryBatches = await Inventory.findAll({
                where: {
                    productId: item.productId,
                    quantity: { [Op.gt]: 0 }
                },
                transaction
            });
            const currentBalance = inventoryBatches.reduce((sum, batch) => sum + parseFloat(batch.quantity), 0);

            // Restore to latest batch or create new inventory record
            const latestBatch = await Inventory.findOne({
                where: {
                    productId: item.productId,
                    quantity: { [Op.gt]: 0 }
                },
                order: [['createdAt', 'DESC']],
                transaction
            });

            if (latestBatch) {
                // Add back to latest batch
                await latestBatch.update({
                    quantity: parseFloat(latestBatch.quantity) + item.quantity
                }, { transaction });

                // Create inventory transaction record (positive quantity for return)
                await Inventory.create({
                    productId: item.productId,
                    referenceType: 'sale',
                    batchNumber: latestBatch.batchNumber,
                    expiryDate: latestBatch.expiryDate,
                    quantity: item.quantity, // Positive for stock in
                    unitCost: latestBatch.unitCost,
                    sellingPrice: latestBatch.sellingPrice,
                    mrp: latestBatch.mrp,
                    performedBy: req.user.id,
                    remarks: `Sale cancelled - Stock restored to batch ${latestBatch.batchNumber || 'NO-BATCH'}`
                }, { transaction });
            } else {
                // Create new inventory batch if none exists
                await Inventory.create({
                    productId: item.productId,
                    referenceType: 'adjustment',
                    quantity: item.quantity,
                    unitCost: product.costPrice || 0,
                    sellingPrice: item.unitPrice,
                    performedBy: req.user.id,
                    remarks: 'Restored from cancelled sale - New batch created'
                }, { transaction });
            }

            // Log to product audit
            await ProductAuditLog.create({
                productId: item.productId,
                action: 'stock_adjusted',
                field: 'quantity',
                oldValue: currentBalance.toString(),
                newValue: (currentBalance + item.quantity).toString(),
                changedBy: req.user.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                notes: `Sale cancelled - ${item.quantity} units restored`
            }, { transaction });
        }

        // Update customer data if applicable
        if (sale.customerId) {
            const customer = await Customer.findByPk(sale.customerId, { transaction });
            if (customer) {
                await customer.update({
                    totalPurchases: parseFloat(customer.totalPurchases) - parseFloat(sale.totalAmount),
                    totalOrders: customer.totalOrders - 1,
                    loyaltyPoints: customer.loyaltyPoints - sale.loyaltyPointsEarned + sale.loyaltyPointsRedeemed,
                    currentCredit: parseFloat(customer.currentCredit) - parseFloat(sale.creditAmount)
                }, { transaction });
            }
        }

        // Update sale status
        await sale.update({
            saleStatus: 'cancelled',
            paymentStatus: 'cancelled'
        }, { transaction });

        await transaction.commit();
        res.json({ message: 'Sale cancelled successfully', sale });
    } catch (error) {
        if (transaction && !transaction.finished) { await transaction.rollback(); }
        console.error('Error cancelling sale:', error);
        res.status(500).json({ message: 'Error cancelling sale', error: error.message });
    }
};

// Return sale
exports.returnSale = async (req, res) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { id } = req.params;

        let { returnItems, returnReason, items, reason } = req.body;

        // Normalize aliases
        returnItems = returnItems || items;
        returnReason = returnReason || reason;

        // Try to parse if string
        if (typeof returnItems === 'string') {
            try {
                returnItems = JSON.parse(returnItems);
            } catch (e) {
                console.error('Failed to parse returnItems string:', e);
            }
        }

        if (!returnItems || !Array.isArray(returnItems)) {
            if (transaction && !transaction.finished) { await transaction.rollback(); }
            console.error('Invalid returnItems:', returnItems, 'Type:', typeof returnItems);
            return res.status(400).json({ message: 'Invalid return items: must be an array' });
        }

        const sale = await Sale.findByPk(id, {
            include: [{ model: SaleItem, as: 'items' }],
            transaction
        });

        if (!sale) {
            if (transaction && !transaction.finished) { await transaction.rollback(); }
            return res.status(404).json({ message: 'Sale not found' });
        }

        // Process returns
        for (const returnItem of returnItems) {
            if (!returnItem || !returnItem.saleItemId || !returnItem.quantity || returnItem.quantity <= 0) {
                if (transaction && !transaction.finished) { await transaction.rollback(); }
                return res.status(400).json({ message: 'Invalid return item data: saleItemId and positive quantity required' });
            }

            const saleItem = sale.items.find(i => i.id === returnItem.saleItemId);
            if (!saleItem) {
                if (transaction && !transaction.finished) { await transaction.rollback(); }
                return res.status(404).json({ message: `Sale item ${returnItem.saleItemId} not found` });
            }

            // Restore inventory
            const product = await Product.findByPk(saleItem.productId, { transaction });

            // Calculate current balance
            const inventoryBatches = await Inventory.findAll({
                where: {
                    productId: saleItem.productId,
                    quantity: { [Op.gt]: 0 }
                },
                transaction
            });
            const currentBalance = inventoryBatches.reduce((sum, batch) => sum + parseFloat(batch.quantity), 0);

            // Restore to latest batch or create new inventory record
            const latestBatch = await Inventory.findOne({
                where: {
                    productId: saleItem.productId,
                    quantity: { [Op.gt]: 0 }
                },
                order: [['createdAt', 'DESC']],
                transaction
            });

            if (latestBatch) {
                // ⚠️ DO NOT UPDATE the batch - inventory is a ledger (immutable)
                // Create a new positive entry to restore the stock

                await Inventory.create({
                    productId: saleItem.productId,
                    grnId: latestBatch.grnId, // Copy GRN reference if available
                    supplierId: latestBatch.supplierId,
                    supplierName: latestBatch.supplierName,
                    supplierPhone: latestBatch.supplierPhone,
                    referenceType: 'return',
                    batchNumber: latestBatch.batchNumber,
                    expiryDate: latestBatch.expiryDate,
                    locationId: latestBatch.locationId,
                    branchId: sale.branchId,
                    quantity: returnItem.quantity, // Positive for stock in
                    unitCost: latestBatch.unitCost,
                    sellingPrice: latestBatch.sellingPrice,
                    mrp: latestBatch.mrp,
                    performedBy: req.user.id,
                    remarks: `Return from sale ${sale.saleNumber} - Restored to batch ${latestBatch.batchNumber || 'NO-BATCH'}`
                }, { transaction });
            } else {
                // Create new inventory batch if none exists
                await Inventory.create({
                    productId: saleItem.productId,
                    referenceType: 'return',
                    quantity: returnItem.quantity,
                    branchId: sale.branchId,
                    unitCost: product.costPrice || 0,
                    sellingPrice: saleItem.unitPrice,
                    performedBy: req.user.id,
                    remarks: `Return from sale ${sale.saleNumber} - New batch created`
                }, { transaction });
            }

            // Log to product audit
            await ProductAuditLog.create({
                productId: saleItem.productId,
                action: 'stock_adjusted',
                field: 'quantity',
                oldValue: currentBalance.toString(),
                newValue: (currentBalance + returnItem.quantity).toString(),
                changedBy: req.user.id,
                branchId: sale.branchId,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                notes: `Return - ${returnItem.quantity} units returned from sale ${sale.saleNumber}`
            }, { transaction });

            // Update sale item
            await saleItem.update({
                returnedQuantity: (saleItem.returnedQuantity || 0) + returnItem.quantity
            }, { transaction });
        }

        // Update sale status if fully returned
        const allItemsReturned = sale.items.every(item =>
            (item.returnedQuantity || 0) === item.quantity
        );

        if (allItemsReturned) {
            await sale.update({
                saleStatus: 'returned',
                paymentStatus: 'refunded'
            }, { transaction });
        }

        await transaction.commit();
        res.json({ message: 'Return processed successfully', sale });
    } catch (error) {
        if (transaction && !transaction.finished) { await transaction.rollback(); }
        console.error('Error processing return:', error);
        res.status(500).json({ message: 'Error processing return', error: error.message });
    }
};

// Add payment
exports.addPayment = async (req, res) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { id } = req.params;
        const { paymentMethod, amount, referenceNumber, cardType, cardLastFour, bankName, notes } = req.body;

        // Support searching by invoice number (saleNumber) or ID
        const whereClause = /^\d+$/.test(id) ? { id: parseInt(id) } : { saleNumber: id };
        const sale = await Sale.findOne({ where: whereClause, transaction });

        if (!sale) {
            if (transaction && !transaction.finished) { await transaction.rollback(); }
            return res.status(404).json({ success: false, message: 'Sale not found', searchTerm: id });
        }

        // Check if sale is already fully paid
        if (sale.paymentStatus === 'paid') {
            if (transaction && !transaction.finished) { await transaction.rollback(); }
            return res.status(400).json({
                success: false,
                message: 'Sale is already fully paid',
                invoiceNumber: sale.saleNumber,
                paymentStatus: 'paid'
            });
        }

        // Validate payment amount
        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount === 0) {
            if (transaction && !transaction.finished) { await transaction.rollback(); }
            return res.status(400).json({ success: false, message: 'Invalid payment amount' });
        }

        // Use netPayable if available (it handles returns), otherwise totalAmount
        // netPayable should be equal to totalAmount if no returns, but let's be safe
        const effectiveTotal = (sale.netPayable !== null && sale.netPayable !== undefined && parseFloat(sale.netPayable) !== 0)
            ? parseFloat(sale.netPayable)
            : parseFloat(sale.totalAmount);

        // Calculate new payment totals first
        const newPaidAmount = parseFloat(sale.paidAmount) + paymentAmount;
        const newCreditAmount = Math.max(0, effectiveTotal - newPaidAmount);
        const newChangeAmount = Math.max(0, newPaidAmount - effectiveTotal);

        let paymentStatus = 'partial';
        if (newPaidAmount >= effectiveTotal) {
            paymentStatus = 'paid';
        }

        // Check for active counter session to link the payment
        const activeSession = await db.CounterSession.findOne({
            where: {
                userId: req.user.id,
                branchId: sale.branchId,
                status: 'OPEN'
            },
            transaction
        });

        // Create payment with full tracking info
        await SalePayment.create({
            saleId: sale.id,
            paymentMethod,
            amount: paymentAmount,
            referenceNumber,
            cardType,
            cardLastFour,
            bankName,
            notes,
            processedBy: req.user.id,
            branchId: sale.branchId,
            counterSessionId: activeSession ? activeSession.id : null,
            // Track payment state at time of payment
            totalAmount: effectiveTotal,
            paidAmount: newPaidAmount,
            remainingAmount: newCreditAmount,
            paymentStatus: paymentStatus
        }, { transaction });

        await sale.update({
            paidAmount: newPaidAmount,
            creditAmount: newCreditAmount,
            changeAmount: newChangeAmount,
            paymentStatus
        }, { transaction });

        // Update customer credit if applicable
        if (sale.customerId) {
            const customer = await Customer.findByPk(sale.customerId, { transaction });
            if (customer) {
                const previousCredit = parseFloat(customer.currentCredit) || 0;
                const newCurrentCredit = Math.max(0, previousCredit - paymentAmount);

                // Update customer's current credit balance
                await customer.update({
                    currentCredit: newCurrentCredit
                }, { transaction });

                // Create a CustomerCredit transaction record
                await CustomerCredit.create({
                    customerId: sale.customerId,
                    transactionType: 'payment_received',
                    amount: -paymentAmount, // Negative because it reduces credit
                    balanceAmount: newCurrentCredit,
                    referenceType: 'payment',
                    paymentMethod: paymentMethod,
                    paidDate: new Date(),
                    status: paymentStatus === 'paid' ? 'paid' : 'partial',
                    notes: `Payment for invoice ${sale.saleNumber}. ${notes || ''}`.trim(),
                    performedBy: req.user.id,
                    branchId: sale.branchId,
                    counterSessionId: activeSession ? activeSession.id : null
                }, { transaction });
            }
        }

        await transaction.commit();

        // Reload the sale with payments to get accurate data
        const updatedSale = await Sale.findByPk(sale.id, {
            include: [
                { model: SalePayment, as: 'payments' },
                { model: Customer, as: 'customer' }
            ]
        });

        res.json({
            success: true,
            message: paymentStatus === 'paid' ? 'Payment completed - Sale fully paid' : 'Partial payment added successfully',
            sale: updatedSale,
            paymentSummary: {
                invoiceNumber: sale.saleNumber,
                totalAmount: parseFloat(sale.totalAmount),
                paidAmount: newPaidAmount,
                remainingAmount: newCreditAmount,
                changeAmount: newChangeAmount,
                paymentStatus: paymentStatus,
                action: paymentStatus === 'paid' ? 'paid' : 'partial',
                isFullyPaid: paymentStatus === 'paid',
                paymentCount: updatedSale.payments.length
            }
        });
    } catch (error) {
        if (transaction && !transaction.finished) { await transaction.rollback(); }
        console.error('Error adding payment:', error);
        res.status(500).json({ success: false, message: 'Error adding payment', error: error.message });
    }
};

// Get sale payments by ID or Invoice Number
exports.getSalePayments = async (req, res) => {
    try {
        const { id } = req.params;
        const { search } = req.query;

        let sale;

        // If search query is provided, search by invoice number
        if (search) {
            sale = await Sale.findOne({
                where: {
                    [Op.or]: [
                        { saleNumber: { [Op.like]: `%${search}%` } },
                        { id: /^\d+$/.test(search) ? parseInt(search) : null }
                    ].filter(Boolean)
                },
                include: [
                    {
                        model: SalePayment,
                        as: 'payments',
                        include: [{
                            model: User,
                            as: 'processor',
                            attributes: ['id', 'userName', 'phone']
                        }],
                        order: [['paymentDate', 'DESC']]
                    },
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'customerCode', 'customerName', 'email', 'phone']
                    }
                ]
            });
        } else {
            // Search by ID from route params
            const whereClause = /^\d+$/.test(id) ? { id: parseInt(id) } : { saleNumber: id };

            sale = await Sale.findOne({
                where: whereClause,
                include: [
                    {
                        model: SalePayment,
                        as: 'payments',
                        include: [{
                            model: User,
                            as: 'processor',
                            attributes: ['id', 'userName', 'phone']
                        }]
                    },
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'customerCode', 'customerName', 'email', 'phone']
                    }
                ],
                order: [[{ model: SalePayment, as: 'payments' }, 'paymentDate', 'DESC']]
            });
        }

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found',
                searchTerm: search || id
            });
        }

        // Calculate payment summary
        const totalAmount = parseFloat(sale.totalAmount);
        const paidAmount = parseFloat(sale.paidAmount);
        const remainingAmount = parseFloat(sale.creditAmount);
        const paymentStatus = sale.paymentStatus;

        // Determine action status
        let action;
        if (paymentStatus === 'paid') {
            action = 'paid';
        } else if (paymentStatus === 'partial') {
            action = 'partial';
        } else if (paymentStatus === 'pending') {
            action = 'pending';
        } else {
            action = paymentStatus;
        }

        res.json({
            success: true,
            sale: {
                id: sale.id,
                invoiceNumber: sale.saleNumber,
                saleDate: sale.saleDate,
                saleStatus: sale.saleStatus,
                paymentStatus: sale.paymentStatus,
                customer: sale.customer
            },
            payments: sale.payments.map(payment => ({
                id: payment.id,
                paymentDate: payment.paymentDate,
                paymentMethod: payment.paymentMethod,
                amount: parseFloat(payment.amount),
                referenceNumber: payment.referenceNumber,
                cardType: payment.cardType,
                cardLastFour: payment.cardLastFour,
                bankName: payment.bankName,
                notes: payment.notes,
                processedBy: payment.processor
            })),
            paymentSummary: {
                invoiceNumber: sale.saleNumber,
                totalAmount,
                paidAmount,
                remainingAmount,
                changeAmount: parseFloat(sale.changeAmount),
                paymentStatus,
                action,
                isFullyPaid: paymentStatus === 'paid',
                paymentCount: sale.payments.length,
                percentagePaid: totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0
            }
        });
    } catch (error) {
        console.error('Error fetching sale payments:', error);
        res.status(500).json({ success: false, message: 'Error fetching sale payments', error: error.message });
    }
};

// Search sale payments by invoice number
exports.searchSalePayments = async (req, res) => {
    try {
        const { invoiceNumber, search } = req.query;
        const searchTerm = invoiceNumber || search;

        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                message: 'Invoice number or search term is required'
            });
        }

        // Find sale by invoice number (partial match supported)
        const sale = await Sale.findOne({
            where: {
                [Op.or]: [
                    { saleNumber: { [Op.like]: `%${searchTerm}%` } },
                    ...((/^\d+$/.test(searchTerm)) ? [{ id: parseInt(searchTerm) }] : [])
                ]
            },
            include: [
                {
                    model: SalePayment,
                    as: 'payments',
                    include: [{
                        model: User,
                        as: 'processor',
                        attributes: ['id', 'userName', 'phone']
                    }]
                },
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'customerCode', 'customerName', 'email', 'phone']
                }
            ],
            order: [[{ model: SalePayment, as: 'payments' }, 'paymentDate', 'DESC']]
        });

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found',
                searchTerm
            });
        }

        // Calculate payment summary
        const totalAmount = parseFloat(sale.totalAmount);
        const paidAmount = parseFloat(sale.paidAmount);
        const remainingAmount = parseFloat(sale.creditAmount);
        const paymentStatus = sale.paymentStatus;

        // Determine action status
        let action;
        if (paymentStatus === 'paid') {
            action = 'paid';
        } else if (paymentStatus === 'partial') {
            action = 'partial';
        } else {
            action = 'pending';
        }

        res.json({
            success: true,
            sale: {
                id: sale.id,
                invoiceNumber: sale.saleNumber,
                saleDate: sale.saleDate,
                saleStatus: sale.saleStatus,
                paymentStatus: sale.paymentStatus,
                customer: sale.customer
            },
            payments: sale.payments.map(payment => ({
                id: payment.id,
                paymentDate: payment.paymentDate,
                paymentMethod: payment.paymentMethod,
                amount: parseFloat(payment.amount),
                referenceNumber: payment.referenceNumber,
                cardType: payment.cardType,
                cardLastFour: payment.cardLastFour,
                bankName: payment.bankName,
                notes: payment.notes,
                processedBy: payment.processor
            })),
            paymentSummary: {
                invoiceNumber: sale.saleNumber,
                totalAmount,
                paidAmount,
                remainingAmount,
                changeAmount: parseFloat(sale.changeAmount),
                paymentStatus,
                action,
                isFullyPaid: paymentStatus === 'paid',
                paymentCount: sale.payments.length,
                percentagePaid: totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0
            }
        });
    } catch (error) {
        console.error('Error searching sale payments:', error);
        res.status(500).json({ success: false, message: 'Error searching sale payments', error: error.message });
    }
};

// Get daily sales report
exports.getDailySalesReport = async (req, res) => {
    try {
        const { date = new Date().toISOString().split('T')[0] } = req.query;

        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const sales = await Sale.findAll({
            where: {
                saleDate: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [
                { model: SaleItem, as: 'items' },
                { model: SalePayment, as: 'payments' }
            ]
        });

        const report = {
            date,
            totalSales: sales.length,
            totalRevenue: sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0),
            totalPaid: sales.reduce((sum, s) => sum + parseFloat(s.paidAmount), 0),
            totalCredit: sales.reduce((sum, s) => sum + parseFloat(s.creditAmount), 0),
            totalDiscount: sales.reduce((sum, s) => sum + parseFloat(s.discountAmount), 0),
            totalTax: sales.reduce((sum, s) => sum + parseFloat(s.taxAmount) - parseFloat(s.returnTaxAmount || 0), 0),
            paymentMethods: {},
            saleTypes: {},
            topProducts: []
        };

        // Aggregate payment methods
        sales.forEach(sale => {
            sale.payments.forEach(payment => {
                if (!report.paymentMethods[payment.paymentMethod]) {
                    report.paymentMethods[payment.paymentMethod] = 0;
                }
                report.paymentMethods[payment.paymentMethod] += parseFloat(payment.amount);
            });
        });

        // Aggregate sale types
        sales.forEach(sale => {
            if (!report.saleTypes[sale.saleType]) {
                report.saleTypes[sale.saleType] = 0;
            }
            report.saleTypes[sale.saleType]++;
        });

        res.json({ report });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ message: 'Error generating report', error: error.message });
    }
};

// Delete sale
exports.deleteSale = async (req, res) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { id } = req.params;

        const sale = await Sale.findByPk(id, {
            include: [
                { model: SaleItem, as: 'items' },
                { model: SalePayment, as: 'payments' }
            ],
            transaction
        });

        if (!sale) {
            if (transaction && !transaction.finished) { await transaction.rollback(); }
            return res.status(404).json({ message: 'Sale not found' });
        }

        // Delete related records
        await SaleItem.destroy({ where: { saleId: sale.id }, transaction });
        await SalePayment.destroy({ where: { saleId: sale.id }, transaction });
        await sale.destroy({ transaction });

        await transaction.commit();
        res.json({ message: 'Sale deleted successfully' });
    } catch (error) {
        if (transaction && !transaction.finished) { await transaction.rollback(); }
        console.error('Error deleting sale:', error);
        res.status(500).json({ message: 'Error deleting sale', error: error.message });
    }
};

// Generate Sales Receipt PDF
exports.generateSaleReceiptPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const { paperSize = 'A4' } = req.query; // A4, A5, or THERMAL_80MM

        const sale = await Sale.findByPk(id, {
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['customerName', 'phone', 'address']
                },
                {
                    model: SaleItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['name', 'productCode']
                        }
                    ]
                },
                {
                    model: SalePayment,
                    as: 'payments',
                    attributes: ['paymentMethod', 'amount']
                },
                {
                    model: db.SaleReturnItem,
                    as: 'returnItems',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['name', 'productCode']
                        }
                    ]
                }
            ]
        });

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }


        // Calculate return metrics for the PDF
        let returnSubtotal = 0;
        let returnDiscountAmount = 0;
        let returnTotalAmount = 0;

        if (sale.returnItems && sale.returnItems.length > 0) {
            sale.returnItems.forEach(item => {
                const qty = parseFloat(item.quantity || 0);
                const price = parseFloat(item.unitPrice || 0);
                const discount = parseFloat(item.discountAmount || 0);
                const sub = qty * price;
                const total = sub - discount;

                returnSubtotal += sub;
                returnDiscountAmount += discount;
                returnTotalAmount += total;
            });
        }

        // Attach calculated values to sale object for the PDF generator
        // Use dataValues if it's a Sequelize model instance, otherwise attach directly
        const saleData = sale.toJSON ? sale.toJSON() : sale;

        saleData.returnSubtotal = returnSubtotal;
        saleData.returnDiscountAmount = returnDiscountAmount;
        saleData.returnTotalAmount = returnTotalAmount;

        // Calculate Net Payable
        // Total Amount (Sale) - Total Return Value
        saleData.netPayable = parseFloat(sale.totalAmount) - returnTotalAmount;

        const pdfBuffer = await generateSalesReceipt(saleData, paperSize);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${sale.saleNumber}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating sale receipt:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating sale receipt',
            error: error.message
        });
    }
};

// Validate Promotion
exports.validatePromotion = async (req, res) => {
    try {
        const { promoCode, items, customerId, currentSubtotal } = req.body;

        if (!promoCode) {
            return res.status(400).json({ success: false, message: 'Promo code is required' });
        }

        // 1. Handle Multiple Codes (Comma Separated)
        const codes = promoCode.split(',').map(c => c.trim()).filter(c => c);

        // 2. Prepare items once
        const mappedItems = (items || []).map(item => ({
            ...item,
            price: item.unitPrice || item.price || 0,
            productId: item.productId,
            productCode: item.productCode || (item.product ? item.product.productCode : null)
        }));

        // 3. Initial Bill Calculation
        let originalBillTotal = 0;
        if (typeof currentSubtotal !== 'undefined') {
            originalBillTotal = parseFloat(currentSubtotal);
        } else if (mappedItems.length > 0) {
            originalBillTotal = mappedItems.reduce((sum, item) => sum + (parseFloat(item.price) * parseFloat(item.quantity)), 0);
        }

        let runningTotal = originalBillTotal;
        let totalDiscount = 0;
        const validPromotions = [];
        const errors = [];

        // 4. Iterate and Apply
        for (const code of codes) {
            const validationResult = await promotionService.validateCouponCode(code, customerId);

            if (!validationResult.valid) {
                // If single code was passed and failed, we treat as error. 
                // If multiple, we might log it but continue? The user request implies they expect it to work.
                // We will collect errors.
                errors.push(validationResult.message);
                continue;
            }

            const promo = validationResult.promotion;

            // Avoid duplicates in same call
            if (validPromotions.find(p => p.id === promo.id)) continue;

            // Apply to current running total
            const appResult = await promotionService.applyPromotion(promo.id, mappedItems, runningTotal, customerId, null);

            let thisDiscount = appResult.discount;
            if (thisDiscount > runningTotal) thisDiscount = runningTotal; // Cap

            if (thisDiscount > 0 || (appResult.freeItems && appResult.freeItems.length > 0)) {
                totalDiscount += thisDiscount;
                runningTotal -= thisDiscount;
                validPromotions.push({
                    id: promo.id,
                    title: promo.title,
                    code: promo.couponCode || promo.promoCode,
                    type: promo.promotionType,
                    discount: thisDiscount,
                    freeItems: appResult.freeItems || [] // Include free items!
                });
            }
        }

        if (validPromotions.length === 0) {
            return res.status(400).json({
                success: false,
                message: errors.length > 0 ? errors.join(', ') : 'Invalid promotion code(s)'
            });
        }

        // 5. Construct Response
        // We return a "Combined" view for single-promo consumers, and a detailed list for multi-promo consumers
        res.json({
            success: true,
            message: `Applied ${validPromotions.length} promotion(s)`,
            data: {
                // Detailed breakdown
                promotions: validPromotions,
                // Aggregate for legacy/simple frontend support
                promotion: {
                    id: validPromotions[0].id, // Use first ID or a dummy? First is safer so ID lookup doesn't fail
                    ids: validPromotions.map(p => p.id), // New field for backend
                    title: validPromotions.length > 1 ? 'Multiple Promotions' : validPromotions[0].title,
                    code: validPromotions.map(p => p.code).join(','),
                    discountValue: totalDiscount
                },
                application: {
                    discount: totalDiscount,
                    message: validPromotions.map(p => `${p.code}: -${p.discount.toFixed(2)}`).join(', '),
                    freeItems: validPromotions.flatMap(p => p.freeItems || []) // Flatten all free items
                }
            }
        });

    } catch (error) {
        console.error('Error validating promotion:', error);
        res.status(500).json({ success: false, message: 'Error validating promotion', error: error.message });
    }
};

/**
 * Helper function to send sale receipt email to customer
 * @param {number} saleId - The ID of the sale
 * @returns {Promise<{success: boolean, reason?: string, email?: string}>}
 */
async function sendSaleReceiptEmail(saleId) {
    try {
        // Check email configuration first
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('⚠️ Email not configured - EMAIL_USER or EMAIL_PASS missing in .env file');
            return { success: false, reason: 'email_not_configured' };
        }

        // Fetch sale with customer details
        const sale = await Sale.findByPk(saleId, {
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'customerName', 'email', 'phone']
                },
                {
                    model: SaleItem,
                    as: 'items',
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'productCode', 'images']
                    }]
                }
            ]
        });

        if (!sale) {
            console.error(`❌ Sale ${saleId} not found for email notification`);
            return { success: false, reason: 'sale_not_found' };
        }

        if (!sale.customer) {
            console.log(`ℹ️ Sale ${sale.saleNumber} has no customer - skipping email`);
            return { success: false, reason: 'no_customer' };
        }

        const customerEmail = sale.customer.email;
        if (!customerEmail || !customerEmail.includes('@')) {
            console.log(`⚠️ Customer ${sale.customer.customerName} has no valid email - skipping email`);
            return { success: false, reason: 'invalid_email', customerName: sale.customer.customerName };
        }

        // Generate PDF receipt
        console.log(`📄 Generating PDF receipt for sale ${sale.saleNumber}...`);
        const pdfBuffer = await generateSalesReceipt(sale, 'a4');

        // Save PDF to public/pdfs directory
        const publicDir = path.join(__dirname, '../../../public/pdfs');
        await fs.mkdir(publicDir, { recursive: true });

        const pdfFilename = `RECEIPT-${sale.saleNumber}.pdf`;
        const pdfPath = path.join(publicDir, pdfFilename);

        await fs.writeFile(pdfPath, pdfBuffer);
        console.log(`✅ PDF saved to ${pdfPath}`);

        // Generate PDF URL
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const pdfLink = `${baseUrl}/pdfs/${pdfFilename}`;

        // Prepare email content
        const customerName = sale.customer.customerName || 'Valued Customer';
        const totalAmount = parseFloat(sale.totalAmount).toFixed(2);
        const paidAmount = parseFloat(sale.paidAmount || 0).toFixed(2);
        const creditAmount = parseFloat(sale.creditAmount || 0).toFixed(2);
        const discountAmount = parseFloat(sale.discountAmount || 0).toFixed(2);
        const taxAmount = parseFloat(sale.taxAmount || 0).toFixed(2);
        const companyName = process.env.COMPANY_NAME || 'POS System';
        const companyEmail = process.env.COMPANY_EMAIL || 'support@possystem.com';
        const logoUrl = process.env.COMPANY_LOGO_URL || `${baseUrl}/images/logo.png`;

        // Build items HTML
        let itemsHtml = '';
        if (sale.items && sale.items.length > 0) {
            sale.items.forEach((item, index) => {
                const itemTotal = (parseFloat(item.quantity) * parseFloat(item.unitPrice)).toFixed(2);
                const productName = item.product?.name || item.productName || 'Product';
                const productCode = item.product?.productCode || '';

                // Get first image from images array (images is a JSON array in the database)
                const productImages = item.product?.images;
                const productImage = (productImages && Array.isArray(productImages) && productImages.length > 0)
                    ? productImages[0]
                    : null;

                // Generate image HTML - use actual image if available, otherwise fallback to emoji
                const imageHtml = productImage
                    ? `<img src="${productImage}" alt="${productName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div style="display: none; width: 60px; height: 60px; background: #f5f5f5; border-radius: 8px; align-items: center; justify-content: center; font-size: 24px;">📦</div>`
                    : `<div style="width: 60px; height: 60px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px;">📦</div>`;

                itemsHtml += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 15px 10px; vertical-align: top;">
                            <div style="display: flex; align-items: center;">
                                <div style="margin-right: 15px;">
                                    ${imageHtml}
                                </div>
                                <div>
                                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${productName}</div>
                                    ${productCode ? `<div style="font-size: 12px; color: #999;">SKU: ${productCode}</div>` : ''}
                                    <div style="font-size: 13px; color: #666; margin-top: 4px;">Qty: ${item.quantity}</div>
                                </div>
                            </div>
                        </td>
                        <td style="padding: 15px 10px; text-align: right; vertical-align: top; white-space: nowrap;">
                            <div style="font-weight: 600; color: #333;">LKR ${itemTotal}</div>
                            <div style="font-size: 12px; color: #999; margin-top: 4px;">@ Rs. ${parseFloat(item.unitPrice).toFixed(2)}</div>
                        </td>
                    </tr>
                `;
            });
        }

        const subtotal = (parseFloat(totalAmount) - parseFloat(taxAmount)).toFixed(2);

        const subject = `Thank you for your Purchase! We've Received your order`;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f2f2f2; font-family: Arial, Helvetica, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f2; padding:20px;">
    <tr>
        <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:6px; overflow:hidden;">

                <!-- HEADER -->
                <tr>
                    <td style="padding:20px; background:#000; color:#fff; text-align:center;">
                        <h1 style="margin:0; font-size:22px;">${companyName}</h1>
                        <p style="margin:5px 0 0 0; font-size:12px; opacity:0.8;">
                            Sale Receipt / Invoice
                        </p>
                    </td>
                </tr>

                <!-- CUSTOMER MESSAGE -->
<tr>
    <td style="padding:20px;">
        <p style="margin:0 0 8px 0; font-size:14px; color:#333;">
            Hello <b>${customerName}</b>,
        </p>

        <!-- Thank You Heading -->
        <h2 style="margin:0 0 10px 0; font-size:18px; font-weight:700; color:#333; text-align:center;">
    Thank you for your purchase!
</h2>

        <!-- Short POS-friendly lines -->
        <p style="margin:0 0 6px 0; font-size:13px; color:#555; line-height:1.6;">
            Your transaction has been successfully completed and recorded in our Suppliment Wearhouse system.
        </p>
        <p style="margin:0 0 6px 0; font-size:13px; color:#555; line-height:1.6;">
            This email serves as your official purchase confirmation.
        </p>
        <p style="margin:0 0 14px 0; font-size:13px; color:#555; line-height:1.6;">
            Please review the details of your order below for your reference.
        </p>

        <!-- Order Summary mini heading -->
        <h3 style="margin:10px 0 0 0; font-size:15px; font-weight:600; color:#333;">
            Order Summary
        </h3>
    </td>
</tr>


                <!-- SALE INFO -->
                <tr>
                    <td style="padding:0 20px 20px 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                            <tr>
                                <td><b>Invoice No:</b></td>
                                <td align="right">${sale.saleNumber}</td>
                            </tr>
                            <tr>
                                <td><b>Sale Date:</b></td>
                                <td align="right">
                                    ${new Date(sale.saleDate).toLocaleDateString('en-GB')}
                                </td>
                            </tr>
                            <tr>
                                <td><b>Payment Status:</b></td>
                                <td align="right">
                                    ${sale.paymentStatus.toUpperCase()}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- ITEMS -->
                <tr>
                    <td style="padding:0 20px;">
                        <h3 style="margin:0 0 10px 0; font-size:16px;">Items</h3>
                        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-size:13px;">
                            ${itemsHtml}
                        </table>
                    </td>
                </tr>

                <!-- TOTALS -->
                <tr>
                    <td style="padding:20px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                            <tr>
                                <td>Subtotal</td>
                                <td align="right">LKR ${subtotal}</td>
                            </tr>

                            ${parseFloat(discountAmount) > 0 ? `
                            <tr>
                                <td style="color:#28a745;">Discount</td>
                                <td align="right" style="color:#28a745;">- LKR ${discountAmount}</td>
                            </tr>` : ''}

                            ${parseFloat(taxAmount) > 0 ? `
                            <tr>
                                <td>Tax</td>
                                <td align="right">LKR ${taxAmount}</td>
                            </tr>` : ''}

                            <tr>
                                <td colspan="2"><hr style="border:none; border-top:1px dashed #ccc;"></td>
                            </tr>
                            <tr>
                                <td style="font-size:15px; font-weight:bold;">TOTAL</td>
                                <td align="right" style="font-size:16px; font-weight:bold;">
                                    LKR ${totalAmount}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- CUSTOMER INFO -->
                <tr>
                    <td style="padding:0 20px 20px 20px;">
                        <h3 style="margin:0 0 10px 0; font-size:16px;">Customer Details</h3>
                        <p style="margin:0; font-size:13px; color:#555; line-height:1.6;">
                            ${sale.customer.customerName}<br>
                            ${sale.customer.phone || 'N/A'}<br>
                            ${sale.customer.address || 'N/A'}<br>
                            ${sale.customer.email}
                        </p>
                    </td>
                </tr>

                <!-- BUTTON -->
                <tr>
                    <td style="padding:0 20px 20px 20px;">
                        <a href="${pdfLink}"
                           style="display:block; text-align:center; background:#000; color:#fff; padding:12px; border-radius:4px; text-decoration:none; font-size:14px;">
                            Download Invoice (PDF)
                        </a>
                    </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                    <td style="padding:15px; background:#f7f7f7; text-align:center; font-size:11px; color:#777;">
                        <p style="margin:0;">
                            If you have any questions, contact us at
                            <a href="mailto:${companyEmail}" style="color:#555;">${companyEmail}</a>
                        </p>
                        <p style="margin:5px 0 0 0;">
                            This is an automated POS system email.
                        </p>
                    </td>
                </tr>

            </table>
        </td>
    </tr>
</table>
</body>
</html>
`;


        // Send email
        console.log(`📧 Sending sale receipt email to ${customerEmail}...`);
        const emailResult = await emailService.sendEmail({
            to: customerEmail,
            subject: subject,
            html: htmlContent
        });

        console.log(`✅ Sale receipt email sent successfully to ${customerEmail} for sale ${sale.saleNumber}`);
        return {
            success: true,
            email: customerEmail,
            saleNumber: sale.saleNumber,
            messageId: emailResult.messageId
        };
    } catch (error) {
        console.error(`❌ Error sending sale receipt email for sale ${saleId}:`, error.message);
        console.error(`Error details:`, error);
        return {
            success: false,
            reason: 'send_failed',
            error: error.message
        };
    }
}
