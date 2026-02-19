const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const HeldBill = sequelize.define('HeldBill', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        holdNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            field: 'hold_number'
        },
        holdName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'hold_name',
            comment: 'Custom name for the held bill (e.g., customer name, table number)'
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'customer_id',
            comment: 'Optional customer ID'
        },
        items: {
            type: DataTypes.JSON,
            allowNull: false,
            comment: 'Array of cart items with productId, quantity, unitPrice, discount'
        },
        returnItems: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'return_items',
            comment: 'Array of return items'
        },
        subtotal: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Calculated subtotal of items'
        },
        discountAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'discount_amount'
        },
        discountPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            field: 'discount_percentage'
        },
        taxRate: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            field: 'tax_rate'
        },
        taxAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'tax_amount'
        },
        totalAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'total_amount'
        },
        saleType: {
            type: DataTypes.ENUM('retail', 'wholesale', 'online', 'phone_order'),
            defaultValue: 'retail',
            field: 'sale_type'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('held', 'loaded', 'expired', 'completed', 'cancelled'),
            defaultValue: 'held',
            allowNull: false
        },
        holdDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'hold_date'
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'expires_at',
            comment: 'Auto-expire held bills after certain time'
        },
        loadedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'loaded_at'
        },
        completedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'completed_at'
        },
        completedSaleId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'completed_sale_id',
            comment: 'Sale ID when bill is completed'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'created_by'
        },
        loadedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'loaded_by'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
        counterSessionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'counter_session_id'
        }
    }, {
        tableName: 'held_bills',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['hold_number'] },
            { fields: ['status'] },
            { fields: ['branch_id'] },
            { fields: ['created_by'] },
            { fields: ['hold_date'] },
            { fields: ['customer_id'] }
        ],
        hooks: {
            beforeCreate: async (bill, options) => {
                // Auto-generate hold number
                if (!bill.holdNumber) {
                    const today = new Date();
                    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

                    const lastBill = await HeldBill.findOne({
                        where: {
                            holdNumber: {
                                [sequelize.Sequelize.Op.like]: `HOLD-${dateStr}-%`
                            }
                        },
                        order: [['id', 'DESC']],
                        transaction: options.transaction
                    });

                    let sequence = 1;
                    if (lastBill && lastBill.holdNumber) {
                        const lastSequence = parseInt(lastBill.holdNumber.split('-')[2]);
                        if (!isNaN(lastSequence)) {
                            sequence = lastSequence + 1;
                        }
                    }

                    bill.holdNumber = `HOLD-${dateStr}-${String(sequence).padStart(5, '0')}`;
                }

                // Set expiry date (24 hours from now by default)
                if (!bill.expiresAt) {
                    const expiry = new Date();
                    expiry.setHours(expiry.getHours() + 24);
                    bill.expiresAt = expiry;
                }
            }
        }
    });

    return HeldBill;
};
