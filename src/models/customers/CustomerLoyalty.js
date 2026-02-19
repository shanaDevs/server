const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CustomerLoyalty = sequelize.define('CustomerLoyalty', {
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
        transactionType: {
            type: DataTypes.ENUM('earn', 'redeem', 'expire', 'adjustment'),
            allowNull: false,
            field: 'transaction_type'
        },
        points: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        balancePoints: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'balance_points'
        },
        referenceType: {
            type: DataTypes.ENUM('sale', 'return', 'promotion', 'birthday', 'referral', 'manual', 'expiry'),
            allowNull: true,
            field: 'reference_type'
        },
        referenceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'reference_id'
        },
        expiryDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'expiry_date'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        performedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'performed_by'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
    }, {
        tableName: 'customer_loyalty',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['customer_id'] },
            { fields: ['transaction_type'] },
            { fields: ['created_at'] }
        ]
    });

    return CustomerLoyalty;
};
