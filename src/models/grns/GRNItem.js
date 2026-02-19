const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const GRNItem = sequelize.define('GRNItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        grnId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'grn_id'
        },
        poItemId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'po_item_id'
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'product_id'
        },
        quantityReceived: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
            field: 'quantity_received'
        },
        unitCost: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
            field: 'unit_cost'
        },
        sellingPrice: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
            field: 'selling_price'
        },
        mrp: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
            field: 'mrp',
            comment: 'Maximum Retail Price'
        },
        lineTotal: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.quantityReceived * this.unitCost;
            }
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
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
        locationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'location_id',
            comment: 'Storage location for the received item'
        },
    }, {
        tableName: 'grn_items',
         hooks: {
            beforeCreate: async (grnitem, options) => {
                // Auto-generate batch number if not provided
                if (!grnitem.batchNumber) {
                    const lastBatch = await GRNItem.findOne({
                        where: {
                            batchNumber: {
                                [sequelize.Sequelize.Op.like]: 'BCH-%'
                            }
                        },
                        order: [['createdAt', 'DESC']],
                        transaction: options.transaction
                    });

                    let newBatchNumber = 'BCH-0001';
                    if (lastBatch && lastBatch.batchNumber) {
                        const lastNum = parseInt(lastBatch.batchNumber.replace('BCH-', ''), 10);
                        const nextNum = lastNum + 1;
                        newBatchNumber = 'BCH-' + String(nextNum).padStart(4, '0');
                    }

                    grnitem.batchNumber = newBatchNumber;
                }
            }
        },
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['grn_id'] }
        ]
    },);

    return GRNItem;
};
