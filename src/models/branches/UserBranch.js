const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserBranch = sequelize.define('UserBranch', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE',
            comment: 'User ID'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'branch_id',
            references: {
                model: 'branches',
                key: 'id'
            },
            onDelete: 'CASCADE',
            comment: 'Branch ID'
        },
        isDefault: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_default',
            comment: 'Is this the user default branch'
        },
        canAccessAllBranches: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
            field: 'can_access_all_branches',
            comment: 'User can access all branches data'
        }
    }, {
        tableName: 'user_branches',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['branch_id'] },
            { fields: ['user_id', 'branch_id'], unique: true }
        ]
    });

    return UserBranch;
};
