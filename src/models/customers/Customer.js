const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
    const Customer = sequelize.define('Customer', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        customerCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            field: 'customer_code'
        },
        customerName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'customer_name'
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
        customerBirthday: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'customer_birthday'
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        customerType: {
            type: DataTypes.ENUM('retail', 'wholesale', 'distributor', 'vip'),
            defaultValue: 'retail',
            field: 'customer_type'
        },
        sale_platforms: {
            type: DataTypes.ENUM('ecommerce', 'pos'),
            allowNull: true,
            field: 'sale_platforms'
        },
        creditLimit: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'credit_limit'
        },
        currentCredit: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'current_credit'
        },
        loyaltyPoints: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'loyalty_points'
        },
        totalPurchases: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            field: 'total_purchases'
        },
        totalOrders: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'total_orders'
        },
        lastPurchaseDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_purchase_date'
        },
        discountPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            field: 'discount_percentage'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_deleted'
        },
        optOutNotifications: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'opt_out_notifications',
            comment: 'Customer has opted out of marketing notifications'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'created_by'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id',
            comment: 'Branch where customer was registered'
        }
    }, {
        tableName: 'customers',
        hooks: {
            beforeCreate: async (customer, options) => {
                // Generate customer code ONLY if not provided (handles null, undefined, empty string)
                if (!customer.customerCode || customer.customerCode.trim() === '') {
                    const lastCustomer = await customer.constructor.findOne({
                        where: {
                            customerCode: {
                                [Op.like]: 'CUS-%'
                            }
                        },
                        order: [['customerCode', 'DESC']],
                        transaction: options.transaction
                    });

                    let nextNum = 1;
                    if (lastCustomer && lastCustomer.customerCode) {
                        const lastCode = lastCustomer.customerCode;
                        const lastPart = lastCode.replace('CUS-', '');
                        const lastNum = parseInt(lastPart, 10);

                        if (!isNaN(lastNum)) {
                            nextNum = lastNum + 1;
                        }
                    }

                    customer.customerCode = 'CUS-' + String(nextNum).padStart(4, '0');
                }

                // Check for duplicate phone number (only for non-deleted customers)
                if (customer.phone) {
                    const existingPhone = await Customer.findOne({
                        where: {
                            phone: customer.phone,
                            isDeleted: false
                        },
                        transaction: options.transaction
                    });

                    if (existingPhone) {
                        throw new Error('A customer with this phone number already exists');
                    }
                }

                // Check for duplicate email (only for non-deleted customers)
                if (customer.email) {
                    const existingEmail = await Customer.findOne({
                        where: {
                            email: customer.email,
                            isDeleted: false
                        },
                        transaction: options.transaction
                    });

                    if (existingEmail) {
                        throw new Error('A customer with this email already exists');
                    }
                }
            },
            beforeUpdate: async (customer, options) => {
                // Check for duplicate phone number when updating (only for non-deleted customers)
                if (customer.changed('phone') && customer.phone) {
                    const existingPhone = await Customer.findOne({
                        where: {
                            phone: customer.phone,
                            isDeleted: false,
                            id: { [Op.ne]: customer.id }
                        },
                        transaction: options.transaction
                    });

                    if (existingPhone) {
                        throw new Error('A customer with this phone number already exists');
                    }
                }

                // Check for duplicate email when updating (only for non-deleted customers)
                if (customer.changed('email') && customer.email) {
                    const existingEmail = await Customer.findOne({
                        where: {
                            email: customer.email,
                            isDeleted: false,
                            id: { [Op.ne]: customer.id }
                        },
                        transaction: options.transaction
                    });

                    if (existingEmail) {
                        throw new Error('A customer with this email already exists');
                    }
                }
            }
        },
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['customer_code'] },
            { fields: ['phone'] },
            { fields: ['email'] },
            { fields: ['customer_type'] },
            { fields: ['is_deleted'] }
        ]
    });

    return Customer;
};
