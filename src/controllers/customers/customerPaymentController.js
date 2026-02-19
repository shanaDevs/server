const db = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { addBranchId, getBranchId } = require('../../utils/branchHelper');

/**
 * Get all customer outstanding bills (Sales with pending/partial payment)
 * GET /api/customer-payments/outstanding
 */
exports.getOutstandingBills = async (req, res, next) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            customerId, 
            paymentStatus,
            startDate,
            endDate,
            search 
        } = req.query;

        const offset = (page - 1) * parseInt(limit);

        // Build where clause
        const where = {
            saleStatus: 'completed',
            paymentStatus: { [Op.in]: ['pending', 'partial'] },
            isDeleted: false
        };

        // Apply branch filter
        if (req.branchAccess && !req.branchAccess.canAccessAllBranches) {
            where.branchId = req.branchId;
        }

        if (customerId) {
            where.customerId = customerId;
        }

        if (paymentStatus && ['pending', 'partial'].includes(paymentStatus)) {
            where.paymentStatus = paymentStatus;
        }

        if (startDate || endDate) {
            where.saleDate = {};
            if (startDate) {
                where.saleDate[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                where.saleDate[Op.lte] = new Date(endDate);
            }
        }

        // Build include for search
        const include = [
            {
                model: db.Customer,
                as: 'customer',
                attributes: ['id', 'customerName', 'customerCode', 'phone', 'email'],
                where: search ? {
                    [Op.or]: [
                        { customerName: { [Op.like]: `%${search}%` } },
                        { customerCode: { [Op.like]: `%${search}%` } },
                        { phone: { [Op.like]: `%${search}%` } }
                    ]
                } : undefined
            },
            {
                model: db.SalePayment,
                as: 'payments',
                required: false
            }
        ];

        const { count, rows } = await db.Sale.findAndCountAll({
            where,
            include,
            limit: parseInt(limit),
            offset,
            order: [['saleDate', 'DESC']]
        });

        // Calculate summary
        const summary = await db.Sale.findAll({
            where,
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalOutstanding'],
                [db.sequelize.fn('SUM', db.sequelize.col('paid_amount')), 'totalPaid'],
                [db.sequelize.fn('SUM', db.sequelize.col('credit_amount')), 'totalBalance'],
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
 * Get customer outstanding balance summary
 * GET /api/customer-payments/summary/:customerId
 */
exports.getCustomerOutstandingSummary = async (req, res, next) => {
    try {
        const { customerId } = req.params;

        // Get customer details
        const customer = await db.Customer.findByPk(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Build where clause
        const where = {
            customerId,
            saleStatus: 'completed',
            isDeleted: false
        };

        if (req.branchAccess && !req.branchAccess.canAccessAllBranches) {
            where.branchId = req.branchId;
        }

        // Get all sales summary by payment status
        const saleSummary = await db.Sale.findAll({
            where,
            attributes: [
                'paymentStatus',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount'],
                [db.sequelize.fn('SUM', db.sequelize.col('paid_amount')), 'paidAmount'],
                [db.sequelize.fn('SUM', db.sequelize.col('credit_amount')), 'creditAmount']
            ],
            group: ['paymentStatus'],
            raw: true
        });

        // Get pending/partial bills
        const outstandingBills = await db.Sale.findAll({
            where: {
                ...where,
                paymentStatus: { [Op.in]: ['pending', 'partial'] }
            },
            attributes: ['id', 'saleNumber', 'saleDate', 'totalAmount', 'paidAmount', 'creditAmount', 'paymentStatus'],
            order: [['saleDate', 'ASC']]
        });

        // Get recent payments
        const recentPayments = await db.SalePayment.findAll({
            where: {
                saleId: { [Op.in]: outstandingBills.map(s => s.id) }
            },
            limit: 10,
            order: [['paymentDate', 'DESC']],
            include: [{
                model: db.Sale,
                as: 'sale',
                attributes: ['saleNumber']
            }]
        });

        // Get credit history
        const creditHistory = await db.CustomerCredit.findAll({
            where: { customerId },
            limit: 10,
            order: [['createdAt', 'DESC']]
        });

        // Calculate totals
        let totalAmount = 0;
        let totalPaid = 0;
        let totalBalance = 0;
        const statusBreakdown = {};

        saleSummary.forEach(item => {
            statusBreakdown[item.paymentStatus] = {
                count: parseInt(item.count) || 0,
                totalAmount: parseFloat(item.totalAmount) || 0,
                paidAmount: parseFloat(item.paidAmount) || 0,
                creditAmount: parseFloat(item.creditAmount) || 0
            };
            totalAmount += parseFloat(item.totalAmount) || 0;
            totalPaid += parseFloat(item.paidAmount) || 0;
            totalBalance += parseFloat(item.creditAmount) || 0;
        });

        res.json({
            success: true,
            data: {
                customer: {
                    id: customer.id,
                    customerName: customer.customerName,
                    customerCode: customer.customerCode,
                    phone: customer.phone,
                    email: customer.email,
                    currentCredit: customer.currentCredit,
                    creditLimit: customer.creditLimit
                },
                summary: {
                    totalAmount,
                    totalPaid,
                    totalBalance,
                    currentCredit: parseFloat(customer.currentCredit) || 0,
                    creditLimit: parseFloat(customer.creditLimit) || 0,
                    availableCredit: parseFloat(customer.creditLimit) - parseFloat(customer.currentCredit) || 0,
                    statusBreakdown
                },
                outstandingBills,
                recentPayments,
                creditHistory
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Receive payment from customer (partial or full)
 * POST /api/customer-payments
 */
exports.receivePayment = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const {
            customerId,
            saleId,
            amount,
            paymentMethod = 'cash',
            referenceNumber,
            bankName,
            cardType,
            cardLastFour,
            notes
        } = req.body;

        // Validate customer exists
        const customer = await db.Customer.findByPk(customerId);
        if (!customer) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        let sale = null;
        let previousBalance = 0;
        let paymentsCreated = [];

        // If saleId provided, pay specific sale
        if (saleId) {
            sale = await db.Sale.findOne({
                where: { id: saleId, customerId },
                transaction
            });

            if (!sale) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Sale not found for this customer'
                });
            }

            if (sale.paymentStatus === 'paid') {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'This sale is already fully paid'
                });
            }

            previousBalance = parseFloat(sale.creditAmount);
            const newPaidAmount = parseFloat(sale.paidAmount) + parseFloat(amount);
            const newCreditAmount = Math.max(0, parseFloat(sale.totalAmount) - newPaidAmount);
            const newStatus = newCreditAmount <= 0 ? 'paid' : 'partial';

            await sale.update({
                paidAmount: newPaidAmount,
                creditAmount: newCreditAmount,
                paymentStatus: newStatus
            }, { transaction });

            // Create sale payment record
            const salePayment = await db.SalePayment.create({
                saleId: sale.id,
                amount,
                paymentMethod,
                referenceNumber,
                bankName,
                cardType,
                cardLastFour,
                notes,
                processedBy: req.user.id,
                totalAmount: sale.totalAmount,
                paidAmount: newPaidAmount,
                remainingAmount: newCreditAmount,
                paymentStatus: newStatus,
                branchId: getBranchId(req)
            }, { transaction });

            paymentsCreated.push(salePayment);

        } else {
            // Get total outstanding balance for customer
            const outstandingWhere = {
                customerId,
                saleStatus: 'completed',
                paymentStatus: { [Op.in]: ['pending', 'partial'] },
                isDeleted: false
            };

            const totalOutstanding = await db.Sale.sum('credit_amount', {
                where: outstandingWhere,
                transaction
            });

            previousBalance = parseFloat(totalOutstanding) || 0;

            // Apply payment to oldest sales first (FIFO)
            let remainingPayment = parseFloat(amount);
            const salesToUpdate = await db.Sale.findAll({
                where: outstandingWhere,
                order: [['saleDate', 'ASC']],
                transaction
            });

            for (const saleRecord of salesToUpdate) {
                if (remainingPayment <= 0) break;

                const saleBalance = parseFloat(saleRecord.creditAmount);
                const paymentForThisSale = Math.min(remainingPayment, saleBalance);

                const newPaidAmount = parseFloat(saleRecord.paidAmount) + paymentForThisSale;
                const newCreditAmount = Math.max(0, parseFloat(saleRecord.totalAmount) - newPaidAmount);
                const newStatus = newCreditAmount <= 0 ? 'paid' : 'partial';

                await saleRecord.update({
                    paidAmount: newPaidAmount,
                    creditAmount: newCreditAmount,
                    paymentStatus: newStatus
                }, { transaction });

                // Create sale payment record for each sale
                const salePayment = await db.SalePayment.create({
                    saleId: saleRecord.id,
                    amount: paymentForThisSale,
                    paymentMethod,
                    referenceNumber,
                    bankName,
                    cardType,
                    cardLastFour,
                    notes: notes ? `${notes} (Bulk payment)` : 'Bulk payment',
                    processedBy: req.user.id,
                    totalAmount: saleRecord.totalAmount,
                    paidAmount: newPaidAmount,
                    remainingAmount: newCreditAmount,
                    paymentStatus: newStatus,
                    branchId: getBranchId(req)
                }, { transaction });

                paymentsCreated.push(salePayment);
                remainingPayment -= paymentForThisSale;
            }
        }

        // Update customer credit
        const newCustomerCredit = Math.max(0, parseFloat(customer.currentCredit) - parseFloat(amount));
        await customer.update({ currentCredit: newCustomerCredit }, { transaction });

        // Create customer credit record
        await db.CustomerCredit.create({
            customerId,
            transactionType: 'payment_received',
            amount: parseFloat(amount),
            balanceAmount: newCustomerCredit,
            referenceType: 'payment',
            paymentMethod,
            paidDate: new Date(),
            status: 'paid',
            notes,
            performedBy: req.user.id,
            branchId: getBranchId(req)
        }, { transaction });

        await transaction.commit();

        // Calculate new balance
        const currentBalance = previousBalance - parseFloat(amount);

        res.status(201).json({
            success: true,
            message: 'Payment received successfully',
            data: {
                payments: paymentsCreated,
                summary: {
                    totalReceived: parseFloat(amount),
                    previousBalance,
                    currentBalance: Math.max(0, currentBalance),
                    customerNewCredit: newCustomerCredit,
                    salesPaid: paymentsCreated.length
                }
            }
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Get payment history for a customer
 * GET /api/customer-payments/history/:customerId
 */
exports.getPaymentHistory = async (req, res, next) => {
    try {
        const { customerId } = req.params;
        const { page = 1, limit = 10, startDate, endDate, paymentMethod } = req.query;
        const offset = (page - 1) * parseInt(limit);

        // Get customer's sales
        const salesWhere = { customerId, isDeleted: false };
        if (req.branchAccess && !req.branchAccess.canAccessAllBranches) {
            salesWhere.branchId = req.branchId;
        }

        const sales = await db.Sale.findAll({
            where: salesWhere,
            attributes: ['id']
        });
        const saleIds = sales.map(s => s.id);

        const where = { saleId: { [Op.in]: saleIds } };

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

        const { count, rows } = await db.SalePayment.findAndCountAll({
            where,
            include: [
                {
                    model: db.Sale,
                    as: 'sale',
                    attributes: ['id', 'saleNumber', 'saleDate', 'totalAmount']
                }
            ],
            limit: parseInt(limit),
            offset,
            order: [['paymentDate', 'DESC']]
        });

        // Get summary
        const summary = await db.SalePayment.findAll({
            where,
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalReceived'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'paymentCount']
            ],
            raw: true
        });

        res.json({
            success: true,
            data: rows,
            summary: {
                totalReceived: parseFloat(summary[0].totalReceived) || 0,
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
 * Get all customers with outstanding balance
 * GET /api/customer-payments/customers-with-balance
 */
exports.getCustomersWithBalance = async (req, res, next) => {
    try {
        const { search, minBalance, maxBalance, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * parseInt(limit);

        // Build customer where clause
        const customerWhere = { isDeleted: false, isActive: true };

        if (search) {
            customerWhere[Op.or] = [
                { customerName: { [Op.like]: `%${search}%` } },
                { customerCode: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } }
            ];
        }

        if (minBalance) {
            customerWhere.currentCredit = { [Op.gte]: parseFloat(minBalance) };
        }

        if (maxBalance) {
            customerWhere.currentCredit = {
                ...customerWhere.currentCredit,
                [Op.lte]: parseFloat(maxBalance)
            };
        }

        // Get customers with outstanding balance
        const { count, rows } = await db.Customer.findAndCountAll({
            where: {
                ...customerWhere,
                currentCredit: { [Op.gt]: 0 }
            },
            attributes: [
                'id',
                'customerName',
                'customerCode',
                'phone',
                'email',
                'currentCredit',
                'creditLimit',
                [db.sequelize.literal(`(
                    SELECT COUNT(s.id)
                    FROM sales s
                    WHERE s.customer_id = Customer.id
                    AND s.sale_status = 'completed'
                    AND s.payment_status IN ('pending', 'partial')
                    AND s.is_deleted = false
                )`), 'outstandingBillCount']
            ],
            order: [['currentCredit', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        // Get total summary
        const summary = await db.Customer.findAll({
            where: {
                isDeleted: false,
                isActive: true,
                currentCredit: { [Op.gt]: 0 }
            },
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('current_credit')), 'totalOutstanding'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'customerCount']
            ],
            raw: true
        });

        res.json({
            success: true,
            data: rows,
            summary: {
                totalOutstanding: parseFloat(summary[0].totalOutstanding) || 0,
                customerCount: parseInt(summary[0].customerCount) || 0
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
 * Get credit transactions for a customer
 * GET /api/customer-payments/credits/:customerId
 */
exports.getCreditTransactions = async (req, res, next) => {
    try {
        const { customerId } = req.params;
        const { page = 1, limit = 10, transactionType, startDate, endDate } = req.query;
        const offset = (page - 1) * parseInt(limit);

        const where = { customerId };

        if (transactionType) {
            where.transactionType = transactionType;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                where.createdAt[Op.lte] = endDateTime;
            }
        }

        const { count, rows } = await db.CustomerCredit.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset,
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: rows,
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
