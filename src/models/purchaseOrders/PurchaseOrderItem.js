const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        poId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'po_id'
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'product_id'
        },
        quantityOrdered: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
            field: 'quantity_ordered'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
    }, {
        tableName: 'purchase_order_items',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['po_id'] }
        ]
    });

    return PurchaseOrderItem;
};
