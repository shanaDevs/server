const db = require('../../models');
const { GRN, GRNItem, PurchaseOrder, Suppliers, Product, User, Inventory, InventoryLedger, ProductAuditLog, Payment, SupplierCredit, SupplierPayment } = db;
const { Op } = require('sequelize');

class GRNService {
    async getAllGRNs(filters, pagination, branchConfig) {
        const { search, status, supplierId, startDate, endDate } = filters;
        const { limit, offset } = pagination;
        const { branchId, branchAccess } = branchConfig;

        const where = {};

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        if (search) {
            where[Op.or] = [
                { grnNumber: { [Op.like]: `%${search}%` } }
            ];
        }

        if (status) where.status = status;
        if (supplierId) where.supplierId = supplierId;

        if (startDate || endDate) {
            where.grnDate = {};
            if (startDate) where.grnDate[Op.gte] = startDate;
            if (endDate) where.grnDate[Op.lte] = endDate;
        }

        return await GRN.findAndCountAll({
            where,
            include: [
                { model: Suppliers, as: 'supplier', attributes: ['id', 'name', 'supplierCode'] },
                { model: User, as: 'createdByUser', attributes: ['id', 'userName'] },
                { model: PurchaseOrder, as: 'purchaseOrder', attributes: ['id', 'poNumber'] }
            ],
            limit,
            offset,
            order: [['grnDate', 'DESC'], ['createdAt', 'DESC']]
        });
    }

    async getGRNById(id, branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await GRN.findOne({
            where,
            include: [
                { model: Suppliers, as: 'supplier' },
                { model: User, as: 'createdByUser', attributes: ['id', 'userName'] },
                { model: PurchaseOrder, as: 'purchaseOrder' },
                {
                    model: GRNItem,
                    as: 'items',
                    include: [
                        { model: Product, as: 'product' },
                        { model: require('../../models').Location, as: 'location', attributes: ['id', 'name', 'code'] }
                    ]
                }
            ]
        });
    }

    async generateGRNNumber(branchId) {
        const prefix = 'GRN';
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');

        // Find the last GRN number across ALL branches to ensure global uniqueness
        const lastGRN = await GRN.findOne({
            where: {
                grnNumber: { [Op.like]: `${prefix}${year}${month}%` }
            },
            order: [['grnNumber', 'DESC']]
        });

        let sequence = 1;
        if (lastGRN) {
            const lastSequence = parseInt(lastGRN.grnNumber.slice(-4));
            sequence = lastSequence + 1;
        }

        return `${prefix}${year}${month}${sequence.toString().padStart(4, '0')}`;
    }

    async createGRN(data, items, transaction) {
        // Create GRN
        const grn = await GRN.create(data, { transaction });

        // Create GRN Items
        const grnItems = items.map(item => ({
            ...item,
            grnId: grn.id,
            branchId: data.branchId
        }));

        await GRNItem.bulkCreate(grnItems, { transaction });

        return grn;
    }

    async updateGRN(id, data, items, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const grn = await GRN.findOne({ where, transaction });
        if (!grn) return null;

        if (grn.status === 'approved') {
            throw new Error('Cannot update approved GRN');
        }

        let totalQuantity = 0;
        let totalAmount = 0;

        // If items are provided, update them
        if (items && Array.isArray(items) && items.length > 0) {
            // Delete existing items
            await GRNItem.destroy({ where: { grnId: id }, transaction });

            // Generate batch numbers for new items
            const lastBatch = await GRNItem.findOne({
                where: { batchNumber: { [Op.like]: 'BCH-%' } },
                order: [['id', 'DESC']],
                transaction
            });

            let batchCounter = 1;
            if (lastBatch && lastBatch.batchNumber) {
                const lastNum = parseInt(lastBatch.batchNumber.replace('BCH-', ''), 10);
                if (!isNaN(lastNum)) {
                    batchCounter = lastNum + 1;
                }
            }

            // Prepare new items
            const newItems = items.map((item, index) => {
                const qty = Number(item.quantityReceived || item.receivedQty || 0);
                const unitCost = Number(item.unitCost || 0);

                totalQuantity += qty;
                totalAmount += qty * unitCost;

                return {
                    ...item,
                    grnId: id,
                    branchId: grn.branchId,
                    quantityReceived: qty,
                    batchNumber: `BCH-${String(batchCounter + index).padStart(4, '0')}`
                };
            });

            // Create new items
            await GRNItem.bulkCreate(newItems, { transaction });

            // Update data with new totals
            data.totalQuantity = totalQuantity;
            data.totalAmount = totalAmount;
        } else {
            // If no new items, keep existing totals provided in data or existing ones
            // Note: It's safer to recalculate if not provided but for now assuming items are always sent if update is intended
        }

        await grn.update(data, { transaction });
        return grn;
    }

