const db = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { addBranchId, addBranchFilter } = require('../../utils/branchHelper');

/**
 * Get all supplier outstanding bills (GRNs with pending/partial payment)
 * GET /api/supplier-payments/outstanding
 */
exports.getOutstandingBills = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            supplierId,
            paymentStatus,
            startDate,
            endDate,
            search
        } = req.query;

        const offset = (page - 1) * parseInt(limit);

        // Build where clause
        const where = {
            status: 'approved',
            paymentStatus: { [Op.in]: ['pending', 'partial'] }
        };

        // Apply branch filter
        if (req.branchAccess && !req.branchAccess.canAccessAllBranches) {
            where.branchId = req.branchId;
        }

        if (supplierId) {
            where.supplierId = supplierId;
        }

        if (paymentStatus && ['pending', 'partial'].includes(paymentStatus)) {
            where.paymentStatus = paymentStatus;
        }

        if (startDate || endDate) {
            where.grnDate = {};
            if (startDate) {
                where.grnDate[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                where.grnDate[Op.lte] = new Date(endDate);
            }
        }

        // Build include for search
        const include = [
            {
                model: db.Suppliers,
                as: 'supplier',
                attributes: ['id', 'name', 'supplierCode', 'phone', 'email'],
                where: search ? {
                    [Op.or]: [
                        { name: { [Op.like]: `%${search}%` } },
                        { supplierCode: { [Op.like]: `%${search}%` } }
                    ]
                } : undefined
            },
            {
                model: db.SupplierPayment,
                as: 'supplierPayments',
                required: false
            }
        ];

        const { count, rows } = await db.GRN.findAndCountAll({
            where,
            include,
            limit: parseInt(limit),
            offset,
            order: [['grnDate', 'DESC']]
        });

        // Calculate summary
        const summary = await db.GRN.findAll({
            where,
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalOutstanding'],
                [db.sequelize.fn('SUM', db.sequelize.col('paid_amount')), 'totalPaid'],
                [db.sequelize.fn('SUM', db.sequelize.col('balance_amount')), 'totalBalance'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'billCount']
            ],
            raw: true
        });

        res.json({
            success: true,
            data: rows,
            summary: {
                totalOutstanding: parseFloat(summary[0].totalOutstanding) || 0,
                totalPaid: parseFloat(summary[0].totalPaid) || 0,
                totalBalance: parseFloat(summary[0].totalBalance) || 0,
                billCount: parseInt(summary[0].billCount) || 0
            },
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
 * Get supplier outstanding balance summary
 * GET /api/supplier-payments/summary/:supplierId
 */
exports.getSupplierOutstandingSummary = async (req, res, next) => {
    try {
        const { supplierId } = req.params;

        // Get supplier details
        const supplier = await db.Suppliers.findByPk(supplierId);
        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }

        // Build where clause
        const where = {
            supplierId,
            status: 'approved'
        };

        if (req.branchAccess && !req.branchAccess.canAccessAllBranches) {
            where.branchId = req.branchId;
        }

        // Get all GRNs summary
        const grnSummary = await db.GRN.findAll({
            where,
            attributes: [
                'paymentStatus',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount'],
                [db.sequelize.fn('SUM', db.sequelize.col('paid_amount')), 'paidAmount'],
                [db.sequelize.fn('SUM', db.sequelize.col('balance_amount')), 'balanceAmount']
            ],
            group: ['paymentStatus'],
            raw: true
        });

        // Get pending/partial bills
        const outstandingBills = await db.GRN.findAll({
            where: {
                ...where,
                paymentStatus: { [Op.in]: ['pending', 'partial'] }
            },
            attributes: ['id', 'grnNumber', 'grnDate', 'totalAmount', 'paidAmount', 'balanceAmount', 'paymentStatus'],
            order: [['grnDate', 'ASC']]
        });

        // Get recent payments
        const recentPayments = await db.SupplierPayment.findAll({
            where: { supplierId, status: 'completed' },
            limit: 10,
            order: [['paymentDate', 'DESC']],
            include: [{
                model: db.GRN,
                as: 'grn',
                attributes: ['grnNumber']
            }]
        });

        // Calculate totals
        let totalAmount = 0;
        let totalPaid = 0;
        let totalBalance = 0;
        const statusBreakdown = {};

        grnSummary.forEach(item => {
            statusBreakdown[item.paymentStatus] = {
                count: parseInt(item.count) || 0,
                totalAmount: parseFloat(item.totalAmount) || 0,
                paidAmount: parseFloat(item.paidAmount) || 0,
                balanceAmount: parseFloat(item.balanceAmount) || 0
            };
            totalAmount += parseFloat(item.totalAmount) || 0;
            totalPaid += parseFloat(item.paidAmount) || 0;
            totalBalance += parseFloat(item.balanceAmount) || 0;
        });

        res.json({
            success: true,
            data: {
                supplier: {
                    id: supplier.id,
                    name: supplier.name,
                    supplierCode: supplier.supplierCode,
                    phone: supplier.phone,
                    email: supplier.email
                },
                summary: {
                    totalAmount,
                    totalPaid,
                    totalBalance,
                    statusBreakdown
                },
                outstandingBills,
                recentPayments
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Make payment to supplier (partial or full)
 * POST /api/supplier-payments
 */
exports.makePayment = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const {
            supplierId,
            grnId,
            amount,
            paymentMethod = 'cash',
            referenceNumber,
            bankName,
            chequeNumber,
            chequeDate,
            notes
        } = req.body;

        // Validate supplier exists
        const supplier = await db.Suppliers.findByPk(supplierId);
        if (!supplier) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }

        let grn = null;
        let previousBalance = 0;

        // If grnId provided, pay specific GRN
        if (grnId) {
            grn = await db.GRN.findOne({
                where: { id: grnId, supplierId },
                transaction
            });

            if (!grn) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'GRN not found for this supplier'
                });
            }

            if (grn.paymentStatus === 'paid') {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'This GRN is already fully paid'
                });
            }

            previousBalance = parseFloat(grn.balanceAmount);

            // Update GRN payment
            const newPaidAmount = parseFloat(grn.paidAmount) + parseFloat(amount);
            await grn.update({ paidAmount: newPaidAmount }, { transaction });
        } else {
            // Get total outstanding balance for supplier
            const outstandingWhere = {
                supplierId,
                status: 'approved',
                paymentStatus: { [Op.in]: ['pending', 'partial'] }
            };

            const totalOutstanding = await db.GRN.sum('balance_amount', {
                where: outstandingWhere,
                transaction
            });

            previousBalance = parseFloat(totalOutstanding) || 0;

            // Apply payment to oldest GRNs first (FIFO)
            let remainingPayment = parseFloat(amount);
            const grnsToUpdate = await db.GRN.findAll({
                where: outstandingWhere,
                order: [['grnDate', 'ASC']],
                transaction
            });

            for (const grnRecord of grnsToUpdate) {
                if (remainingPayment <= 0) break;

                const grnBalance = parseFloat(grnRecord.balanceAmount);
                const paymentForThisGrn = Math.min(remainingPayment, grnBalance);

                const newPaidAmount = parseFloat(grnRecord.paidAmount) + paymentForThisGrn;
                await grnRecord.update({ paidAmount: newPaidAmount }, { transaction });

                remainingPayment -= paymentForThisGrn;
            }
        }

        // Calculate new balance
        const currentBalance = previousBalance - parseFloat(amount);

        // Create payment record
        const paymentData = {
            supplierId,
            grnId: grnId || null,
            amount,
            paymentMethod,
            referenceNumber,
            bankName,
            chequeNumber,
            chequeDate: chequeDate ? new Date(chequeDate) : null,
            notes,
            previousBalance,
            currentBalance: Math.max(0, currentBalance),
            status: 'completed',
            createdBy: req.user.id
        };
        addBranchId(paymentData, req);

        // Check for active counter session and link it
        const activeSession = await db.CounterSession.findOne({
            where: {
                userId: req.user?.id,
                branchId: paymentData.branchId,
                status: 'OPEN'
            },
            transaction
        });

        if (activeSession) {
            paymentData.counterSessionId = activeSession.id;
        }

        const payment = await db.SupplierPayment.create(paymentData, { transaction });

        await transaction.commit();

        // Fetch complete payment with associations
        const completePayment = await db.SupplierPayment.findByPk(payment.id, {
            include: [
                {
                    model: db.Suppliers,
                    as: 'supplier',
                    attributes: ['id', 'name', 'supplierCode']
                },
                {
                    model: db.GRN,
                    as: 'grn',
                    attributes: ['id', 'grnNumber', 'totalAmount', 'paidAmount', 'balanceAmount', 'paymentStatus']
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Payment recorded successfully',
            data: completePayment
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Get payment history for a supplier
 * GET /api/supplier-payments/history/:supplierId
 */
exports.getPaymentHistory = async (req, res, next) => {
    try {
        const { supplierId } = req.params;
        const { page = 1, limit = 10, startDate, endDate, paymentMethod } = req.query;
        const offset = (page - 1) * parseInt(limit);

        const where = { supplierId };

        if (req.branchAccess && !req.branchAccess.canAccessAllBranches) {
            where.branchId = req.branchId;
        }

        if (startDate || endDate) {
            where.paymentDate = {};
            if (startDate) {
                where.paymentDate[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                where.paymentDate[Op.lte] = endDateTime;
            }
        }

        if (paymentMethod) {
            where.paymentMethod = paymentMethod;
        }

        const { count, rows } = await db.SupplierPayment.findAndCountAll({
            where,
            include: [
                {
                    model: db.GRN,
                    as: 'grn',
                    attributes: ['id', 'grnNumber', 'grnDate']
                },
                {
                    model: db.User,
                    as: 'creator',
                    attributes: ['id', 'userName', 'firstName', 'lastName']
                }
            ],
            limit: parseInt(limit),
            offset,
            order: [['paymentDate', 'DESC']]
        });

        // Get summary
        const summary = await db.SupplierPayment.findAll({
            where: { ...where, status: 'completed' },
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalPaid'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'paymentCount']
            ],
            raw: true
        });

        res.json({
            success: true,
            data: rows,
            summary: {
                totalPaid: parseFloat(summary[0].totalPaid) || 0,
                paymentCount: parseInt(summary[0].paymentCount) || 0
            },
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
 * Get single payment details
 * GET /api/supplier-payments/:id
 */
exports.getPaymentById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const payment = await db.SupplierPayment.findByPk(id, {
            include: [
                {
                    model: db.Suppliers,
                    as: 'supplier',
                    attributes: ['id', 'name', 'supplierCode', 'phone', 'email']
                },
                {
                    model: db.GRN,
                    as: 'grn',
                    attributes: ['id', 'grnNumber', 'grnDate', 'totalAmount', 'paidAmount', 'balanceAmount', 'paymentStatus']
                },
                {
                    model: db.User,
                    as: 'creator',
                    attributes: ['id', 'userName', 'firstName', 'lastName']
                },
                {
                    model: db.Branch,
                    as: 'branch',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.json({
            success: true,
            data: payment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel a payment
 * PUT /api/supplier-payments/:id/cancel
 */
exports.cancelPayment = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const payment = await db.SupplierPayment.findByPk(id, { transaction });

        if (!payment) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.status === 'cancelled') {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Payment is already cancelled'
            });
        }

        // Reverse the payment on GRN if applicable
        if (payment.grnId) {
            const grn = await db.GRN.findByPk(payment.grnId, { transaction });
            if (grn) {
                const newPaidAmount = Math.max(0, parseFloat(grn.paidAmount) - parseFloat(payment.amount));
                await grn.update({ paidAmount: newPaidAmount }, { transaction });
            }
        } else {
            // Need to reverse from GRNs - this is complex, so we'll just mark as cancelled
            // In practice, you might want to handle this differently
        }

        await payment.update({
            status: 'cancelled',
            notes: payment.notes ? `${payment.notes}\n\nCANCELLED: ${reason}` : `CANCELLED: ${reason}`
        }, { transaction });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Payment cancelled successfully',
            data: payment
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Get all suppliers with outstanding balance
 * GET /api/supplier-payments/suppliers-with-balance
 */
exports.getSuppliersWithBalance = async (req, res, next) => {
    try {
        const { search, minBalance, maxBalance, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * parseInt(limit);

        // Build GRN where clause
        const grnWhere = {
            status: 'approved',
            paymentStatus: { [Op.in]: ['pending', 'partial'] }
        };

        if (req.branchAccess && !req.branchAccess.canAccessAllBranches) {
            grnWhere.branchId = req.branchId;
        }

        // Get suppliers with outstanding balance
        const suppliers = await db.Suppliers.findAll({
            where: search ? {
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { supplierCode: { [Op.like]: `%${search}%` } }
                ]
            } : undefined,
            include: [{
                model: db.GRN,
                as: 'grns',
                where: grnWhere,
                required: true,
                attributes: []
            }],
            attributes: [
                'id',
                'name',
                'supplierCode',
                'phone',
                'email',
                [db.sequelize.literal(`(
                    SELECT SUM(g.balance_amount)
                    FROM grns g
                    WHERE g.supplier_id = Suppliers.id
                    AND g.status = 'approved'
                    AND g.payment_status IN ('pending', 'partial')
                )`), 'totalBalance'],
                [db.sequelize.literal(`(
                    SELECT COUNT(g.id)
                    FROM grns g
                    WHERE g.supplier_id = Suppliers.id
                    AND g.status = 'approved'
                    AND g.payment_status IN ('pending', 'partial')
                )`), 'outstandingBillCount']
            ],
            group: ['Suppliers.id'],
            having: minBalance || maxBalance ? db.sequelize.where(
                db.sequelize.literal(`(
                    SELECT SUM(g.balance_amount)
                    FROM grns g
                    WHERE g.supplier_id = Suppliers.id
                    AND g.status = 'approved'
                    AND g.payment_status IN ('pending', 'partial')
                )`),
                {
                    ...(minBalance && { [Op.gte]: parseFloat(minBalance) }),
                    ...(maxBalance && { [Op.lte]: parseFloat(maxBalance) })
                }
            ) : undefined,
            order: [[db.sequelize.literal('totalBalance'), 'DESC']],
            limit: parseInt(limit),
            offset,
            subQuery: false
        });

        res.json({
            success: true,
            data: suppliers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        next(error);
    }
};
