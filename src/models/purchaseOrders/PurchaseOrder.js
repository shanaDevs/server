const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PurchaseOrder = sequelize.define('PurchaseOrder', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
    
        poNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            field: 'po_number'
        },
        supplierId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'supplier_id'
        },
        poDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            defaultValue: DataTypes.NOW,
            field: 'po_date'
        },
        expectedDeliveryDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'expected_delivery_date'
        },
        status: {
            type: DataTypes.ENUM('draft', 'sent', 'confirmed', 'partial', 'completed', 'cancelled'),
            defaultValue: 'draft',
            allowNull: false
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'created_by'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id',
            comment: 'Branch where purchase order was created'
        }
    }, {
        tableName: 'purchase_orders',
        hooks: {
            beforeCreate: async (purchaseOrder, options) => {
                if (!purchaseOrder.poNumber) {
                    const lastPO = await PurchaseOrder.findOne({
                        order: [['createdAt', 'DESC']],
                        transaction: options.transaction
                    });

                    let newCode = 'PO-0001';
                    if (lastPO && lastPO.poNumber) {
                        const lastNum = parseInt(lastPO.poNumber.replace('PO-', ''), 10);
                        const nextNum = lastNum + 1;
                        newCode = 'PO-' + String(nextNum).padStart(4, '0');
                    }

                    purchaseOrder.poNumber = newCode;
                }
            }
        },
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['po_number'] },
            { fields: ['status'] }
        ]
    });

    return PurchaseOrder;
};
