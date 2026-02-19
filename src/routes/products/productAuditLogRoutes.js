const express = require('express');
const router = express.Router();
const { productAuditLogController } = require('../../controllers');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Product Audit Logs
 *   description: Product audit trail and history tracking
 */

/**
 * @swagger
 * /api/product-audit-logs:
 *   get:
 *     summary: Get all product audit logs
 *     tags: [Product Audit Logs]
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
 *           default: 20
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [created, updated, deleted, price_changed, stock_adjusted, activated, deactivated]
 *       - in: query
 *         name: changedBy
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', checkPermission('view_audit_log'), productAuditLogController.getAllProductAuditLogs);

/**
 * @swagger
 * /api/product-audit-logs/stats:
 *   get:
 *     summary: Get product audit log statistics
 *     tags: [Product Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', checkPermission('view_stats_audit_log'), productAuditLogController.getProductAuditLogStats);

/**
 * @swagger
 * /api/product-audit-logs/product/{productId}:
 *   get:
 *     summary: Get audit logs for a specific product
 *     tags: [Product Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
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
 *           default: 20
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [created, updated, deleted, price_changed, stock_adjusted, activated, deactivated]
 *     responses:
 *       200:
 *         description: Product audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/product/:productId', checkPermission('view_audit_log'), productAuditLogController.getProductAuditLogsByProductId);

/**
 * @swagger
 * /api/product-audit-logs/{id}:
 *   get:
 *     summary: Get product audit log by ID
 *     tags: [Product Audit Logs]
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
 *         description: Product audit log retrieved successfully
 *       404:
 *         description: Product audit log not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', checkPermission('view_audit_log'), productAuditLogController.getProductAuditLogById);

/**
 * @swagger
 * /api/product-audit-logs:
 *   post:
 *     summary: Create a product audit log entry
 *     tags: [Product Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - action
 *             properties:
 *               productId:
 *                 type: integer
 *               action:
 *                 type: string
 *                 enum: [created, updated, deleted, price_changed, stock_adjusted, activated, deactivated]
 *               field:
 *                 type: string
 *               oldValue:
 *                 type: string
 *               newValue:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product audit log created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', checkPermission('create_audit_log'), productAuditLogController.createProductAuditLog);


module.exports = router;
