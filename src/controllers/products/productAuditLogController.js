const { ProductAuditLog, Product, User } = require('../../models');
const { Op } = require('sequelize');

// Get all product audit logs with filtering
exports.getAllProductAuditLogs = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            productId,
            action,
            changedBy,
            startDate,
            endDate,
            search
        } = req.query;

        const offset = (page - 1) * limit;

        // Build where clause
        const where = {};

        if (productId) {
            where.productId = productId;
        }

        if (action) {
            where.action = action;
        }

        if (changedBy) {
            where.changedBy = changedBy;
        }

        if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        } else if (startDate) {
            where.createdAt = {
                [Op.gte]: new Date(startDate)
            };
        } else if (endDate) {
            where.createdAt = {
                [Op.lte]: new Date(endDate)
            };
        }

        if (search) {
            where[Op.or] = [
                { notes: { [Op.like]: `%${search}%` } },
                { field: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows: logs } = await ProductAuditLog.findAndCountAll({
            where,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'productCode', 'description']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'userName']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.status(200).json({
            success: true,
            message: 'Product audit logs retrieved successfully',
            data: {
                logs,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get product audit log by ID
exports.getProductAuditLogById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const log = await ProductAuditLog.findByPk(id, {
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'productCode', 'description', 'imageUrl']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'userName', 'phone']
                }
            ]
        });

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Product audit log not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product audit log retrieved successfully',
            data: log
        });
    } catch (error) {
        next(error);
    }
};

// Get audit logs for a specific product
exports.getProductAuditLogsByProductId = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 20, action } = req.query;
        const offset = (page - 1) * limit;

        const where = { productId };

        if (action) {
            where.action = action;
        }

        const { count, rows: logs } = await ProductAuditLog.findAndCountAll({
            where,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'productCode', 'description']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'userName']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.status(200).json({
            success: true,
            message: 'Product audit logs retrieved successfully',
            data: {
                logs,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get audit log statistics
exports.getProductAuditLogStats = async (req, res, next) => {
    try {
        const { startDate, endDate, productId } = req.query;

        const where = {};

        if (productId) {
            where.productId = productId;
        }

        if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // Get action counts
        const actionCounts = await ProductAuditLog.findAll({
            where,
            attributes: [
                'action',
                [ProductAuditLog.sequelize.fn('COUNT', ProductAuditLog.sequelize.col('id')), 'count']
            ],
            group: ['action']
        });

        // Get total count
        const totalCount = await ProductAuditLog.count({ where });

        // Get recent logs
        const recentLogs = await ProductAuditLog.findAll({
            where,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'productCode']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'userName']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        // Get most active products
        const mostActiveProducts = await ProductAuditLog.findAll({
            where,
            attributes: [
                'productId',
                [ProductAuditLog.sequelize.fn('COUNT', ProductAuditLog.sequelize.col('ProductAuditLog.id')), 'count']
            ],
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'productCode', 'description']
                }
            ],
            group: ['productId', 'product.id'],
            order: [[ProductAuditLog.sequelize.fn('COUNT', ProductAuditLog.sequelize.col('ProductAuditLog.id')), 'DESC']],
            limit: 10
        });

        res.status(200).json({
            success: true,
            message: 'Product audit log statistics retrieved successfully',
            data: {
                totalLogs: totalCount,
                actionBreakdown: actionCounts.map(item => ({
                    action: item.action,
                    count: parseInt(item.get('count'))
                })),
                recentActivity: recentLogs,
                mostActiveProducts
            }
        });
    } catch (error) {
        next(error);
    }
};

// Create product audit log (manual entry - usually auto-created)
exports.createProductAuditLog = async (req, res, next) => {
    try {
        const {
            productId,
            action,
            field,
            oldValue,
            newValue,
            notes
        } = req.body;

        const log = await ProductAuditLog.create({
            productId,
            action,
            field,
            oldValue,
            newValue,
            changedBy: req.user?.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            notes
        });

        const completeLog = await ProductAuditLog.findByPk(log.id, {
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'productCode', 'description']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'userName']
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Product audit log created successfully',
            data: completeLog
        });
    } catch (error) {
        next(error);
    }
};
