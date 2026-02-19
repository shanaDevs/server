const express = require('express');
const router = express.Router();
const { auditLogController } = require('../../controllers');
const { requireAdminOrAbove } = require('../../middlewares/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         userPhone:
 *           type: string
 *         userRole:
 *           type: string
 *         action:
 *           type: string
 *         method:
 *           type: string
 *         endpoint:
 *           type: string
 *         requestBody:
 *           type: string
 *         responseStatus:
 *           type: integer
 *         responseMessage:
 *           type: string
 *         status:
 *           type: string
 *           enum: [success, failed]
 *         ipAddress:
 *           type: string
 *         userAgent:
 *           type: string
 *         duration:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Get all audit logs
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failed]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of audit logs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/', requireAdminOrAbove, auditLogController.getAuditLogs);

/**
 * @swagger
 * /api/audit-logs/stats:
 *   get:
 *     summary: Get audit log statistics
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Audit log statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/stats', requireAdminOrAbove, auditLogController.getAuditStats);

/**
 * @swagger
 * /api/audit-logs/user/{userId}:
 *   get:
 *     summary: Get audit logs by user ID
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: User's audit logs
 *       401:
 *         description: Unauthorized
 */
router.get('/user/:userId', requireAdminOrAbove, auditLogController.getAuditLogsByUser);

/**
 * @swagger
 * /api/audit-logs/{id}:
 *   get:
 *     summary: Get audit log by ID
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Audit log details
 *       404:
 *         description: Audit log not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', requireAdminOrAbove, auditLogController.getAuditLogById);

module.exports = router;
