const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Sale = sequelize.define('Sale', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        saleNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            field: 'sale_number'
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'customer_id',
            comment: 'NULL for walk-in customers'
        },
        saleDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'sale_date'
        },
        subtotal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
            comment: 'Sum of all items before discounts and tax'
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
        taxAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'tax_amount'
        },
        taxPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            field: 'tax_percentage'
        },
        taxType: {
            type: DataTypes.ENUM('percentage', 'fixed', 'none', 'mixed'),
            defaultValue: 'none',
            field: 'tax_type',
            comment: 'How tax was calculated: percentage, fixed, none, or mixed (per-item)'
        },
        taxName: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'tax_name',
            comment: 'Display name for tax (e.g., VAT, GST)'
        },
        totalAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'total_amount',
            comment: 'Final amount after discounts and tax'
        },
        paidAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'paid_amount'
        },
        creditAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'credit_amount',
            comment: 'Amount on credit (totalAmount - paidAmount)'
        },
        changeAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'change_amount',
            comment: 'Change given to customer'
        },
        totalCost: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'total_cost',
            comment: 'Total cost of goods sold (sum of all item costs)'
        },
        profit: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Total profit (totalAmount - totalCost)'
        },
        profitMargin: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            field: 'profit_margin',
            comment: 'Profit margin percentage ((profit / totalAmount) * 100)'
        },
        loyaltyPointsEarned: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'loyalty_points_earned'
        },
        loyaltyPointsRedeemed: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'loyalty_points_redeemed'
        },
        loyaltyPointsValue: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'loyalty_points_value',
            comment: 'Monetary value of redeemed points'
        },
        paymentStatus: {
            type: DataTypes.ENUM('pending', 'partial', 'paid', 'refunded', 'cancelled'),
            defaultValue: 'pending',
            field: 'payment_status'
        },
        saleStatus: {
            type: DataTypes.ENUM('draft', 'completed', 'cancelled', 'returned'),
            defaultValue: 'completed',
            field: 'sale_status'
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
        customerNotes: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'customer_notes',
            comment: 'Special instructions from customer'
        },
        returnedSaleId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'returned_sale_id',
            comment: 'Original sale ID if this is a return/refund'
        },
        promotionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'promotion_id',
            comment: 'ID of the promotion applied to this sale'
        },
        promoCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'promo_code',
            comment: 'Coupon code applied to this sale'
        },
        cashierId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'cashier_id',
            comment: 'User who processed the sale'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id',
            comment: 'Branch where sale was made'
        },
        counterSessionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'counter_session_id',
            comment: 'ID of the session during which this sale was made'
        },
        returnSubtotal: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'return_subtotal',
            comment: 'Total value of returned items before discount'
        },
        returnDiscountAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'return_discount_amount',
            comment: 'Discount on returned items'
        },
        returnTaxAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'return_tax_amount',
            comment: 'Tax on returned items'
        },
        returnTotalAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'return_total_amount',
            comment: 'Net return value (returnSubtotal - returnDiscountAmount)'
        },
        netPayable: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'net_payable',
            comment: 'Final payable amount (totalAmount - returnTotalAmount)'
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_deleted'
        }
    }, {
        tableName: 'sales',
        hooks: {
            beforeCreate: async (sale, options) => {
                if (!sale.saleNumber) {
                    const today = new Date();
                    const datePrefix = today.getFullYear().toString() +
                        String(today.getMonth() + 1).padStart(2, '0') +
                        String(today.getDate()).padStart(2, '0');

                    const lastSale = await Sale.findOne({
                        where: {
                            saleNumber: {
                                [sequelize.Sequelize.Op.like]: `SAL-${datePrefix}%`
                            }
                        },
                        order: [['createdAt', 'DESC']],
                        transaction: options.transaction
                    });

                    let sequenceNum = 1;
                    if (lastSale && lastSale.saleNumber) {
                        const lastSeq = parseInt(lastSale.saleNumber.split('-').pop(), 10);
                        sequenceNum = lastSeq + 1;
                    }

                    sale.saleNumber = `SAL-${datePrefix}-${String(sequenceNum).padStart(4, '0')}`;
                }
            }
        },
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['sale_number'] },
            { fields: ['customer_id'] },
            { fields: ['sale_date'] },
            { fields: ['payment_status'] },
            { fields: ['sale_status'] },
            { fields: ['cashier_id'] },
            { fields: ['created_at'] }
        ]
    });

    return Sale;
};
