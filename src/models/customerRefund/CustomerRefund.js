// models/customers/CustomerRefund.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CustomerRefund = sequelize.define('CustomerRefund', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        refundNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'refund_number',
            unique: true
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'customer_id'
        },
        saleId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'sale_id',
            comment: 'Reference to original sale'
        },
        userId: { // logged-in user who processes refund
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id'
        },
        refundDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'refund_date',
            defaultValue: DataTypes.NOW
        },
        returnReason: {
            type: DataTypes.ENUM('defective', 'damaged', 'expired', 'wrong_item', 'not_satisfied', 'size_issue', 'quality_issue', 'other'),
            allowNull: false,
            defaultValue: 'other',
            field: 'return_reason'
        },
        expiryDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'expiry_date',
            comment: 'Product expiry date if return reason is expired'
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        subtotal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
            field: 'subtotal'
        },
        taxAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
            field: 'tax_amount'
        },
        totalAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            field: 'total_amount'
        },
        // Payment tracking
        paymentStatus: {
            type: DataTypes.ENUM('pending', 'partial', 'paid', 'credited', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending',
            field: 'payment_status'
        },
        paidAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
            field: 'paid_amount'
        },
        balanceAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            field: 'balance_amount'
        },
        refundMethod: {
            type: DataTypes.ENUM('cash', 'bank_transfer', 'card', 'mobile_money', 'store_credit', 'exchange', 'other'),
            allowNull: true,
            field: 'refund_method'
        },
        status: {
            type: DataTypes.ENUM('draft', 'pending', 'approved', 'completed', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending'
        },
        approvedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'approved_by'
        },
        approvedDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'approved_date'
        },
        paymentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'payment_id'
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'product_id'
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
        },
    }, {
        tableName: 'customer_refunds',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['customer_id'] },
            { fields: ['sale_id'] },
            { fields: ['refund_date'] },
            { fields: ['return_reason'] },
            { fields: ['payment_status'] },
            { fields: ['status'] },
            { fields: ['refund_number'] }
        ]
    });

    return CustomerRefund;
};
