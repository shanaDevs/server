const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Permission = sequelize.define('Permission', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: 'Permission name (e.g., view_products, create_sales)'
        },
        action: {
            type: DataTypes.ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
            allowNull: false,
            comment: 'HTTP method associated with this permission'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Description of what this permission allows'
        },
        module: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Module/area this permission belongs to (products, sales, inventory, users, reports)'
        },

        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            field: 'is_active'
        }
    }, {
        tableName: 'permissions',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['module'] },
            { fields: ['is_active'] }
        ]
    });

    return Permission;
};
