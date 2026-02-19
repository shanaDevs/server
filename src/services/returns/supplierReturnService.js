const db = require('../../models');
const { SupplierReturn, SupplierReturnPayment, Suppliers, Product, Inventory, User, SupplierCredit, GRN } = db;
const { Op } = require('sequelize');

class SupplierReturnService {

    /**
     * Generate return number
     */
    async generateReturnNumber(branchId) {
        const prefix = 'SRET';
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');

        const lastReturn = await SupplierReturn.findOne({
            where: {
                returnNumber: { [Op.like]: `${prefix}-${year}${month}-%` },
                branchId
            },
            order: [['returnNumber', 'DESC']]
        });

        let sequence = 1;
        if (lastReturn && lastReturn.returnNumber) {
            const parts = lastReturn.returnNumber.split('-');
            if (parts.length >= 3) {
                sequence = parseInt(parts[2]) + 1;
            }
        }

        return `${prefix}-${year}${month}-${sequence.toString().padStart(5, '0')}`;
    }

    /**
     * Get all supplier returns
     */
    async getAllReturns(filters, pagination, branchConfig) {
        const { search, status, supplierId, returnReason, paymentStatus, startDate, endDate } = filters;
        const { limit, offset } = pagination;
        const { branchId, branchAccess } = branchConfig;

        const where = {};

        // Branch filtering
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        if (search) {
            where[Op.or] = [
                { returnNumber: { [Op.like]: `%${search}%` } },
                { remarks: { [Op.like]: `%${search}%` } }
            ];
        }

        if (status) where.status = status;
        if (supplierId) where.supplierId = supplierId;
        if (returnReason) where.returnReason = returnReason;
        if (paymentStatus) where.paymentStatus = paymentStatus;

        if (startDate || endDate) {
            where.returnDate = {};
            if (startDate) where.returnDate[Op.gte] = startDate;
            if (endDate) where.returnDate[Op.lte] = endDate;
        }

        return await SupplierReturn.findAndCountAll({
            where,
            include: [
                { model: Suppliers, as: 'supplier', attributes: ['id', 'name', 'supplierCode', 'phone'] },
                { model: Product, as: 'product', attributes: ['id', 'name', 'productCode'] },
                { model: User, as: 'performedBy', attributes: ['id', 'userName'] },
                { model: User, as: 'approver', attributes: ['id', 'userName'] }
            ],
            limit,
            offset,
            order: [['returnDate', 'DESC'], ['createdAt', 'DESC']]
        });
    }

    /**
     * Get return by ID
     */
    async getReturnById(id, branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await SupplierReturn.findOne({
            where,
            include: [
                { model: Suppliers, as: 'supplier' },
                { model: Product, as: 'product' },
                { model: GRN, as: 'grn' },
                { model: User, as: 'performedBy', attributes: ['id', 'userName'] },
                { model: User, as: 'approver', attributes: ['id', 'userName'] },
                { model: SupplierReturnPayment, as: 'payments', include: [{ model: User, as: 'processor', attributes: ['id', 'userName'] }] }
            ]
        });
    }

