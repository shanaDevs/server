// Email Log Model - Stores all email logs with Gmail sync support
module.exports = (sequelize, DataTypes) => {
    const EmailLog = sequelize.define('EmailLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // Email type: 'po_sent', 'po_cancelled', 'grn_notification', etc.
        emailType: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        // Email subject
        subject: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        // Recipient email address
        recipientEmail: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        // Recipient name
        recipientName: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        // Sender email address
        senderEmail: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        // Email body (HTML content)
        htmlContent: {
            type: DataTypes.TEXT('long'),
            allowNull: true
        },
        // Status: 'sent', 'failed', 'pending'
        status: {
            type: DataTypes.ENUM('pending', 'sent', 'failed'),
            defaultValue: 'pending',
            allowNull: false
        },
        // Error message if failed
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // Related entity type (e.g., 'PurchaseOrder', 'GRN')
        relatedEntityType: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        // Related entity ID
        relatedEntityId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        // Related entity reference (e.g., PO number)
        relatedEntityRef: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        // Supplier ID (if related to a supplier)
        supplierId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        // Branch ID
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        // Gmail Message ID (for sync with Gmail)
        gmailMessageId: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        // Gmail Thread ID
        gmailThreadId: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        // Is synced from Gmail
        isSyncedFromGmail: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        // Sent timestamp
        sentAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        // Created by user
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        tableName: 'email_logs',
        timestamps: true,
        indexes: [
            { fields: ['email_type'] },
            { fields: ['status'] },
            { fields: ['recipient_email'] },
            { fields: ['related_entity_type', 'related_entity_id'] },
            { fields: ['supplier_id'] },
            { fields: ['branch_id'] },
            { fields: ['gmail_message_id'] },
            { fields: ['created_at'] }
        ]
    });

    return EmailLog;
};
