const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SupplierReturnPayment = sequelize.define('SupplierReturnPayment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        supplierReturnId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'supplier_return_id'
        },
        supplierId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'supplier_id'
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
            type: DataTypes.ENUM('cash', 'bank_transfer', 'cheque', 'credit_note', 'adjustment', 'other'),
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
            type: DataTypes.ENUM('pending', 'received', 'cancelled'),
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
        tableName: 'supplier_return_payments',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['supplier_return_id'] },
            { fields: ['supplier_id'] },
            { fields: ['payment_date'] },
            { fields: ['status'] }
        ]
    });

    return SupplierReturnPayment;
};