    async deleteGRN(id, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const grn = await GRN.findOne({ where, transaction });
        if (!grn) return null;

        if (grn.status === 'approved') {
            throw new Error('Cannot delete approved GRN');
        }

        // Delete GRN items
        await GRNItem.destroy({ where: { grnId: id }, transaction });

        // Delete GRN
        await grn.destroy({ transaction });
        return true;
    }

    async completeGRN(id, paymentData, branchConfig, userContext, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const { paymentMethod, paymentAmount } = paymentData;

        const where = { id };

        if (branchId) {
            where.branchId = branchId;
        } else if (
            branchAccess &&
            !branchAccess.canAccessAllBranches &&
            branchAccess.branches?.length > 0
        ) {
            where.branchId = branchAccess.branches;
        }

        const grn = await GRN.findOne({
            where,
            include: [
                {
                    model: GRNItem,
                    as: 'items',
                    include: [
                        { model: Product, as: 'product' },
                        { model: require('../../models').Location, as: 'location' }
                    ]
                },
                { model: Suppliers, as: 'supplier' }
            ],
            transaction
        });

        if (!grn) return null;

        if (grn.status === 'approved') {
            throw new Error('GRN already approved');
        }

        const totalAmount = Number(grn.totalAmount);
        const paidAmount = Number(paymentAmount);

        if (paidAmount < 0) {
            throw new Error('Payment amount cannot be negative');
        }

        // 🔹 Calculate payment status and type
        let balanceAmount = 0;
        let paymentType = 'full'; // full, credit, debit
        let paymentNote = '';

        if (paidAmount > totalAmount) {
            // Overpayment - DEBIT (customer/supplier gets change back)
            balanceAmount = paidAmount - totalAmount; // Positive balance = amount to return
            paymentType = 'debit';
            paymentNote = `GRN #${grn.grnNumber} approved - Overpaid by ${balanceAmount.toFixed(2)}`;
        } else if (paidAmount < totalAmount) {
            // Underpayment - CREDIT (balance due to supplier)
            balanceAmount = totalAmount - paidAmount; // Positive balance = amount owed
            paymentType = 'credit';
            paymentNote = `GRN #${grn.grnNumber} approved - Balance due: ${balanceAmount.toFixed(2)}`;
        } else {
            // Exact payment
            balanceAmount = 0;
            paymentType = 'full';
            paymentNote = `GRN #${grn.grnNumber} approved - Paid in full`;
        }

        // 🔹 Update GRN status
        await grn.update({ status: 'approved' }, { transaction });

        // 🔹 Create payment record
        await Payment.create({
            amountPaid: paidAmount,
            balanceAmount,
            paymentMethod,
            paymentType,
            note: paymentNote,
            createdBy: userContext.userId,
            branchId: grn.branchId
        }, { transaction });

        // 🔹 Create SupplierPayment record for the initial payment
        if (paidAmount > 0) {
            await SupplierPayment.create({
                supplierId: grn.supplierId,
                grnId: grn.id,
                paymentDate: new Date(),
                amount: paidAmount,
                paymentMethod,
                referenceNumber: grn.grnNumber,
                status: 'completed',
                notes: `Initial payment for GRN ${grn.grnNumber}`,
                previousBalance: totalAmount,
                currentBalance: balanceAmount,
                createdBy: userContext.userId,
                branchId: grn.branchId
            }, { transaction });
        }

        // 🔹 Create SupplierCredit record for the GRN (credit issued to supplier)
        // Get current supplier credit balance
        const lastCreditRecord = await SupplierCredit.findOne({
            where: { supplierId: grn.supplierId },
            order: [['createdAt', 'DESC']],
            transaction
        });

        const previousCreditBalance = lastCreditRecord ? parseFloat(lastCreditRecord.balanceAmount) : 0;

        // First, record the GRN amount as credit issued (amount we owe to supplier)
        const afterGrnBalance = previousCreditBalance + totalAmount;
        await SupplierCredit.create({
            supplierId: grn.supplierId,
            transactionType: 'grn_received',
            amount: totalAmount, // Positive because we owe this to supplier
            balanceAmount: afterGrnBalance,
            referenceType: 'grn',
            referenceId: grn.id,
            referenceNumber: grn.grnNumber,
            status: paidAmount >= totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending'),
            notes: `GRN ${grn.grnNumber} received - Total amount: ${totalAmount.toFixed(2)}`,
            performedBy: userContext.userId,
            branchId: grn.branchId
        }, { transaction });

        // Then, record the payment made (if any)
        if (paidAmount > 0) {
            const afterPaymentBalance = Math.max(0, afterGrnBalance - paidAmount);
            await SupplierCredit.create({
                supplierId: grn.supplierId,
                transactionType: 'payment_made',
                amount: -paidAmount, // Negative because it reduces the amount owed
                balanceAmount: afterPaymentBalance,
                referenceType: 'payment',
                referenceId: grn.id,
                referenceNumber: grn.grnNumber,
                paymentMethod,
                paidDate: new Date(),
                status: paidAmount >= totalAmount ? 'paid' : 'partial',
                notes: `Payment for GRN ${grn.grnNumber} - Paid: ${paidAmount.toFixed(2)}`,
                performedBy: userContext.userId,
                branchId: grn.branchId
            }, { transaction });
        }

        // 🔹 Inventory update
        for (const item of grn.items) {
            await this.adjustStockHelper({
                productId: item.productId,
                quantity: item.quantityReceived,
                transactionType: 'in',
                referenceType: 'grn',
                batchNumber: item.batchNumber,
                expiryDate: item.expiryDate,
                unitCost: item.unitCost,
                sellingPrice: item.sellingPrice,
                mrp: item.mrp,
                supplierId: grn.supplierId,
                supplierName: grn.supplier?.name,
                supplierPhone: grn.supplier?.phone,
                grnId: grn.id,
                remarks: `GRN ${grn.grnNumber} received`,
                userId: userContext.userId,
                userName: userContext.userName,
                ipAddress: userContext.ipAddress,
                userAgent: userContext.userAgent,
                branchId: grn.branchId,
                locationId: item.locationId,
                transaction
            });
        }

        return grn;
    }


