const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProductAuditLog = sequelize.define('ProductAuditLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'product_id'
        },
        action: {
            type: DataTypes.ENUM('created', 'updated', 'deleted', 'price_changed', 'stock_adjusted', 'activated', 'deactivated'),
            allowNull: false
        },
        field: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        oldValue: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'old_value'
        },
        newValue: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'new_value'
        },
        changedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'changed_by'
        },
        ipAddress: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'ip_address'
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'user_agent'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id',
            comment: 'Branch where product action was performed'
        }
    }, {
        tableName: 'product_audit_logs',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['product_id'] },
            { fields: ['action'] },
            { fields: ['changed_by'] },
            { fields: ['created_at'] }
        ]
    });

    return ProductAuditLog;
};
