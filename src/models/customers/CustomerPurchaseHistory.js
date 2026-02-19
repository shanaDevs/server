const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CustomerPurchaseHistory = sequelize.define('CustomerPurchaseHistory', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'customer_id'
        },
        saleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'sale_id'
        },
        invoiceNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'invoice_number'
        },
        saleDate: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'sale_date'
        },
        totalAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'total_amount'
        },
        discountAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'discount_amount'
        },
        netAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'net_amount'
        },
        paidAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'paid_amount'
        },
        creditAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'credit_amount'
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
        paymentStatus: {
            type: DataTypes.ENUM('paid', 'partial', 'credit', 'pending'),
            defaultValue: 'pending',
            field: 'payment_status'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
    }, {
        tableName: 'customer_purchase_history',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['customer_id'] },
            { fields: ['sale_id'] },
            { fields: ['invoice_number'] },
            { fields: ['sale_date'] },
            { fields: ['payment_status'] }
        ]
    });

    return CustomerPurchaseHistory;
};
