const db = require('../../models');
const { Expense, User } = db;
const { Op } = require('sequelize');

class ExpenseService {
    /**
     * Get all expenses with filters and pagination
     */
    async getAllExpenses(filters, pagination, branchConfig) {
        const { 
            category, 
            paymentStatus, 
            paymentMethod,
            startDate, 
            endDate,
            vendor,
            search,
            isRecurring
        } = filters;
        const { limit, offset } = pagination;
        const { branchId, branchAccess } = branchConfig;

        const where = { isDeleted: false };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        // Apply filters
        if (category) {
            where.category = category;
        }

        if (paymentStatus) {
            where.paymentStatus = paymentStatus;
        }

        if (paymentMethod) {
            where.paymentMethod = paymentMethod;
        }

        if (isRecurring !== undefined) {
            where.isRecurring = isRecurring === 'true';
        }

        if (vendor) {
            where.vendor = { [Op.like]: `%${vendor}%` };
        }

        // Search in title, description, vendor, invoice number
        if (search) {
            where[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } },
                { vendor: { [Op.like]: `%${search}%` } },
                { invoiceNumber: { [Op.like]: `%${search}%` } },
                { expenseCode: { [Op.like]: `%${search}%` } }
            ];
        }

        // Date range filter
        if (startDate && endDate) {
            where.expenseDate = {
                [Op.between]: [startDate, endDate]
            };
        } else if (startDate) {
            where.expenseDate = {
                [Op.gte]: startDate
            };
        } else if (endDate) {
            where.expenseDate = {
                [Op.lte]: endDate
            };
        }

        return await Expense.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'userName'],
                    required: false
                }
            ],
            limit,
            offset,
            order: [['expenseDate', 'DESC'], ['createdAt', 'DESC']]
        });
    }

    /**
     * Get expense by ID
     */
    async getExpenseById(id, branchConfig) {
        const where = { id, isDeleted: false };
        const { branchId, branchAccess } = branchConfig;

        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await Expense.findOne({
            where,
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'userName']
                },
                {
                    model: User,
                    as: 'updater',
                    attributes: ['id', 'userName'],
                    required: false
                }
            ]
        });
    }

    /**
     * Create new expense
     */
    async createExpense(data, transaction) {
        // Validate amount
        if (!data.amount || data.amount <= 0) {
            throw new Error('Expense amount must be greater than 0');
        }

        // Validate expense date
        if (!data.expenseDate) {
            data.expenseDate = new Date();
        }

        // Set paidAmount based on payment status
        if (data.paymentStatus === 'PAID' && !data.paidAmount) {
            data.paidAmount = data.amount;
        } else if (data.paymentStatus === 'PENDING') {
            data.paidAmount = 0;
        } else if (data.paymentStatus === 'PARTIAL' && !data.paidAmount) {
            throw new Error('Paid amount is required for partial payments');
        }

        // Validate partial payment
        if (data.paymentStatus === 'PARTIAL' && data.paidAmount >= data.amount) {
            throw new Error('Paid amount must be less than total amount for partial payments');
        }

        // Handle recurring expense
        if (data.isRecurring && data.recurringFrequency) {
            data.nextRecurringDate = this._calculateNextRecurringDate(
                data.expenseDate,
                data.recurringFrequency
            );
        }

        return await Expense.create(data, { transaction });
    }

    /**
     * Update expense
     */
    async updateExpense(id, data, branchConfig, transaction) {
        const expense = await this.getExpenseById(id, branchConfig);

        if (!expense) {
            throw new Error('Expense not found');
        }

        // Validate amount if provided
        if (data.amount !== undefined && data.amount <= 0) {
            throw new Error('Expense amount must be greater than 0');
        }

        // Validate partial payment
        const amount = data.amount || expense.amount;
        if (data.paymentStatus === 'PARTIAL') {
            if (!data.paidAmount && !expense.paidAmount) {
                throw new Error('Paid amount is required for partial payments');
            }
            const paidAmount = data.paidAmount || expense.paidAmount;
            if (paidAmount >= amount) {
                throw new Error('Paid amount must be less than total amount for partial payments');
            }
        }

        // Update recurring date if frequency changed
        if (data.isRecurring && data.recurringFrequency) {
            const expenseDate = data.expenseDate || expense.expenseDate;
            data.nextRecurringDate = this._calculateNextRecurringDate(
                expenseDate,
                data.recurringFrequency
            );
        }

        await expense.update(data, { transaction });
        return expense;
    }

    /**
     * Delete expense (soft delete)
     */
    async deleteExpense(id, branchConfig, transaction) {
        const expense = await this.getExpenseById(id, branchConfig);

        if (!expense) {
            throw new Error('Expense not found');
        }

        await expense.update({ isDeleted: true }, { transaction });
        return expense;
    }

    /**
     * Get expense statistics
     */
    async getExpenseStatistics(filters, branchConfig) {
        const { startDate, endDate, category } = filters;
        const { branchId, branchAccess } = branchConfig;

        const where = { isDeleted: false };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        // Date range filter
        if (startDate && endDate) {
            where.expenseDate = {
                [Op.between]: [startDate, endDate]
            };
        }

        if (category) {
            where.category = category;
        }

        // Total expenses
        const totalStats = await Expense.findOne({
            where,
            attributes: [
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalCount'],
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalAmount'],
                [db.sequelize.fn('SUM', db.sequelize.col('paid_amount')), 'totalPaid']
            ],
            raw: true
        });

        // By payment status
        const byPaymentStatus = await Expense.findAll({
            where,
            attributes: [
                'paymentStatus',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
            ],
            group: ['paymentStatus'],
            raw: true
        });

        // By category
        const byCategory = await Expense.findAll({
            where,
            attributes: [
                'category',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
            ],
            group: ['category'],
            order: [[db.sequelize.fn('SUM', db.sequelize.col('amount')), 'DESC']],
            raw: true
        });

        // By payment method
        const byPaymentMethod = await Expense.findAll({
            where,
            attributes: [
                'paymentMethod',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
            ],
            group: ['paymentMethod'],
            raw: true
        });

        return {
            total: {
                count: parseInt(totalStats.totalCount) || 0,
                amount: parseFloat(totalStats.totalAmount) || 0,
                paid: parseFloat(totalStats.totalPaid) || 0,
                pending: (parseFloat(totalStats.totalAmount) || 0) - (parseFloat(totalStats.totalPaid) || 0)
            },
            byPaymentStatus,
            byCategory,
            byPaymentMethod
        };
    }

    /**
     * Get expenses by category
     */
    async getExpensesByCategory(category, filters, pagination, branchConfig) {
        return await this.getAllExpenses(
            { ...filters, category },
            pagination,
            branchConfig
        );
    }

    /**
     * Get pending expenses
     */
    async getPendingExpenses(pagination, branchConfig) {
        return await this.getAllExpenses(
            { paymentStatus: 'PENDING' },
            pagination,
            branchConfig
        );
    }

    /**
     * Mark expense as paid
     */
    async markAsPaid(id, paymentData, branchConfig, transaction) {
        const expense = await this.getExpenseById(id, branchConfig);

        if (!expense) {
            throw new Error('Expense not found');
        }

        if (expense.paymentStatus === 'PAID') {
            throw new Error('Expense is already marked as paid');
        }

        const updateData = {
            paymentStatus: 'PAID',
            paidAmount: expense.amount,
            paymentMethod: paymentData.paymentMethod || expense.paymentMethod,
            notes: paymentData.notes || expense.notes,
            updatedBy: paymentData.updatedBy
        };

        await expense.update(updateData, { transaction });
        return expense;
    }

    /**
     * Record partial payment
     */
    async recordPartialPayment(id, paymentData, branchConfig, transaction) {
        const expense = await this.getExpenseById(id, branchConfig);

        if (!expense) {
            throw new Error('Expense not found');
        }

        if (expense.paymentStatus === 'PAID') {
            throw new Error('Expense is already fully paid');
        }

        if (!paymentData.amount || paymentData.amount <= 0) {
            throw new Error('Payment amount must be greater than 0');
        }

        const currentPaid = parseFloat(expense.paidAmount) || 0;
        const newPaidAmount = currentPaid + parseFloat(paymentData.amount);

        if (newPaidAmount > parseFloat(expense.amount)) {
            throw new Error('Payment amount exceeds remaining balance');
        }

        const updateData = {
            paidAmount: newPaidAmount,
            paymentStatus: newPaidAmount >= parseFloat(expense.amount) ? 'PAID' : 'PARTIAL',
            paymentMethod: paymentData.paymentMethod || expense.paymentMethod,
            updatedBy: paymentData.updatedBy
        };

        await expense.update(updateData, { transaction });
        return expense;
    }

    /**
     * Get recurring expenses due
     */
    async getRecurringExpensesDue(branchConfig) {
        const where = {
            isDeleted: false,
            isRecurring: true,
            nextRecurringDate: {
                [Op.lte]: new Date()
            }
        };

        const { branchId, branchAccess } = branchConfig;

        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await Expense.findAll({
            where,
            order: [['nextRecurringDate', 'ASC']]
        });
    }

    /**
     * Calculate next recurring date
     */
    _calculateNextRecurringDate(currentDate, frequency) {
        const date = new Date(currentDate);

        switch (frequency) {
            case 'DAILY':
                date.setDate(date.getDate() + 1);
                break;
            case 'WEEKLY':
                date.setDate(date.getDate() + 7);
                break;
            case 'MONTHLY':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'QUARTERLY':
                date.setMonth(date.getMonth() + 3);
                break;
            case 'YEARLY':
                date.setFullYear(date.getFullYear() + 1);
                break;
            default:
                return null;
        }

        return date;
    }
}

module.exports = new ExpenseService();