    async adjustStockHelper(params) {
        const {
            productId, quantity, transactionType, referenceType,
            batchNumber, expiryDate, unitCost, sellingPrice, mrp,
            supplierId, supplierName, supplierPhone, grnId,
            remarks, userId, userName, ipAddress, userAgent, branchId, locationId, transaction
        } = params;

        // Calculate current balance for this product
        const inventoryRecords = await Inventory.findAll({
            where: { productId, branchId },
            attributes: ['quantity'],
            transaction
        });

        const currentBalance = inventoryRecords.reduce((sum, record) => sum + record.quantity, 0);

        // Calculate quantity change
        let quantityChange = parseInt(quantity);
        if (transactionType === 'out') {
            quantityChange = -quantityChange;
        }

        const newBalance = currentBalance + quantityChange;

        if (newBalance < 0) {
            throw new Error(`Insufficient stock. Current: ${currentBalance}, Requested: ${Math.abs(quantityChange)}`);
        }

        // Get product details
        const product = await Product.findByPk(productId, { transaction });
        if (!product) {
            throw new Error('Product not found');
        }

        // Validate expiry date
        let validExpiryDate = null;
        if (expiryDate && expiryDate !== 'null' && expiryDate !== 'undefined') {
            const parsedDate = new Date(expiryDate);
            if (!isNaN(parsedDate.getTime())) {
                validExpiryDate = expiryDate;
            }
        }

        // Create inventory movement
        await Inventory.create({
            productId,
            grnId: grnId || null,
            supplierId: supplierId || null,
            supplierName: supplierName || null,
            supplierPhone: supplierPhone || null,
            referenceType: referenceType || 'adjustment',
            batchNumber: batchNumber || null,
            expiryDate: validExpiryDate,
            quantity: quantityChange,
            unitCost: unitCost || product.costPrice || 0,
            sellingPrice: sellingPrice || product.sellingPrice || 0,
            mrp: mrp || product.mrp || 0,
            performedBy: userName || 'System',
            remarks: remarks || `Stock ${transactionType === 'in' ? 'added' : 'removed'}`,
            remarks: remarks || `Stock ${transactionType === 'in' ? 'added' : 'removed'}`,
            branchId,
            locationId: locationId || null
        }, { transaction });

        // Create audit log
        await ProductAuditLog.create({
            productId,
            action: 'stock_adjusted',
            field: 'stock_balance',
            oldValue: currentBalance.toString(),
            newValue: newBalance.toString(),
            changedBy: userId,
            branchId,
            ipAddress,
            userAgent,
            remarks
        }, { transaction });

        return newBalance;
    }

    async getGRNByNumber(grnNumber, branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const where = { grnNumber };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await GRN.findOne({
            where,
            include: [
                { model: Suppliers, as: 'supplier' },
                { model: User, as: 'createdByUser', attributes: ['id', 'userName'] },
                { model: PurchaseOrder, as: 'purchaseOrder' },
                {
                    model: GRNItem,
                    as: 'items',
                    include: [
                        { model: Product, as: 'product' },
                        { model: require('../../models').Location, as: 'location', attributes: ['id', 'name', 'code'] }
                    ]
                }
            ]
        });
    }
}

module.exports = new GRNService();
