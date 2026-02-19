const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SaleReturnItem = sequelize.define('SaleReturnItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        saleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'sale_id',
            comment: 'Reference to the sale this return belongs to'
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'product_id'
        },
        productName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'product_name',
            comment: 'Product name at time of return'
        },
        quantity: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
            defaultValue: 0,
            comment: 'Quantity returned'
        },
        unitPrice: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'unit_price',
            comment: 'Price per unit at time of original sale'
        },
        discountAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'discount_amount',
            comment: 'Discount amount for this return item'
        },
        discountPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            field: 'discount_percentage'
        },
        totalAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'total_amount',
            comment: 'Total return amount (pre-tax) (quantity * unitPrice - discount)'
        },
        taxPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            field: 'tax_percentage',
            comment: 'Tax percentage applied to this item'
        },
        taxAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'tax_amount',
            comment: 'Tax amount calculated for this item'
        },
        taxType: {
            type: DataTypes.ENUM('percentage', 'fixed', 'none'),
            defaultValue: 'none',
            field: 'tax_type'
        },
        returnReason: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'return_reason'
        },
        condition: {
            type: DataTypes.ENUM('good', 'damaged', 'defective', 'expired'),
            defaultValue: 'good',
            comment: 'Condition of returned item'
        }
    }, {
        tableName: 'sale_return_items',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['sale_id'] },
            { fields: ['product_id'] }
        ]
    });

    return SaleReturnItem;
};
