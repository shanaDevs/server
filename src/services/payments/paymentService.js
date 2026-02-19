const db = require('../../models');
const { Payment } = db;
const { Op } = require('sequelize');

class PaymentService {
    async getAllPayments(filters, pagination, branchConfig) {
        const { search, paymentMethod, startDate, endDate } = filters;
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
                { referenceNo: { [Op.like]: `%${search}%` } }
            ];
        }

        if (paymentMethod) where.paymentMethod = paymentMethod;
        
        if (startDate || endDate) {
            where.paidDate = {};
            if (startDate) where.paidDate[Op.gte] = startDate;
            if (endDate) where.paidDate[Op.lte] = endDate;
        }

        return await Payment.findAndCountAll({
            where,
            limit,
            offset,
            order: [['paidDate', 'DESC'], ['createdAt', 'DESC']]
        });
    }

    async getPaymentById(id, branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await Payment.findOne({
            where
        });
    }


    async createPayment(data, transaction) {
        return await Payment.create(data, { transaction });
    }

    async updatePayment(id, data, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const payment = await Payment.findOne({ where, transaction });
        if (!payment) return null;

        await payment.update(data, { transaction });
        return payment;
    }

    async deletePayment(id, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const payment = await Payment.findOne({ where, transaction });
        if (!payment) return null;

        await payment.destroy({ transaction });
        return true;
    }

    async getTotalPaymentsByMethod(branchConfig, startDate, endDate) {
        const { branchId, branchAccess } = branchConfig;
        const where = {};

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        if (startDate || endDate) {
            where.paymentDate = {};
            if (startDate) where.paymentDate[Op.gte] = startDate;
            if (endDate) where.paymentDate[Op.lte] = endDate;
        }

        return await Payment.findAll({
            where,
            attributes: [
                'paymentMethod',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalAmount'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
            ],
            group: ['paymentMethod']
        });
    }
}

module.exports = new PaymentService();
