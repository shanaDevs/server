const db = require('../../models');
const { CustomerRefund, CustomerRefundItem, CustomerReturnPayment, Customer, CustomerCredit, Sale, SaleItem, Product, Inventory, User, SystemSettings } = db;
const { Op } = require('sequelize');

class CustomerReturnService {

    /**
     * Generate refund number
     */
    async generateRefundNumber(branchId) {
        const prefix = 'CRET';
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');

        const lastRefund = await CustomerRefund.findOne({
            where: {
                refundNumber: { [Op.like]: `${prefix}-${year}${month}-%` },
                branchId
            },
            order: [['refundNumber', 'DESC']]
        });

        let sequence = 1;
        if (lastRefund && lastRefund.refundNumber) {
            const parts = lastRefund.refundNumber.split('-');
            if (parts.length >= 3) {
                sequence = parseInt(parts[2]) + 1;
            }
        }

        return `${prefix}-${year}${month}-${sequence.toString().padStart(5, '0')}`;
    }

    /**
     * Get all customer returns
     */
    async getAllReturns(filters, pagination, branchConfig) {
        const { search, status, customerId, returnReason, paymentStatus, startDate, endDate } = filters;
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
                { refundNumber: { [Op.like]: `%${search}%` } },
                { remarks: { [Op.like]: `%${search}%` } }
            ];
        }

        if (status) where.status = status;
        if (customerId) where.customerId = customerId;
        if (returnReason) where.returnReason = returnReason;
        if (paymentStatus) where.paymentStatus = paymentStatus;

        if (startDate || endDate) {
            where.refundDate = {};
            if (startDate) where.refundDate[Op.gte] = startDate;
            if (endDate) where.refundDate[Op.lte] = endDate;
        }

        return await CustomerRefund.findAndCountAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'customerName', 'customerCode', 'phone'] },
                { model: Sale, as: 'sale', attributes: ['id', 'saleNumber', 'saleDate', 'totalAmount'] },
                { model: User, as: 'processedByUser', attributes: ['id', 'userName'] },
                { model: User, as: 'approver', attributes: ['id', 'userName'] }
            ],
            limit,
            offset,
            order: [['refundDate', 'DESC'], ['createdAt', 'DESC']]
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

        return await CustomerRefund.findOne({
            where,
            include: [
                { model: Customer, as: 'customer' },
                { model: Sale, as: 'sale' },
                { model: User, as: 'processedByUser', attributes: ['id', 'userName'] },
                { model: User, as: 'approver', attributes: ['id', 'userName'] },
                {
                    model: CustomerRefundItem,
                    as: 'items',
                    include: [
                        { model: Product, as: 'product' },
                        { model: SaleItem, as: 'saleItem' }
                    ]
                },
                {
                    model: CustomerReturnPayment,
                    as: 'payments',
                    include: [{ model: User, as: 'processor', attributes: ['id', 'userName'] }]
                }
            ]
        });
    }

    /**
     * Create customer return
     */
    async createReturn(data, branchConfig, transaction, user) {
        const { customerId, saleId, items, returnReason, expiryDate, remarks, refundMethod } = data;

        // Validate customer
        const customer = await Customer.findByPk(customerId, { transaction });
        if (!customer) throw new Error('Customer not found');

        // Validate sale if provided
        let sale = null;
        if (saleId) {
            sale = await Sale.findByPk(saleId, {
                include: [{ model: SaleItem, as: 'items' }],
                transaction
            });
            if (!sale) throw new Error('Sale not found');
            if (sale.customerId !== customerId) throw new Error('Sale does not belong to this customer');
        }

        // Fetch system settings for tax
        const settings = await SystemSettings.findOne({ transaction });
        const isTaxEnabled = settings ? settings.enableTax : false;

        // Calculate totals from items
        let totalAmount = 0;
        let totalSubtotal = 0;
        let totalTaxAmount = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await Product.findByPk(item.productId, { transaction });
            if (!product) throw new Error(`Product ${item.productId} not found`);

            const unitPrice = item.unitPrice || product.sellingPrice || 0;
            const itemSubtotal = parseFloat(item.quantity) * parseFloat(unitPrice);

            // Calculate tax for this item
            let itemTaxPercentage = 0;
            let itemTaxAmount = 0;

            if (isTaxEnabled && product.isTaxable) {
                const productTaxRate = parseFloat(product.taxRate || 0);
                if (product.taxType === 'percentage' && productTaxRate > 0) {
                    itemTaxPercentage = productTaxRate;
                    itemTaxAmount = (itemSubtotal * productTaxRate) / 100;
                } else if (product.taxType === 'fixed' && productTaxRate > 0) {
                    itemTaxAmount = productTaxRate * parseFloat(item.quantity);
                    itemTaxPercentage = itemSubtotal > 0 ? (itemTaxAmount / itemSubtotal) * 100 : 0;
                }
            }

            const refundAmount = itemSubtotal + itemTaxAmount;

            totalSubtotal += itemSubtotal;
            totalTaxAmount += itemTaxAmount;
            totalAmount += refundAmount;

            processedItems.push({
                productId: item.productId,
                productName: product.name,
                productCode: product.productCode,
                saleItemId: item.saleItemId,
                quantity: item.quantity,
                unitPrice,
                refundAmount: itemSubtotal,
                taxPercentage: itemTaxPercentage,
                taxAmount: itemTaxAmount,
                returnReason: item.returnReason || returnReason || 'other',
                expiryDate: item.expiryDate || expiryDate,
                batchNumber: item.batchNumber,
                restockable: item.restockable !== false,
                remarks: item.remarks
            });
        }

        // Generate refund number
        const refundNumber = await this.generateRefundNumber(branchConfig.branchId || data.branchId);

        // Create refund record
        const customerRefund = await CustomerRefund.create({
            refundNumber,
            customerId,
            saleId,
            userId: user.id,
            refundDate: data.refundDate || new Date(),
            returnReason: returnReason || 'other',
            expiryDate,
            remarks,
            totalAmount,
            subtotal: totalSubtotal,
            taxAmount: totalTaxAmount,
            paymentStatus: 'pending',
            paidAmount: 0,
            balanceAmount: totalAmount,
            refundMethod: refundMethod || 'cash',
            status: 'pending',
            branchId: branchConfig.branchId || data.branchId
        }, { transaction });

        // Create refund items
        for (const item of processedItems) {
            await CustomerRefundItem.create({
                refundId: customerRefund.id,
                ...item,
                branchId: branchConfig.branchId || data.branchId
            }, { transaction });

            // Add back to inventory if restockable
            if (item.restockable) {
                await Inventory.create({
                    productId: item.productId,
                    branchId: branchConfig.branchId || data.branchId,
                    referenceType: 'customer_return',
                    referenceId: customerRefund.id,
                    quantity: item.quantity,
                    unitCost: item.unitPrice,
                    performedBy: user.id,
                    remarks: `Customer return: ${customer.customerName}. Reason: ${item.returnReason}`
                }, { transaction });
            }
        }

        return customerRefund;
    }

    /**
     * Approve customer return
     */
    async approveReturn(id, branchConfig, userContext, transaction) {
        const customerRefund = await CustomerRefund.findByPk(id, { transaction });
        if (!customerRefund) throw new Error('Customer return not found');

        if (customerRefund.status !== 'pending') {
            throw new Error('Only pending returns can be approved');
        }

        await customerRefund.update({
            status: 'approved',
            approvedBy: userContext.userId,
            approvedDate: new Date()
        }, { transaction });

        return customerRefund;
    }

    /**
     * Process refund payment to customer
     */
    async processPayment(refundId, paymentData, branchConfig, userContext, transaction) {
        const customerRefund = await CustomerRefund.findByPk(refundId, {
            include: [{ model: Customer, as: 'customer' }],
            transaction
        });

        if (!customerRefund) throw new Error('Customer return not found');

        if (!['pending', 'partial'].includes(customerRefund.paymentStatus)) {
            throw new Error('This refund has already been fully paid or cancelled');
        }

        const paymentAmount = parseFloat(paymentData.amount);
        const currentBalance = parseFloat(customerRefund.balanceAmount) || parseFloat(customerRefund.totalAmount);

        if (paymentAmount > currentBalance) {
            throw new Error(`Payment amount exceeds balance. Outstanding: ${currentBalance}`);
        }

        // Generate payment number
        const paymentNumber = await this.generatePaymentNumber(branchConfig.branchId);

        // Create payment record
        const payment = await CustomerReturnPayment.create({
            customerRefundId: refundId,
            customerId: customerRefund.customerId,
            paymentNumber,
            amount: paymentAmount,
            paymentMethod: paymentData.paymentMethod || 'cash',
            paymentDate: paymentData.paymentDate || new Date(),
            referenceNumber: paymentData.referenceNumber,
            bankName: paymentData.bankName,
            cardType: paymentData.cardType,
            cardLastFour: paymentData.cardLastFour,
            status: 'paid',
            notes: paymentData.notes,
            processedBy: userContext.userId,
            branchId: branchConfig.branchId
        }, { transaction });

        // Update refund payment status
        const newPaidAmount = parseFloat(customerRefund.paidAmount || 0) + paymentAmount;
        const newBalanceAmount = parseFloat(customerRefund.totalAmount) - newPaidAmount;
        const newPaymentStatus = newBalanceAmount <= 0 ? 'paid' : 'partial';

        await customerRefund.update({
            paidAmount: newPaidAmount,
            balanceAmount: Math.max(0, newBalanceAmount),
            paymentStatus: newPaymentStatus,
            status: newPaymentStatus === 'paid' ? 'completed' : customerRefund.status
        }, { transaction });

        // If payment method is store_credit or credit_adjustment, update customer credit
        if (['store_credit', 'credit_adjustment'].includes(paymentData.paymentMethod)) {
            const customer = customerRefund.customer;
            const previousCredit = parseFloat(customer.currentCredit) || 0;

            // Reduce customer's credit balance (they owed us, now we owe them less)
            const newCreditBalance = Math.max(0, previousCredit - paymentAmount);

            await customer.update({ currentCredit: newCreditBalance }, { transaction });

            await CustomerCredit.create({
                customerId: customerRefund.customerId,
                transactionType: 'credit_adjustment',
                amount: -paymentAmount,
                balanceAmount: newCreditBalance,
                referenceType: 'refund',
                referenceId: refundId,
                paymentMethod: paymentData.paymentMethod,
                status: 'paid',
                notes: `Refund for return ${customerRefund.refundNumber}`,
                performedBy: userContext.userId,
                branchId: branchConfig.branchId
            }, { transaction });
        }

        return { payment, customerRefund };
    }

    /**
     * Generate payment number
     */
    async generatePaymentNumber(branchId) {
        const prefix = 'CRPAY';
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');

        const lastPayment = await CustomerReturnPayment.findOne({
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
     * Get payment history for a refund
     */
    async getPaymentHistory(refundId, branchConfig) {
        return await CustomerReturnPayment.findAll({
            where: { customerRefundId: refundId },
            include: [
                { model: User, as: 'processor', attributes: ['id', 'userName'] }
            ],
            order: [['paymentDate', 'DESC']]
        });
    }

    /**
     * Get customer return summary
     */
    async getReturnSummary(filters, branchConfig) {
        const { customerId, startDate, endDate } = filters;
        const { branchId } = branchConfig;

        const where = {};
        if (branchId) where.branchId = branchId;
        if (customerId) where.customerId = customerId;
        if (startDate || endDate) {
            where.refundDate = {};
            if (startDate) where.refundDate[Op.gte] = startDate;
            if (endDate) where.refundDate[Op.lte] = endDate;
        }

        const totalReturns = await CustomerRefund.count({ where });
        const totalAmount = await CustomerRefund.sum('totalAmount', { where }) || 0;
        const paidAmount = await CustomerRefund.sum('paidAmount', { where }) || 0;
        const pendingAmount = totalAmount - paidAmount;

        const byReason = await CustomerRefund.findAll({
            where,
            attributes: [
                'returnReason',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount']
            ],
            group: ['returnReason'],
            raw: true
        });

        const byStatus = await CustomerRefund.findAll({
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
            paidAmount,
            pendingAmount,
            byReason,
            byStatus
        };
    }
}

module.exports = new CustomerReturnService();
