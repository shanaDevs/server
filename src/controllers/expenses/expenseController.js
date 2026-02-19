const expenseService = require('../../services/expenses/expenseService');
const { validationResult } = require('express-validator');
const db = require('../../models');
const { requireBranchId, addBranchId, getBranchId } = require('../../utils/branchHelper');

// Helper to extract branch config from request
const getBranchConfig = (req) => ({
    branchId: getBranchId(req),
    branchAccess: req.branchAccess
});

/**
 * Get all expenses with filters
 */
exports.getAllExpenses = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            paymentStatus,
            paymentMethod,
            startDate,
            endDate,
            vendor,
            search,
            isRecurring
        } = req.query;

        const offset = (page - 1) * limit;

        const filters = {
            category,
            paymentStatus,
            paymentMethod,
            startDate,
            endDate,
            vendor,
            search,
            isRecurring
        };

        const pagination = {
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        const result = await expenseService.getAllExpenses(
            filters,
            pagination,
            getBranchConfig(req)
        );

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: result.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(result.count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get expense by ID
 */
exports.getExpenseById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const expense = await expenseService.getExpenseById(id, getBranchConfig(req));

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found'
            });
        }

        res.json({
            success: true,
            data: expense
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create new expense
 */
exports.createExpense = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const expenseData = {
            ...req.body,
            createdBy: req.user?.id
        };
        addBranchId(expenseData, req);

        // Check for active counter session and link it
        const activeSession = await db.CounterSession.findOne({
            where: {
                userId: req.user?.id,
                branchId: expenseData.branchId,
                status: 'OPEN'
            },
            transaction
        });

        if (activeSession) {
            expenseData.counterSessionId = activeSession.id;
        }

        const expense = await expenseService.createExpense(expenseData, transaction);

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Expense created successfully',
            data: expense
        });
    } catch (error) {
        await transaction.rollback();

        if (error.message.includes('must be') || error.message.includes('required')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        next(error);
    }
};

/**
 * Update expense
 */
exports.updateExpense = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { id } = req.params;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const updateData = {
            ...req.body,
            updatedBy: req.user?.id
        };

        const expense = await expenseService.updateExpense(
            id,
            updateData,
            getBranchConfig(req),
            transaction
        );

        await transaction.commit();

        res.json({
            success: true,
            message: 'Expense updated successfully',
            data: expense
        });
    } catch (error) {
        await transaction.rollback();

        if (error.message === 'Expense not found') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message.includes('must be') || error.message.includes('required')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        next(error);
    }
};

/**
 * Delete expense
 */
exports.deleteExpense = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { id } = req.params;

        await expenseService.deleteExpense(id, getBranchConfig(req), transaction);

        await transaction.commit();

        res.json({
            success: true,
            message: 'Expense deleted successfully'
        });
    } catch (error) {
        await transaction.rollback();

        if (error.message === 'Expense not found') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        next(error);
    }
};

/**
 * Get expense statistics
 */
exports.getExpenseStatistics = async (req, res, next) => {
    try {
        const { startDate, endDate, category } = req.query;

        const filters = { startDate, endDate, category };

        const statistics = await expenseService.getExpenseStatistics(
            filters,
            getBranchConfig(req)
        );

        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get expenses by category
 */
exports.getExpensesByCategory = async (req, res, next) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 10, startDate, endDate } = req.query;

        const offset = (page - 1) * limit;

        const filters = { startDate, endDate };
        const pagination = {
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        const result = await expenseService.getExpensesByCategory(
            category,
            filters,
            pagination,
            getBranchConfig(req)
        );

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: result.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(result.count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get pending expenses
 */
exports.getPendingExpenses = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const pagination = {
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        const result = await expenseService.getPendingExpenses(
            pagination,
            getBranchConfig(req)
        );

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: result.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(result.count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark expense as paid
 */
exports.markAsPaid = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { id } = req.params;
        const { paymentMethod, notes } = req.body;

        const paymentData = {
            paymentMethod,
            notes,
            updatedBy: req.user?.id
        };

        const expense = await expenseService.markAsPaid(
            id,
            paymentData,
            getBranchConfig(req),
            transaction
        );

        await transaction.commit();

        res.json({
            success: true,
            message: 'Expense marked as paid successfully',
            data: expense
        });
    } catch (error) {
        await transaction.rollback();

        if (error.message === 'Expense not found') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message.includes('already')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        next(error);
    }
};

/**
 * Record partial payment
 */
exports.recordPartialPayment = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { id } = req.params;
        const { amount, paymentMethod } = req.body;

        if (!amount || amount <= 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Payment amount must be greater than 0'
            });
        }

        const paymentData = {
            amount: parseFloat(amount),
            paymentMethod,
            updatedBy: req.user?.id
        };

        const expense = await expenseService.recordPartialPayment(
            id,
            paymentData,
            getBranchConfig(req),
            transaction
        );

        await transaction.commit();

        res.json({
            success: true,
            message: 'Partial payment recorded successfully',
            data: expense
        });
    } catch (error) {
        await transaction.rollback();

        if (error.message === 'Expense not found') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message.includes('exceeds') ||
            error.message.includes('already') ||
            error.message.includes('must be')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        next(error);
    }
};

/**
 * Get recurring expenses due
 */
exports.getRecurringExpensesDue = async (req, res, next) => {
    try {
        const expenses = await expenseService.getRecurringExpensesDue(
            getBranchConfig(req)
        );

        res.json({
            success: true,
            data: expenses,
            count: expenses.length
        });
    } catch (error) {
        next(error);
    }
};
