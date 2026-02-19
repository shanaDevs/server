const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const AuditLog = sequelize.define('AuditLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'user_id',
            comment: 'ID of the user who performed the action'
        },
        userPhone: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'user_phone',
            comment: 'Phone number of the user'
        },
        userRole: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'user_role',
            comment: 'Role of the user who performed the action'
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Action performed (e.g., CREATE_USER, UPDATE_PRODUCT)'
        },
        method: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'HTTP method (GET, POST, PUT, DELETE, PATCH)'
        },
        endpoint: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'API endpoint accessed'
        },
        requestBody: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'request_body',
            comment: 'JSON string of request body (passwords excluded)'
        },
        responseStatus: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'response_status',
            comment: 'HTTP response status code'
        },
        responseMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'response_message',
            comment: 'Response message or error'
        },
        status: {
            type: DataTypes.ENUM('success', 'failed'),
            allowNull: false,
            comment: 'Whether the request was successful or failed'
        },
        ipAddress: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'ip_address',
            comment: 'IP address of the requester'
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'user_agent',
            comment: 'User agent string'
        },
        duration: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Request duration in milliseconds'
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id',
            comment: 'Branch where action was performed'
        }
    }, {
        tableName: 'audit_logs',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['action'] },
            { fields: ['status'] },
            { fields: ['created_at'] }
        ]
    });

    return AuditLog;
};
