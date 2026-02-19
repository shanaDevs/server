const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CustomerReturnPayment = sequelize.define('CustomerReturnPayment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        customerReturnId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'customer_return_id'
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'customer_id'
        },
        paymentNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'payment_number'
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        paymentMethod: {
            type: DataTypes.ENUM('cash', 'bank_transfer', 'cheque', 'credit_note', 'store_credit', 'adjustment', 'other'),
            allowNull: false,
            defaultValue: 'credit_note',
            field: 'payment_method'
        },
        paymentDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'payment_date'
        },
        referenceNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'reference_number'
        },
        bankName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'bank_name'
        },
        chequeNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'cheque_number'
        },
        chequeDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'cheque_date'
        },
        status: {
            type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        processedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'processed_by'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        }
    }, {
        tableName: 'customer_return_payments',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['customer_return_id'] },
            { fields: ['customer_id'] },
            { fields: ['payment_date'] },
            { fields: ['status'] }
        ]
    });

    return CustomerReturnPayment;
};
