const db = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { payment } = db;
const paymentService = require('../../services/payments/paymentService');
const { requireBranchId, addBranchFilter, addBranchId } = require('../../utils/branchHelper');

// Get all payments with filters
exports.getAllPayments = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const filters = req.query;
        const pagination = {
            limit: parseInt(limit),
            offset: (page - 1) * parseInt(limit)
        };

        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        const { count, rows } = await paymentService.getAllPayments(filters, pagination, branchConfig);

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get single payment by ID
exports.getPaymentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        const paymentRecord = await paymentService.getPaymentById(id, branchConfig);

        if (!paymentRecord) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.json({
            success: true,
            data: paymentRecord
        });
    } catch (error) {
        next(error);
    }
};

// Create new payment
exports.createPayment = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const paymentData = {
            ...req.body,
            createdBy: req.user.id
        };
        addBranchId(paymentData, req);

        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        const newPayment = await paymentService.createPayment(paymentData, branchConfig, transaction);

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Payment created successfully',
            data: newPayment
        });
    } catch (error) {
        await transaction.rollback();

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, message: 'Reference number already exists' });
        }

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ success: false, message: error.errors[0].message });
        }

        next(error);
    }
};

// Update payment
exports.updatePayment = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        const updatedPayment = await paymentService.updatePayment(id, req.body, branchConfig, transaction);
        
        if (!updatedPayment) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Payment updated successfully',
            data: updatedPayment
        });
    } catch (error) {
        await transaction.rollback();
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ success: false, message: error.errors[0].message });
        }
        next(error);
    }
};

// Cancel payment
exports.cancelPayment = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;

        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        const deleted = await paymentService.deletePayment(id, branchConfig, transaction);
        
        if (!deleted) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Payment cancelled successfully'
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Get payment statistics
exports.getPaymentStatistics = async (req, res, next) => {
    try {
        const { paymentType = 'all', startDate, endDate, paymentMethod } = req.query;
        
        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        // Build date filter
        const dateFilter = {};
        if (startDate) {
            dateFilter[Op.gte] = new Date(startDate);
        }
        if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            dateFilter[Op.lte] = endDateTime;
        }

        let statistics = {
            totalPayments: 0,
            totalAmount: 0,
            byMethod: {},
            byType: {}
        };

        // Handle GRN payments (from Payment model)
        if (paymentType === 'grn' || paymentType === 'all') {
            const grnWhere = {
                isCancelled: false
            };

            if (branchConfig.branchAccess !== 'all') {
                grnWhere.branchId = branchConfig.branchId;
            }

            if (Object.keys(dateFilter).length > 0) {
                grnWhere.paidDate = dateFilter;
            }

            if (paymentMethod) {
                grnWhere.paymentMethod = paymentMethod.toUpperCase();
            }

            const grnPayments = await db.payment.findAll({
                where: grnWhere,
                attributes: [
                    'paymentMethod',
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                    [db.sequelize.fn('SUM', db.sequelize.col('amount_paid')), 'total']
                ],
                group: ['paymentMethod'],
                raw: true
            });

            grnPayments.forEach(payment => {
                const method = payment.paymentMethod;
                const count = parseInt(payment.count) || 0;
                const total = parseFloat(payment.total) || 0;

                statistics.totalPayments += count;
                statistics.totalAmount += total;

                if (!statistics.byMethod[method]) {
                    statistics.byMethod[method] = { count: 0, total: 0 };
                }
                statistics.byMethod[method].count += count;
                statistics.byMethod[method].total += total;

                if (!statistics.byType.grn) {
                    statistics.byType.grn = { count: 0, total: 0 };
                }
                statistics.byType.grn.count += count;
                statistics.byType.grn.total += total;
            });
        }

        // Handle Sale payments (from SalePayment model)
        if (paymentType === 'sale' || paymentType === 'all') {
            const saleWhere = {};

            if (branchConfig.branchAccess !== 'all') {
                saleWhere.branchId = branchConfig.branchId;
            }

            if (Object.keys(dateFilter).length > 0) {
                saleWhere.paymentDate = dateFilter;
            }

            if (paymentMethod) {
                saleWhere.paymentMethod = paymentMethod.toLowerCase();
            }

            const salePayments = await db.SalePayment.findAll({
                where: saleWhere,
                attributes: [
                    'paymentMethod',
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                    [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
                ],
                group: ['paymentMethod'],
                raw: true
            });

            salePayments.forEach(payment => {
                const method = payment.paymentMethod.toUpperCase();
                const count = parseInt(payment.count) || 0;
                const total = parseFloat(payment.total) || 0;

                statistics.totalPayments += count;
                statistics.totalAmount += total;

                if (!statistics.byMethod[method]) {
                    statistics.byMethod[method] = { count: 0, total: 0 };
                }
                statistics.byMethod[method].count += count;
                statistics.byMethod[method].total += total;

                if (!statistics.byType.sale) {
                    statistics.byType.sale = { count: 0, total: 0 };
                }
                statistics.byType.sale.count += count;
                statistics.byType.sale.total += total;
            });
        }

        res.json({
            success: true,
            data: statistics,
            filters: {
                paymentType,
                startDate: startDate || null,
                endDate: endDate || null,
                paymentMethod: paymentMethod || null
            }
        });
    } catch (error) {
        next(error);
    }
};

