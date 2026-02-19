const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CustomerCredit = sequelize.define('CustomerCredit', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'customer_id'
        },
        transactionType: {
            type: DataTypes.ENUM('credit_issued', 'payment_received', 'credit_adjustment'),
            allowNull: false,
            field: 'transaction_type'
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        balanceAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'balance_amount'
        },
        referenceType: {
            type: DataTypes.ENUM('sale', 'payment', 'adjustment', 'refund', 'sale_return'),
            allowNull: true,
            field: 'reference_type'
        },
        paymentMethod: {
            type: DataTypes.ENUM('cash', 'card', 'bank_transfer', 'mobile_money', 'cheque', 'other'),
            allowNull: true,
            field: 'payment_method'
        },
        dueDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'due_date'
        },
        paidDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'paid_date'
        },
        status: {
            type: DataTypes.ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled'),
            defaultValue: 'pending',
            allowNull: false
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        performedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'performed_by'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
        counterSessionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'counter_session_id',
            comment: 'Counter session ID for POS tracking'
        },
    }, {
        tableName: 'customer_credits',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['customer_id'] },
            { fields: ['transaction_type'] },
            { fields: ['status'] },
            { fields: ['due_date'] },
            { fields: ['created_at'] }
        ]
    });

    return CustomerCredit;
};
