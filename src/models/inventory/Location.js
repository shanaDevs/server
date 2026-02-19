const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Location = sequelize.define('Location', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true
        },
        type: {
            type: DataTypes.ENUM('warehouse', 'store', 'shelf', 'bin', 'other'),
            defaultValue: 'warehouse'
        },
        parentLocationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'parent_location_id'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        capacity: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        tableName: 'locations',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['code'] },
            { fields: ['parent_location_id'] }
        ]
    });

    return Location;
};
