const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Inventory = sequelize.define('Inventory', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'product_id'
        },
        grnId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'grn_id'
        },
        supplierId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'supplier_id'
        },
        supplierName: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'supplier_name'
        },
        supplierPhone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            field: 'supplier_phone'
        },
        referenceType: {
            type: DataTypes.ENUM('grn', 'sale', 'adjustment', 'transfer', 'return', 'damage', 'opening_stock', 'other', 'sale_return', 'supplier_return'),
            allowNull: false,
            defaultValue: 'other',
            field: 'reference_type'
        },
        batchNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'batch_number'
        },
        expiryDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'expiry_date'
        },
        locationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'location_id',
            comment: 'Storage location (warehouse, shelf, bin, etc.)'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id',
            comment: 'Branch where inventory is located'
        },
        quantity: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
            defaultValue: 0,
            field: 'quantity',
            comment: 'Positive for increase, negative for decrease. Supports decimals (e.g., 1.5 kg)'
        },
        unitCost: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            field: 'unit_cost'
        },
        sellingPrice: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            field: 'selling_price'
        },
        mrp: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            field: 'mrp',
            comment: 'Maximum Retail Price'
        },
        performedBy: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'performed_by'
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'inventory',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['product_id'] },
            { fields: ['supplier_id'] },
            { fields: ['grn_id'] },
            { fields: ['batch_number'] },
            { fields: ['reference_type'] },
            { fields: ['created_at'] }
        ]
    });

    return Inventory;
};