    /**
     * Create supplier return
     */
    async createReturn(data, branchConfig, transaction, user) {
        const { supplierId, productId, grnId, quantity, returnReason, expiryDate, remarks, unitCost } = data;

        // Validate supplier
        const supplier = await Suppliers.findByPk(supplierId, { transaction });
        if (!supplier) throw new Error('Supplier not found');

        // Validate product
        const product = await Product.findByPk(productId, { transaction });
        if (!product) throw new Error('Product not found');

        // Check available stock
        const inventorySum = await Inventory.sum('quantity', {
            where: {
                productId,
                branchId: branchConfig.branchId || data.branchId
            },
            transaction
        });

        if (!inventorySum || inventorySum < quantity) {
            throw new Error(`Insufficient stock. Available: ${inventorySum || 0}`);
        }

        // Calculate total amount
        const cost = unitCost || product.costPrice || 0;
        const totalAmount = parseFloat(quantity) * parseFloat(cost);

        // Generate return number
        const returnNumber = await this.generateReturnNumber(branchConfig.branchId || data.branchId);

        // Create return record
        const supplierReturn = await SupplierReturn.create({
            returnNumber,
            supplierId,
            productId,
            grnId,
            returnDate: data.returnDate || new Date(),
            returnReason: returnReason || 'other',
            expiryDate,
            remarks,
            quantity,
            unitCost: cost,
            totalAmount,
            paymentStatus: 'pending',
            balanceAmount: totalAmount,
            receivedAmount: 0,
            status: 'pending',
            performedByUserId: user.id,
            branchId: branchConfig.branchId || data.branchId
        }, { transaction });

        // Create inventory deduction (negative entry)
        await Inventory.create({
            productId,
            branchId: branchConfig.branchId || data.branchId,
            referenceType: 'supplier_return',
            referenceId: supplierReturn.id,
            quantity: -quantity,
            unitCost: cost,
            performedBy: user.id,
            remarks: `Return to supplier: ${supplier.name}. Reason: ${returnReason}`
        }, { transaction });

        return supplierReturn;
    }

    /**
     * Approve supplier return
     */
    async approveReturn(id, branchConfig, userContext, transaction) {
        const supplierReturn = await this.getReturnById(id, branchConfig);
        if (!supplierReturn) throw new Error('Supplier return not found');

        if (supplierReturn.status !== 'pending') {
            throw new Error('Only pending returns can be approved');
        }

        await supplierReturn.update({
            status: 'approved',
            approvedBy: userContext.userId,
            approvedDate: new Date()
        }, { transaction });

        return supplierReturn;
    }

    /**
     * Record payment received from supplier for return
     */
    async recordPayment(returnId, paymentData, branchConfig, userContext, transaction) {
        const supplierReturn = await SupplierReturn.findByPk(returnId, { transaction });
        if (!supplierReturn) throw new Error('Supplier return not found');

        if (!['pending', 'partial'].includes(supplierReturn.paymentStatus)) {
            throw new Error('This return has already been fully paid or cancelled');
        }

        const paymentAmount = parseFloat(paymentData.amount);
        const currentBalance = parseFloat(supplierReturn.balanceAmount) || parseFloat(supplierReturn.totalAmount);

        if (paymentAmount > currentBalance) {
            throw new Error(`Payment amount exceeds balance. Outstanding: ${currentBalance}`);
        }

        // Generate payment number
        const paymentNumber = await this.generatePaymentNumber(branchConfig.branchId);

        // Create payment record
        const payment = await SupplierReturnPayment.create({
            supplierReturnId: returnId,
            supplierId: supplierReturn.supplierId,
            paymentNumber,
            amount: paymentAmount,
            paymentMethod: paymentData.paymentMethod || 'credit_note',
            paymentDate: paymentData.paymentDate || new Date(),
            referenceNumber: paymentData.referenceNumber,
            bankName: paymentData.bankName,
            chequeNumber: paymentData.chequeNumber,
            chequeDate: paymentData.chequeDate,
            status: 'received',
            notes: paymentData.notes,
            processedBy: userContext.userId,
            branchId: branchConfig.branchId
        }, { transaction });

        // Update return payment status
        const newReceivedAmount = parseFloat(supplierReturn.receivedAmount || 0) + paymentAmount;
        const newBalanceAmount = parseFloat(supplierReturn.totalAmount) - newReceivedAmount;
        const newPaymentStatus = newBalanceAmount <= 0 ? 'received' : 'partial';

        await supplierReturn.update({
            receivedAmount: newReceivedAmount,
            balanceAmount: Math.max(0, newBalanceAmount),
            paymentStatus: newPaymentStatus
        }, { transaction });

        // Update supplier credit (reduce their balance if applicable)
        const lastCredit = await SupplierCredit.findOne({
            where: { supplierId: supplierReturn.supplierId },
            order: [['createdAt', 'DESC']],
            transaction
        });

        const previousBalance = lastCredit ? parseFloat(lastCredit.balanceAmount) : 0;
        const newCreditBalance = Math.max(0, previousBalance - paymentAmount);

        await SupplierCredit.create({
            supplierId: supplierReturn.supplierId,
            transactionType: 'payment_received',
            amount: -paymentAmount,
            balanceAmount: newCreditBalance,
            referenceType: 'supplier_return',
            referenceId: returnId,
            notes: `Payment received for supplier return ${supplierReturn.returnNumber}`,
            performedBy: userContext.userId,
            branchId: branchConfig.branchId
        }, { transaction });

        return { payment, supplierReturn };
    }

