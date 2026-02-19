const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Category = sequelize.define('Category', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        categoryCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            field: 'category_code'
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        image: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        parentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'parent_id',
            references: {
                model: 'categories',
                key: 'id'
            }
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active'
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_deleted'
        },
    }, {
        tableName: 'categories',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        hooks: {
            beforeCreate: async (category, options) => {
                // Auto-generate category code if not provided
                if (!category.categoryCode) {
                    const namePrefix = category.name
                        .substring(0, 3)
                        .toUpperCase()
                        .replace(/[^A-Z]/g, '');
                    
                    // Get the count of categories with similar prefix
                    const count = await Category.count({
                        where: {
                            categoryCode: {
                                [sequelize.Sequelize.Op.like]: `${namePrefix}%`
                            }
                        }
                    });
                    
                    const sequence = String(count + 1).padStart(4, '0');
                    category.categoryCode = `${namePrefix}-${sequence}`;
                }
            }
        }
    });

    return Category;
};
