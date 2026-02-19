module.exports = (sequelize, DataTypes) => {
    const Brand = sequelize.define("Brand", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'brand_name',
            validate: {
                notEmpty: {
                    msg: 'Brand name is required'
                }
            }
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        image: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_deleted'
        }
    }, {
        tableName: "brands",
        timestamps: true,
        underscored: true
    });

    return Brand;
};
