const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SupplierPayment = sequelize.define('SupplierPayment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        paymentNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            field: 'payment_number'
        },
        supplierId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'supplier_id'
        },
        grnId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'grn_id',
            comment: 'Optional - specific GRN being paid'
        },
        paymentDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'payment_date'
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            validate: {
                min: 0.01
            }
        },
        paymentMethod: {
            type: DataTypes.ENUM('cash', 'card', 'bank_transfer', 'cheque', 'mobile_money', 'other'),
            allowNull: false,
            defaultValue: 'cash',
            field: 'payment_method'
        },
        referenceNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'reference_number',
            comment: 'Cheque number, transaction ID, etc.'
        },
        bankName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'bank_name'
        },
        chequeNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'cheque_number'
        },
        chequeDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'cheque_date'
        },
        status: {
            type: DataTypes.ENUM('pending', 'completed', 'cancelled', 'bounced'),
            defaultValue: 'completed',
            allowNull: false
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // Running balance fields
        previousBalance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            field: 'previous_balance',
            comment: 'Balance before this payment'
        },
        currentBalance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            field: 'current_balance',
            comment: 'Balance after this payment'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'created_by'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
        counterSessionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'counter_session_id',
            comment: 'Counter session ID for POS tracking'
        }
    }, {
        tableName: 'supplier_payments',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['supplier_id'] },
            { fields: ['grn_id'] },
            { fields: ['payment_date'] },
            { fields: ['payment_number'] },
            { fields: ['status'] }
        ],
        hooks: {
            beforeCreate: async (payment, options) => {
                // Auto-generate payment number
                if (!payment.paymentNumber) {
                    const today = new Date();
                    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

                    const lastPayment = await SupplierPayment.findOne({
                        where: {
                            paymentNumber: {
                                [sequelize.Sequelize.Op.like]: `SUPPAY-${dateStr}-%`
                            }
                        },
                        order: [['id', 'DESC']],
                        transaction: options.transaction
                    });

                    let sequence = 1;
                    if (lastPayment && lastPayment.paymentNumber) {
                        const lastSequence = parseInt(lastPayment.paymentNumber.split('-')[2]);
                        if (!isNaN(lastSequence)) {
                            sequence = lastSequence + 1;
                        }
                    }

                    payment.paymentNumber = `SUPPAY-${dateStr}-${String(sequence).padStart(5, '0')}`;
                }
            }
        }
    });

    return SupplierPayment;
};