    /**
     * Generate payment number
     */
    async generatePaymentNumber(branchId) {
        const prefix = 'SRPAY';
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');

        const lastPayment = await SupplierReturnPayment.findOne({
            where: {
                paymentNumber: { [Op.like]: `${prefix}-${year}${month}-%` }
            },
            order: [['paymentNumber', 'DESC']]
        });

        let sequence = 1;
        if (lastPayment && lastPayment.paymentNumber) {
            const parts = lastPayment.paymentNumber.split('-');
            if (parts.length >= 3) {
                sequence = parseInt(parts[2]) + 1;
            }
        }

        return `${prefix}-${year}${month}-${sequence.toString().padStart(5, '0')}`;
    }

    /**
     * Get expired products for return
     */
    async getExpiredProducts(branchConfig, daysBeforeExpiry = 0) {
        const { branchId } = branchConfig;
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysBeforeExpiry);

        const where = {
            quantity: { [Op.gt]: 0 },
            expiryDate: { [Op.lte]: targetDate }
        };

        if (branchId) where.branchId = branchId;

        return await Inventory.findAll({
            where,
            include: [
                { model: Product, as: 'product', include: [{ model: Suppliers, as: 'suppliers' }] }
            ],
            order: [['expiryDate', 'ASC']]
        });
    }

    /**
     * Get payment history for a return
     */
    async getPaymentHistory(returnId, branchConfig) {
        return await SupplierReturnPayment.findAll({
            where: { supplierReturnId: returnId },
            include: [
                { model: User, as: 'processor', attributes: ['id', 'userName'] }
            ],
            order: [['paymentDate', 'DESC']]
        });
    }

    /**
     * Get supplier return summary
     */
    async getReturnSummary(filters, branchConfig) {
        const { supplierId, startDate, endDate } = filters;
        const { branchId } = branchConfig;

        const where = {};
        if (branchId) where.branchId = branchId;
        if (supplierId) where.supplierId = supplierId;
        if (startDate || endDate) {
            where.returnDate = {};
            if (startDate) where.returnDate[Op.gte] = startDate;
            if (endDate) where.returnDate[Op.lte] = endDate;
        }

        const totalReturns = await SupplierReturn.count({ where });
        const totalAmount = await SupplierReturn.sum('totalAmount', { where }) || 0;
        const receivedAmount = await SupplierReturn.sum('receivedAmount', { where }) || 0;
        const pendingAmount = totalAmount - receivedAmount;

        const byReason = await SupplierReturn.findAll({
            where,
            attributes: [
                'returnReason',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount']
            ],
            group: ['returnReason'],
            raw: true
        });

        const byStatus = await SupplierReturn.findAll({
            where,
            attributes: [
                'paymentStatus',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount']
            ],
            group: ['paymentStatus'],
            raw: true
        });

        return {
            totalReturns,
            totalAmount,
            receivedAmount,
            pendingAmount,
            byReason,
            byStatus
        };
    }
}

module.exports = new SupplierReturnService();
