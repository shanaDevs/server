const db = require('../../models');
const { CustomerRefund, CustomerRefundItem, Sale, SaleItem, Customer, User, Product } = db;
const { Op } = require('sequelize');

class CustomerRefundService {
    async getAllRefunds(filters, pagination, branchConfig) {
        const { search, status, customerId, startDate, endDate } = filters;
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
                { refundNumber: { [Op.like]: `%${search}%` } },
                { invoiceNumber: { [Op.like]: `%${search}%` } }
            ];
        }

        if (status) where.status = status;
        if (customerId) where.customerId = customerId;
        
        if (startDate || endDate) {
            where.refundDate = {};
            if (startDate) where.refundDate[Op.gte] = startDate;
            if (endDate) where.refundDate[Op.lte] = endDate;
        }

        return await CustomerRefund.findAndCountAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'customerName', 'phone'] },
                { model: Sale, as: 'sale', attributes: ['id', 'invoiceNumber'] },
                { model: User, as: 'processedByUser', attributes: ['id', 'userName'] }
            ],
            limit,
            offset,
            order: [['refundDate', 'DESC'], ['createdAt', 'DESC']]
        });
    }

    async getRefundById(id, branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
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
                {
                    model: CustomerRefundItem,
                    as: 'items',
                    include: [{ model: Product, as: 'product' }]
                }
            ]
        });
    }

    async generateRefundNumber(branchId) {
        const prefix = 'REF';
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        
        const lastRefund = await CustomerRefund.findOne({
            where: {
                refundNumber: { [Op.like]: `${prefix}${year}${month}%` },
                branchId
            },
            order: [['refundNumber', 'DESC']]
        });

        let sequence = 1;
        if (lastRefund) {
            const lastSequence = parseInt(lastRefund.refundNumber.slice(-4));
            sequence = lastSequence + 1;
        }

        return `${prefix}${year}${month}${sequence.toString().padStart(4, '0')}`;
    }

    async createRefund(data, items, transaction) {
        // Create refund
        const refund = await CustomerRefund.create(data, { transaction });

        // Create refund items
        const refundItems = items.map(item => ({
            ...item,
            customerRefundId: refund.id,
            branchId: data.branchId
        }));

        await CustomerRefundItem.bulkCreate(refundItems, { transaction });

        return refund;
    }

    async updateRefund(id, data, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const refund = await CustomerRefund.findOne({ where, transaction });
        if (!refund) return null;

        if (refund.status === 'completed') {
            throw new Error('Cannot update completed refund');
        }

        await refund.update(data, { transaction });
        return refund;
    }

    async approveRefund(id, branchConfig, userContext, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const refund = await CustomerRefund.findOne({
            where,
            include: [{ model: CustomerRefundItem, as: 'items' }],
            transaction
        });

        if (!refund) return null;

        if (refund.status !== 'pending') {
            throw new Error('Only pending refunds can be approved');
        }

        await refund.update({
            status: 'approved',
            approvedBy: userContext.userId,
            approvedDate: new Date()
        }, { transaction });

        return refund;
    }

    async completeRefund(id, branchConfig, userContext, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const refund = await CustomerRefund.findOne({
            where,
            include: [{ model: CustomerRefundItem, as: 'items' }],
            transaction
        });

        if (!refund) return null;

        if (refund.status === 'completed') {
            throw new Error('Refund already completed');
        }

        await refund.update({
            status: 'completed',
            processedBy: userContext.userId,
            processedDate: new Date()
        }, { transaction });

        return refund;
    }

    async cancelRefund(id, reason, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const refund = await CustomerRefund.findOne({ where, transaction });
        if (!refund) return null;

        if (refund.status === 'completed') {
            throw new Error('Cannot cancel completed refund');
        }

        await refund.update({
            status: 'cancelled',
            cancelReason: reason
        }, { transaction });

        return refund;
    }
}

module.exports = new CustomerRefundService();
