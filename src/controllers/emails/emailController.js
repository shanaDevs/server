const db = require('../../models');
const { Op } = require('sequelize');
const gmailService = require('../../services/emails/gmailService');

// Get all email logs with pagination and filters
exports.getAllEmailLogs = async (req, res, next) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            emailType,
            status,
            recipientEmail,
            relatedEntityType,
            relatedEntityId,
            supplierId,
            startDate,
            endDate,
            search,
            source // 'local', 'gmail', 'all'
        } = req.query;
        
        const offset = (page - 1) * limit;
        const where = {};

        // Apply branch filter if applicable
        if (req.branchId) {
            where.branchId = req.branchId;
        }

        // Filter by email type
        if (emailType) {
            where.emailType = emailType;
        }

        // Filter by status
        if (status) {
            where.status = status;
        }

        // Filter by recipient email
        if (recipientEmail) {
            where.recipientEmail = { [Op.like]: `%${recipientEmail}%` };
        }

        // Filter by related entity
        if (relatedEntityType) {
            where.relatedEntityType = relatedEntityType;
        }

        if (relatedEntityId) {
            where.relatedEntityId = relatedEntityId;
        }

        // Filter by supplier
        if (supplierId) {
            where.supplierId = supplierId;
        }

        // Filter by source
        if (source === 'gmail') {
            where.isSyncedFromGmail = true;
        } else if (source === 'local') {
            where.isSyncedFromGmail = false;
        }

        // Date range filter
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                where.createdAt[Op.lte] = new Date(endDate + 'T23:59:59');
            }
        }

        // Search in subject, recipient name/email
        if (search) {
            where[Op.or] = [
                { subject: { [Op.like]: `%${search}%` } },
                { recipientEmail: { [Op.like]: `%${search}%` } },
                { recipientName: { [Op.like]: `%${search}%` } },
                { relatedEntityRef: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await db.EmailLog.findAndCountAll({
            where,
            include: [
                { 
                    model: db.Suppliers, 
                    as: 'supplier',
                    attributes: ['id', 'name', 'supplierCode', 'email'],
                    required: false
                },
                {
                    model: db.User,
                    as: 'creator',
                    attributes: ['id', 'userName'],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: rows,
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        next(error);
    }
};

// Get email log by ID
exports.getEmailLogById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const emailLog = await db.EmailLog.findByPk(id, {
            include: [
                { 
                    model: db.Suppliers, 
                    as: 'supplier',
                    attributes: ['id', 'name', 'supplierCode', 'email', 'phone'],
                    required: false
                },
                {
                    model: db.User,
                    as: 'creator',
                    attributes: ['id', 'userName'],
                    required: false
                }
            ]
        });

        if (!emailLog) {
            return res.status(404).json({
                success: false,
                message: 'Email log not found'
            });
        }

        res.json({
            success: true,
            data: emailLog
        });
    } catch (error) {
        next(error);
    }
};

// Get email statistics/summary
exports.getEmailStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const where = {};

        // Apply branch filter if applicable
        if (req.branchId) {
            where.branchId = req.branchId;
        }

        // Date range filter
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                where.createdAt[Op.lte] = new Date(endDate + 'T23:59:59');
            }
        }

        // Total emails
        const totalEmails = await db.EmailLog.count({ where });

        // Emails by status
        const sentEmails = await db.EmailLog.count({ 
            where: { ...where, status: 'sent' } 
        });
        const failedEmails = await db.EmailLog.count({ 
            where: { ...where, status: 'failed' } 
        });
        const pendingEmails = await db.EmailLog.count({ 
            where: { ...where, status: 'pending' } 
        });

        // Local vs Gmail synced
        const localEmails = await db.EmailLog.count({
            where: { ...where, isSyncedFromGmail: false }
        });
        const gmailSyncedEmails = await db.EmailLog.count({
            where: { ...where, isSyncedFromGmail: true }
        });

        // Emails by type
        const emailsByType = await db.EmailLog.findAll({
            where,
            attributes: [
                ['email_type', 'emailType'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
            ],
            group: ['email_type'],
            order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']]
        });

        // Recent emails (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentEmailsByDay = await db.EmailLog.findAll({
            where: {
                ...where,
                createdAt: { [Op.gte]: sevenDaysAgo }
            },
            attributes: [
                [db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'date'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
            ],
            group: [db.sequelize.fn('DATE', db.sequelize.col('created_at'))],
            order: [[db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'ASC']]
        });

        res.json({
            success: true,
            data: {
                totalEmails,
                byStatus: {
                    sent: sentEmails,
                    failed: failedEmails,
                    pending: pendingEmails
                },
                bySource: {
                    local: localEmails,
                    gmail: gmailSyncedEmails
                },
                byType: emailsByType,
                recentTrend: recentEmailsByDay
            }
        });
    } catch (error) {
        next(error);
    }
};

