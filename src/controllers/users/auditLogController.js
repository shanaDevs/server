const { AuditLog, sequelize } = require('../../models');
const { Op } = require('sequelize');

// Get all audit logs with filters
exports.getAuditLogs = async (req, res, next) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            userId, 
            action, 
            status,
            startDate,
            endDate 
        } = req.query;
        
        const offset = (page - 1) * limit;
        const where = {};
        
        if (userId) where.userId = userId;
        if (action) where.action = action;
        if (status) where.status = status;
        
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(endDate);
        }
        
        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });
        
        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get audit log by ID
exports.getAuditLogById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const log = await AuditLog.findByPk(id);
        
        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Audit log not found'
            });
        }
        
        res.json({
            success: true,
            data: log
        });
    } catch (error) {
        next(error);
    }
};

// Get audit logs by user ID
exports.getAuditLogsByUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        
        const { count, rows } = await AuditLog.findAndCountAll({
            where: { userId },
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });
        
        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get audit statistics
exports.getAuditStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const where = {};
        
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(endDate);
        }
        
        const [totalLogs, successLogs, failedLogs] = await Promise.all([
            AuditLog.count({ where }),
            AuditLog.count({ where: { ...where, status: 'success' } }),
            AuditLog.count({ where: { ...where, status: 'failed' } })
        ]);
        
        // Get most common actions
        const actionStats = await AuditLog.findAll({
            where,
            attributes: [
                'action',
                [sequelize.fn('COUNT', sequelize.col('action')), 'count']
            ],
            group: ['action'],
            order: [[sequelize.fn('COUNT', sequelize.col('action')), 'DESC']],
            limit: 10,
            raw: true
        });
        
        res.json({
            success: true,
            data: {
                totalLogs,
                successLogs,
                failedLogs,
                successRate: totalLogs > 0 ? ((successLogs / totalLogs) * 100).toFixed(2) : 0,
                topActions: actionStats
            }
        });
    } catch (error) {
        next(error);
    }
};
