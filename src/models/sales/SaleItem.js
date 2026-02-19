const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SaleItem = sequelize.define('SaleItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        saleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'sale_id'
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
            comment: 'Product name at time of sale'
        },
        productCode: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'product_code',
            comment: 'Product code at time of sale'
        },
        quantity: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
            validate: {
                min: 0.001
            }
        },
        unit: {
            type: DataTypes.ENUM('kg', 'g', 'l', 'ml', 'pcs', 'bunch', 'doz', 'pack'),
            allowNull: false,
            defaultValue: 'pcs',
            comment: 'Unit of measurement'
        },
        unitPrice: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'unit_price',
            comment: 'Price per unit at time of sale'
        },
        unitCost: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
            field: 'unit_cost',
            comment: 'Cost per unit from inventory (for profit calculation)'
        },
        totalCost: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
            field: 'total_cost',
            comment: 'Total cost of goods sold (quantity * unitCost)'
        },
        profit: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
            comment: 'Profit amount (totalAmount - totalCost)'
        },
        profitMargin: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: 0,
            field: 'profit_margin',
            comment: 'Profit margin percentage ((profit / totalAmount) * 100)'
        },
        discountPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            field: 'discount_percentage'
        },
        discountAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'discount_amount'
        },
        // Tax fields per item
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
            field: 'tax_type',
            comment: 'How tax was calculated: percentage, fixed amount, or no tax'
        },
        subtotal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'quantity * unitPrice'
        },
        totalAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'total_amount',
            comment: 'Final amount after discount (Pre-tax)'
        },
        returnedQuantity: {
            type: DataTypes.DECIMAL(10, 3),
            defaultValue: 0,
            field: 'returned_quantity',
            comment: 'Quantity returned/refunded'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        promotionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'promotion_id',
            comment: 'ID of the promotion applied to this item'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        }
    }, {
        tableName: 'sale_items',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['sale_id'] },
            { fields: ['product_id'] }
        ]
    });

    return SaleItem;
};
