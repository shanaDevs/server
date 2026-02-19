const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Branch = sequelize.define('Branch', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Branch name'
        },
        code: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
            comment: 'Unique branch code'
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Branch address'
        },
        city: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        state: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        zipCode: {
            type: DataTypes.STRING(20),
            allowNull: true,
            field: 'zip_code'
        },
        country: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: 'Sri Lanka'
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        managerName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'manager_name',
            comment: 'Branch manager name'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            field: 'is_active',
            comment: 'Branch active status'
        },
        isHeadOffice: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
            field: 'is_head_office',
            comment: 'Is this the head office/main branch'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
    }, {
        tableName: 'branches',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['code'], unique: true },
            { fields: ['is_active'] },
            { fields: ['is_head_office'] }
        ]
    });

    return Branch;
};
