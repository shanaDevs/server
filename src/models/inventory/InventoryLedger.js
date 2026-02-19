const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const InventoryLedger = sequelize.define('InventoryLedger', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'company_id'
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'product_id'
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
        locationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'location_id'
        },
        grnId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'grn_id'
        },
        referenceType: {
            type: DataTypes.ENUM('grn', 'sale', 'adjustment', 'transfer', 'return', 'damage', 'other', 'opening_stock', 'sale_return', 'supplier_return'),
            allowNull: false,
            field: 'reference_type'
        },
        referenceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'reference_id'
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
        transactionType: {
            type: DataTypes.ENUM('in', 'out'),
            allowNull: false,
            field: 'transaction_type'
        },
        quantityIn: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'quantity_in'
        },
        quantityOut: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'quantity_out'
        },
        balanceQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'balance_quantity'
        },
        unitCost: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'unit_cost'
        },
        totalValue: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'total_value'
        },
        performedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'performed_by'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        transactionDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'transaction_date'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
    }, {
        tableName: 'inventory_ledger',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['product_id'] },
            { fields: ['supplier_id'] },
            { fields: ['location_id'] },
            { fields: ['grn_id'] },
            { fields: ['transaction_date'] },
            { fields: ['reference_type', 'reference_id'] }
        ]
    });

    return InventoryLedger;
};
