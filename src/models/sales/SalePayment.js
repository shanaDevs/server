const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SalePayment = sequelize.define('SalePayment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        saleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'sale_id'
        },
        paymentDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'payment_date'
        },
        paymentMethod: {
            type: DataTypes.ENUM('cash', 'card', 'bank_transfer', 'mobile_money', 'cheque', 'loyalty_points', 'credit', 'other'),
            allowNull: false,
            defaultValue: 'cash',
            field: 'payment_method'
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        referenceNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'reference_number',
            comment: 'Transaction/cheque/reference number'
        },
        cardType: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'card_type',
            comment: 'Visa, Mastercard, etc.'
        },
        cardLastFour: {
            type: DataTypes.STRING(4),
            allowNull: true,
            field: 'card_last_four'
        },
        bankName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'bank_name'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        processedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'processed_by',
            comment: 'User who processed the payment'
        },
        totalAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            field: 'total_amount',
            comment: 'Total sale amount at time of payment'
        },
        paidAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            field: 'paid_amount',
            comment: 'Total amount paid after this payment'
        },
        remainingAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            field: 'remaining_amount',
            comment: 'Amount remaining to pay after this payment'
        },
        paymentStatus: {
            type: DataTypes.ENUM('pending', 'partial', 'paid', 'refunded', 'cancelled'),
            allowNull: true,
            field: 'payment_status',
            comment: 'Payment status after this payment'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        }
    }, {
        tableName: 'sale_payments',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['sale_id'] },
            { fields: ['payment_date'] },
            { fields: ['payment_method'] },
            { fields: ['reference_number'] }
        ]
    });

    return SalePayment;
};
