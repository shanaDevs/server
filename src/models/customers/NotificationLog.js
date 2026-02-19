const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const NotificationLog = sequelize.define('NotificationLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'customer_id',
            references: {
                model: 'customers',
                key: 'id'
            }
        },
        eventType: {
            type: DataTypes.ENUM('IN_STORE_PURCHASE', 'ONLINE_ORDER', 'BIRTHDAY', 'PROMOTION'),
            allowNull: false,
            field: 'event_type',
            comment: 'Type of event that triggered the notification'
        },
        notificationChannel: {
            type: DataTypes.ENUM('EMAIL', 'SMS', 'BOTH'),
            allowNull: false,
            field: 'notification_channel',
            comment: 'Channel(s) used for notification'
        },
        messageType: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'message_type',
            comment: 'Specific message type (e.g., BIRTHDAY_7_DAYS, BIRTHDAY_3_DAYS, BIRTHDAY_DAY)'
        },
        emailStatus: {
            type: DataTypes.ENUM('PENDING', 'SENT', 'FAILED', 'NOT_APPLICABLE'),
            defaultValue: 'NOT_APPLICABLE',
            field: 'email_status'
        },
        smsStatus: {
            type: DataTypes.ENUM('PENDING', 'SENT', 'FAILED', 'NOT_APPLICABLE'),
            defaultValue: 'NOT_APPLICABLE',
            field: 'sms_status'
        },
        emailSentAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'email_sent_at'
        },
        smsSentAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'sms_sent_at'
        },
        recipientEmail: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'recipient_email'
        },
        recipientPhone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            field: 'recipient_phone'
        },
        emailContent: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'email_content'
        },
        smsContent: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'sms_content'
        },
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'error_message'
        },
        relatedEntityType: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'related_entity_type',
            comment: 'Sale, Order, etc.'
        },
        relatedEntityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'related_entity_id'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
        },
        sentBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'sent_by',
            comment: 'User ID who triggered the notification (for manual sends)'
        }
    }, {
        tableName: 'notification_logs',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['customer_id'] },
            { fields: ['event_type'] },
            { fields: ['message_type'] },
            { fields: ['created_at'] },
            { fields: ['customer_id', 'message_type', 'created_at'] }
        ]
    });

    return NotificationLog;
};
