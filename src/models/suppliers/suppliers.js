const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Suppliers = sequelize.define('Suppliers', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'company_id'
        },
        supplierCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            field: 'supplier_code'
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        contactPerson: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'contact_person'
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true,
            validate: {
                isEmail: true
            }
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            validate: {
                is: {
                    args: /^(?:0|94|\+94)?(?:(11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91)(0|2|3|4|5|7|9)|7(0|1|2|4|5|6|7|8)\d)\d{6}$/,
                    msg: "Please enter a valid Sri Lankan phone number"
                }
            }
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id',
            comment: 'Branch associated with supplier'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        tableName: 'suppliers',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['supplier_code'] }
        ],
        hooks: {
            beforeCreate: async (supplier, options) => {
                if (!supplier.supplierCode) {
                    // Find the last supplier code
                    const lastSupplier = await Suppliers.findOne({
                        where: {
                            supplierCode: {
                                [sequelize.Sequelize.Op.like]: 'SUP%'
                            }
                        },
                        order: [['id', 'DESC']],
                        transaction: options.transaction
                    });

                    let nextNumber = 1;
                    if (lastSupplier && lastSupplier.supplierCode) {
                        const lastNumber = parseInt(lastSupplier.supplierCode.replace('SUP', ''), 10);
                        if (!isNaN(lastNumber)) {
                            nextNumber = lastNumber + 1;
                        }
                    }

                    supplier.supplierCode = `SUP${String(nextNumber).padStart(3, '0')}`;
                }
            }
        }
    });
    
    return Suppliers;
};
