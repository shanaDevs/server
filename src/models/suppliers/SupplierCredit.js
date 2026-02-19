const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SupplierCredit = sequelize.define('SupplierCredit', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        supplierId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'supplier_id'
        },
        transactionType: {
            type: DataTypes.ENUM('credit_issued', 'payment_made', 'credit_adjustment', 'grn_received'),
            allowNull: false,
            field: 'transaction_type'
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Positive for credit issued, negative for payments'
        },
        balanceAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'balance_amount',
            comment: 'Running balance after this transaction'
        },
        referenceType: {
            type: DataTypes.ENUM('grn', 'payment', 'adjustment', 'return', 'supplier_return'),
            allowNull: true,
            field: 'reference_type'
        },
        referenceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'reference_id',
            comment: 'ID of GRN, SupplierPayment, or other reference'
        },
        referenceNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'reference_number',
            comment: 'GRN number, payment number, etc.'
        },
        paymentMethod: {
            type: DataTypes.ENUM('cash', 'card', 'bank_transfer', 'cheque', 'mobile_money', 'other'),
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
        }
    }, {
        tableName: 'supplier_credits',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['supplier_id'] },
            { fields: ['transaction_type'] },
            { fields: ['reference_type'] },
            { fields: ['reference_id'] },
            { fields: ['status'] },
            { fields: ['due_date'] },
            { fields: ['created_at'] }
        ]
    });

    return SupplierCredit;
};
