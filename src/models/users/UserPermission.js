const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserPermission = sequelize.define('UserPermission', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id',
            comment: 'User ID',
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        permissionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'permission_id',
            comment: 'Permission ID',
            references: {
                model: 'permissions',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        grantedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'granted_by',
            comment: 'ID of admin/super_admin who granted this permission',
            references: {
                model: 'users',
                key: 'id'
            }
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
        grantedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'granted_at'
        }
    }, {
        tableName: 'user_permissions',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['permission_id'] },
            { unique: true, fields: ['user_id', 'permission_id'] }
        ]
    });

    return UserPermission;
};
