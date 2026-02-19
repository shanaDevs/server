const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const GRN = sequelize.define('GRN', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        grnNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            field: 'grn_number'
        },
        poId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'po_id'
        },
        supplierId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'supplier_id'
        },
        grnDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'grn_date'
        },
        receivedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'received_by'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'created_by'
        },
        status: {
            type: DataTypes.ENUM('draft', 'received', 'verified', 'approved', 'rejected'),
            defaultValue: 'draft',
            allowNull: false
        },
        totalQuantity: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'total_quantity'
        },
        totalAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'total_amount'
        },
        inspectionNotes: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'inspection_notes'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id',
            comment: 'Branch where goods were received'
        },
        paidAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'paid_amount',
            comment: 'Amount paid towards this GRN'
        },
        balanceAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'balance_amount',
            comment: 'Remaining balance amount'
        },
        paymentStatus: {
            type: DataTypes.ENUM('paid', 'partial', 'pending', 'overpaid'),
            defaultValue: 'pending',
            allowNull: false,
            field: 'payment_status',
            comment: 'Payment status of the GRN'
        }
    }, {
        tableName: 'grns',
        hooks: {
            beforeCreate: async (grn, options) => {
                // Auto-generate GRN number
                if (!grn.grnNumber) {
                    const lastGRN = await GRN.findOne({
                        order: [['createdAt', 'DESC']],
                        transaction: options.transaction
                    });

                    let newCode = 'GRN-000001';
                    if (lastGRN && lastGRN.grnNumber) {
                        const lastNum = parseInt(lastGRN.grnNumber.replace('GRN-', ''), 10);
                        const nextNum = lastNum + 1;
                        newCode = 'GRN-' + String(nextNum).padStart(6, '0');
                    }

                    grn.grnNumber = newCode;
                }

                // Auto-calculate payment fields on create
                GRN.calculatePaymentFields(grn);
            },
            beforeUpdate: async (grn, options) => {
                // Auto-calculate payment fields on update
                // Only recalculate if totalAmount or paidAmount changed
                if (grn.changed('totalAmount') || grn.changed('paidAmount')) {
                    GRN.calculatePaymentFields(grn);
                }
            }
        },
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['grn_number'] },
            { fields: ['grn_date'] },
            { fields: ['payment_status'] }
        ]
    });

    /**
     * Static method to calculate payment fields automatically
     * @param {Object} grn - GRN instance
     */
    GRN.calculatePaymentFields = function(grn) {
        const totalAmount = parseFloat(grn.totalAmount || 0);
        const paidAmount = parseFloat(grn.paidAmount || 0);
        
        // Calculate balance
        const balance = totalAmount - paidAmount;
        grn.balanceAmount = Math.abs(balance);
        
        // Determine payment status
        if (totalAmount === 0) {
            grn.paymentStatus = 'pending';
        } else if (balance === 0 && paidAmount > 0) {
            grn.paymentStatus = 'paid';
        } else if (balance < 0) {
            grn.paymentStatus = 'overpaid';
        } else if (paidAmount > 0 && balance > 0) {
            grn.paymentStatus = 'partial';
        } else {
            grn.paymentStatus = 'pending';
        }
    };

    /**
     * Instance method to update payment
     * @param {Number} paymentAmount - Amount to add to paid amount
     */
    GRN.prototype.addPayment = async function(paymentAmount) {
        const newPaidAmount = parseFloat(this.paidAmount || 0) + parseFloat(paymentAmount);
        await this.update({ paidAmount: newPaidAmount });
        return this;
    };

    /**
     * Instance method to get payment details
     */
    GRN.prototype.getPaymentDetails = function() {
        return {
            totalAmount: parseFloat(this.totalAmount || 0),
            paidAmount: parseFloat(this.paidAmount || 0),
            balanceAmount: parseFloat(this.balanceAmount || 0),
            paymentStatus: this.paymentStatus,
            isFullyPaid: this.paymentStatus === 'paid',
            isPartiallyPaid: this.paymentStatus === 'partial',
            isPending: this.paymentStatus === 'pending',
            isOverpaid: this.paymentStatus === 'overpaid'
        };
    };

    return GRN;
};
