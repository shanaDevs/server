const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Expense = sequelize.define('Expense', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        expenseCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            field: 'expense_code',
            comment: 'Unique expense code (e.g., EXP-0001)'
        },
        category: {
            type: DataTypes.ENUM(
                'UTILITIES',           // Electricity, water, internet, phone
                'RENT',                // Shop/office rent
                'SALARIES',            // Employee salaries
                'SUPPLIES',            // Office supplies, cleaning supplies
                'MAINTENANCE',         // Repairs, maintenance
                'MARKETING',           // Advertising, promotions
                'TRANSPORTATION',      // Fuel, vehicle maintenance, delivery
                'INSURANCE',           // Business insurance
                'TAXES',               // Business taxes, fees
                'EQUIPMENT',           // Equipment purchase/lease
                'INVENTORY',           // Stock purchases (if not tracked separately)
                'PROFESSIONAL_FEES',   // Accounting, legal fees
                'MISCELLANEOUS',       // Other expenses
                'OTHER'
            ),
            allowNull: false,
            defaultValue: 'MISCELLANEOUS',
            comment: 'Expense category'
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'Expense title/name'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Detailed description of the expense'
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Expense amount'
        },
        expenseDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'expense_date',
            comment: 'Date when expense occurred'
        },
        paymentMethod: {
            type: DataTypes.ENUM('CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'OTHER'),
            allowNull: false,
            defaultValue: 'CASH',
            field: 'payment_method',
            comment: 'How the expense was paid'
        },
        paymentStatus: {
            type: DataTypes.ENUM('PAID', 'PENDING', 'PARTIAL', 'CANCELLED'),
            allowNull: false,
            defaultValue: 'PAID',
            field: 'payment_status',
            comment: 'Payment status of the expense'
        },
        paidAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
            field: 'paid_amount',
            comment: 'Amount already paid (for partial payments)'
        },
        vendor: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Vendor/supplier name'
        },
        vendorContact: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'vendor_contact',
            comment: 'Vendor contact information'
        },
        invoiceNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'invoice_number',
            comment: 'Vendor invoice number'
        },
        receiptUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'receipt_url',
            comment: 'URL/path to receipt/invoice image'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Additional notes'
        },
        isRecurring: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_recurring',
            comment: 'Whether this is a recurring expense'
        },
        recurringFrequency: {
            type: DataTypes.ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'),
            allowNull: true,
            field: 'recurring_frequency',
            comment: 'Frequency of recurring expense'
        },
        nextRecurringDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'next_recurring_date',
            comment: 'Next date for recurring expense'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'created_by',
            comment: 'User ID who created this expense'
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'updated_by',
            comment: 'User ID who last updated this expense'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id',
            comment: 'Branch where expense occurred'
        },
        counterSessionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'counter_session_id',
            comment: 'Counter session ID for POS tracking'
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_deleted',
            comment: 'Soft delete flag'
        }
    }, {
        tableName: 'expenses',
        timestamps: true,
        underscored: true,
        hooks: {
            beforeCreate: async (expense, options) => {
                // Generate expense code if not provided
                if (!expense.expenseCode) {
                    const lastExpense = await Expense.findOne({
                        order: [['createdAt', 'DESC']],
                        transaction: options.transaction
                    });

                    let newCode = 'EXP-0001';
                    if (lastExpense && lastExpense.expenseCode) {
                        const lastNum = parseInt(lastExpense.expenseCode.replace('EXP-', ''), 10);
                        const nextNum = lastNum + 1;
                        newCode = 'EXP-' + String(nextNum).padStart(4, '0');
                    }

                    expense.expenseCode = newCode;
                }

                // Set paidAmount to amount if payment status is PAID and paidAmount not set
                if (expense.paymentStatus === 'PAID' && !expense.paidAmount) {
                    expense.paidAmount = expense.amount;
                }
            },
            beforeUpdate: async (expense, options) => {
                // Update paidAmount based on payment status
                if (expense.changed('paymentStatus')) {
                    if (expense.paymentStatus === 'PAID' && !expense.paidAmount) {
                        expense.paidAmount = expense.amount;
                    } else if (expense.paymentStatus === 'PENDING') {
                        expense.paidAmount = 0;
                    }
                }
            }
        },
        indexes: [
            { fields: ['expense_code'] },
            { fields: ['category'] },
            { fields: ['expense_date'] },
            { fields: ['payment_status'] },
            { fields: ['branch_id'] },
            { fields: ['is_deleted'] },
            { fields: ['created_by'] }
        ]
    });

    return Expense;
};
