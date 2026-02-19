const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Product = sequelize.define('Product', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        productCode: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true
        },
        images: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Array of product image URLs'
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        categoryId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        unitOfMeasure: {
            type: DataTypes.ENUM('kg', 'g', 'l', 'ml', 'pcs', 'bunch', 'doz', 'pack'),
            allowNull: true,
            defaultValue: 'pcs',
            field: 'unit_of_measure'
        },
        costPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        minStockLevel: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        supplierId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'supplier_id'
        },
        brandId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'brand_id'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id',
            comment: 'Branch where product is available'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        // Tax configuration per product
        isTaxable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_taxable',
            comment: 'Whether tax applies to this product'
        },
        taxRate: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            field: 'tax_rate',
            comment: 'Product-specific tax rate (overrides system default if set)'
        },
        taxType: {
            type: DataTypes.ENUM('percentage', 'fixed', 'system_default'),
            defaultValue: 'system_default',
            field: 'tax_type',
            comment: 'Tax type: percentage, fixed amount, or use system default'
        },
    }, {
        tableName: 'products',
        timestamps: true
    });

    return Product;
};
