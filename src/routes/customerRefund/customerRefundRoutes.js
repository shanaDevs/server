const express = require('express');
const router = express.Router();
const { customerRefundController } = require('../../controllers');
const { verifyToken } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Customer Refunds
 *   description: Customer refund management endpoints
 */

/**
 * @swagger
 * /api/customer-refunds:
 *   get:
 *     summary: Get all customer refunds
 *     tags: [Customer Refunds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of customer refunds
 *       401:
 *         description: Unauthorized
 */
router.get('/', customerRefundController.getAllCustomerRefunds);

/**
 * @swagger
 * /api/customer-refunds:
 *   post:
 *     summary: Create new customer refund
 *     tags: [Customer Refunds]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - refundAmount
 *             properties:
 *               customerId:
 *                 type: integer
 *                 description: Customer ID
 *               refundAmount:
 *                 type: number
 *                 format: decimal
 *                 description: Amount to refund
 *               reason:
 *                 type: string
 *                 description: Reason for refund
 *     responses:
 *       201:
 *         description: Customer refund created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', verifyToken, customerRefundController.createCustomerRefund);

module.exports = router;