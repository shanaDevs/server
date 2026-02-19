// models/customers/CustomerRefundItem.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CustomerRefundItem = sequelize.define('CustomerRefundItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        refundId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'refund_id'
        },
        saleItemId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'sale_item_id',
            comment: 'Reference to original sale item'
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'product_id'
        },
        productName: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'product_name'
        },
        productCode: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'product_code'
        },
        quantity: {
            type: DataTypes.DECIMAL(18, 4),
            allowNull: false
        },
        unitPrice: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'unit_price'
        },
        refundAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'refund_amount'
        },
        taxPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: 0,
            field: 'tax_percentage'
        },
        taxAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
            field: 'tax_amount'
        },
        returnReason: {
            type: DataTypes.ENUM('defective', 'damaged', 'expired', 'wrong_item', 'not_satisfied', 'size_issue', 'quality_issue', 'other'),
            allowNull: true,
            field: 'return_reason'
        },
        expiryDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'expiry_date'
        },
        batchNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'batch_number'
        },
        restockable: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Whether the item can be added back to inventory'
        },
        restocked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether the item has been added back to inventory'
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
    }, {
        tableName: 'customer_refund_items',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['refund_id'] },
            { fields: ['product_id'] },
            { fields: ['sale_item_id'] },
            { fields: ['return_reason'] }
        ]
    });

    return CustomerRefundItem;
};