// Delete email log
exports.deleteEmailLog = async (req, res, next) => {
    try {
        const { id } = req.params;

        const emailLog = await db.EmailLog.findByPk(id);

        if (!emailLog) {
            return res.status(404).json({
                success: false,
                message: 'Email log not found'
            });
        }

        await emailLog.destroy();

        res.json({
            success: true,
            message: 'Email log deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Bulk delete email logs
exports.bulkDeleteEmailLogs = async (req, res, next) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of email log IDs'
            });
        }

        const deleted = await db.EmailLog.destroy({
            where: {
                id: { [Op.in]: ids }
            }
        });

        res.json({
            success: true,
            message: `${deleted} email log(s) deleted successfully`,
            deletedCount: deleted
        });
    } catch (error) {
        next(error);
    }
};

// ============ GMAIL INTEGRATION ENDPOINTS ============

// Get Gmail OAuth configuration status
exports.getGmailConfig = async (req, res, next) => {
    try {
        const status = gmailService.getConfigStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        next(error);
    }
};

// Get Gmail OAuth authorization URL
exports.getGmailAuthUrl = async (req, res, next) => {
    try {
        const authUrl = gmailService.getAuthUrl();
        
        if (!authUrl) {
            return res.status(400).json({
                success: false,
                message: 'Gmail OAuth not configured. Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your .env file.'
            });
        }

        res.json({
            success: true,
            data: { authUrl }
        });
    } catch (error) {
        next(error);
    }
};

// OAuth callback - exchange code for tokens
exports.handleGmailOAuthCallback = async (req, res, next) => {
    try {
        const { code } = req.query;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Authorization code is required'
            });
        }

        const tokens = await gmailService.getTokensFromCode(code);

        // Return tokens - the refresh_token should be saved to .env
        res.json({
            success: true,
            message: 'Gmail authorization successful! Save the refresh_token to your .env file as GMAIL_REFRESH_TOKEN',
            data: {
                refresh_token: tokens.refresh_token,
                access_token: tokens.access_token,
                expiry_date: tokens.expiry_date
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fetch emails directly from Gmail (without saving to DB)
exports.fetchGmailEmails = async (req, res, next) => {
    try {
        const { maxResults = 20, pageToken, query = '' } = req.query;

        if (!gmailService.isConfigured()) {
            return res.status(400).json({
                success: false,
                message: 'Gmail API not fully configured. Please complete OAuth setup.'
            });
        }

        const result = await gmailService.fetchSentEmails({
            maxResults: parseInt(maxResults),
            pageToken,
            query
        });

        res.json({
            success: true,
            data: result.emails,
            nextPageToken: result.nextPageToken
        });
    } catch (error) {
        next(error);
    }
};

// Sync emails from Gmail to local database
exports.syncGmailEmails = async (req, res, next) => {
    try {
        const { query = 'subject:Purchase Order OR subject:PO', maxResults = 50 } = req.body;

        if (!gmailService.isConfigured()) {
            return res.status(400).json({
                success: false,
                message: 'Gmail API not fully configured. Please complete OAuth setup.'
            });
        }

        const result = await gmailService.syncEmailsToDatabase({
            query,
            maxResults: parseInt(maxResults)
        });

        res.json({
            success: true,
            message: `Synced ${result.synced} emails from Gmail`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Resend a failed email
exports.resendEmail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const autoPOService = require('../../services/purchaseOrders/autoPOService');

        const emailLog = await db.EmailLog.findByPk(id);

        if (!emailLog) {
            return res.status(404).json({
                success: false,
                message: 'Email log not found'
            });
        }

        // Only allow resending failed emails
        if (emailLog.status !== 'failed') {
            return res.status(400).json({
                success: false,
                message: 'Can only resend failed emails'
            });
        }

        try {
            // Determine which send method to use based on email type
            if (emailLog.emailType === 'po_cancelled') {
                await autoPOService.sendCancelEmail(
                    emailLog.recipientEmail,
                    emailLog.relatedEntityRef,
                    emailLog.recipientName,
                    '',
                    ''
                );
            } else {
                await autoPOService.sendEmail(
                    emailLog.recipientEmail,
                    emailLog.relatedEntityRef,
                    emailLog.recipientName,
                    ''
                );
            }

            // Update the email log
            await emailLog.update({
                status: 'sent',
                sentAt: new Date(),
                errorMessage: null
            });

            res.json({
                success: true,
                message: 'Email resent successfully',
                data: emailLog
            });
        } catch (emailError) {
            // Update with error
            await emailLog.update({
                status: 'failed',
                errorMessage: emailError.message
            });

            res.status(500).json({
                success: false,
                message: 'Failed to resend email',
                error: emailError.message
            });
        }
    } catch (error) {
        next(error);
    }
};
