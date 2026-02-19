const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SystemSettings = sequelize.define('SystemSettings', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        shopName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'shop_name'
        },
        shopAddress: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'shop_address'
        },
        shopPhone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            field: 'shop_phone'
        },
        shopEmail: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'shop_email'
        },
        shopLogo: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'shop_logo'
        },
        taxRate: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            field: 'tax_rate',
            comment: 'Tax rate value - percentage (e.g., 18.00 for 18%) or fixed amount based on taxType'
        },
        taxType: {
            type: DataTypes.ENUM('percentage', 'fixed'),
            defaultValue: 'percentage',
            field: 'tax_type',
            comment: 'Tax calculation method: percentage of subtotal or fixed amount per sale'
        },
        taxName: {
            type: DataTypes.STRING(50),
            defaultValue: 'VAT',
            field: 'tax_name',
            comment: 'Display name for tax (e.g., VAT, GST, Sales Tax)'
        },
        currency: {
            type: DataTypes.STRING(10),
            defaultValue: 'LKR',
            field: 'currency'
        },
        currencySymbol: {
            type: DataTypes.STRING(10),
            defaultValue: 'Rs.',
            field: 'currency_symbol'
        },
        invoicePrefix: {
            type: DataTypes.STRING(20),
            defaultValue: 'INV',
            field: 'invoice_prefix'
        },
        invoiceFooter: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'invoice_footer',
            comment: 'Footer text for invoices (terms & conditions, thank you message, etc.)'
        },
        enableTax: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'enable_tax'
        },
        enableLoyalty: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'enable_loyalty'
        },
        loyaltyPointsPerAmount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 100,
            field: 'loyalty_points_per_amount',
            comment: 'Amount required to earn 1 loyalty point'
        },
        loyaltyPointValue: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 1,
            field: 'loyalty_point_value',
            comment: 'Value of 1 loyalty point in currency'
        },
        // Notification Settings
        notificationChannel: {
            type: DataTypes.ENUM('EMAIL_ONLY', 'SMS_ONLY', 'EMAIL_AND_SMS'),
            defaultValue: 'EMAIL_ONLY',
            field: 'notification_channel',
            comment: 'Preferred channel for customer notifications'
        },
        enableEmailNotifications: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'enable_email_notifications'
        },
        enableSMSNotifications: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'enable_sms_notifications'
        }
    }, {
        tableName: 'system_settings',
        timestamps: true,
        underscored: true
    });

    return SystemSettings;
};
