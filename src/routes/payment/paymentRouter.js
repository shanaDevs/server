const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../../controllers/payments/paymentController');
const { verifyToken } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment management endpoints
 */

// Validation middleware
const validatePayment = [
    body('amountPaid')
        .isFloat({ gt: 0 })
        .withMessage('Amount must be a positive number'),
    body('paymentMethod')
        .isIn(['CASH', 'CARD', 'QR', 'BANK', 'CHEQUE', 'CREDIT', 'OTHER'])
        .withMessage('Invalid payment method'),
    body('paidDate')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('Paid date must be a valid date'),
    body('note')
        .optional()
        .isString()
        .withMessage('Note must be a string')
];

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create a new payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amountPaid
 *               - paymentMethod
 *             properties:
 *               amountPaid:
 *                 type: number
 *                 format: decimal
 *                 description: Amount paid
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, CARD, QR, BANK, CHEQUE, CREDIT, OTHER]
 *                 description: Payment method
 *               paidDate:
 *                 type: string
 *                 format: date
 *                 description: Date of payment
 *               note:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       201:
 *         description: Payment created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', verifyToken, validatePayment, paymentController.createPayment);

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get all payments
 *     tags: [Payments]
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
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [CASH, CARD, QR, BANK, CHEQUE, CREDIT, OTHER]
 *         description: Filter by payment method
 *     responses:
 *       200:
 *         description: List of payments
 *       401:
 *         description: Unauthorized
 */
router.get('/', verifyToken, paymentController.getAllPayments);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', verifyToken, paymentController.getPaymentById);

/**
 * @swagger
 * /api/payments/{id}:
 *   put:
 *     summary: Update a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amountPaid:
 *                 type: number
 *                 format: decimal
 *                 description: Amount paid
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, CARD, QR, BANK, CHEQUE, CREDIT, OTHER]
 *                 description: Payment method
 *               paidDate:
 *                 type: string
 *                 format: date
 *                 description: Date of payment
 *               note:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       200:
 *         description: Payment updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', verifyToken, validatePayment, paymentController.updatePayment);

/**
 * @swagger
 * /api/payments/{id}/cancel:
 *   put:
 *     summary: Cancel a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment cancelled successfully
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Unauthorized
 */
router.put('/payments/:id/cancel', verifyToken, paymentController.cancelPayment);

/**
 * @swagger
 * /api/payments/statistics:
 *   get:
 *     summary: Get payment statistics
 *     description: Get aggregated payment statistics by type (GRN/Sale), payment method, and date range
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: paymentType
 *         schema:
 *           type: string
 *           enum: [all, grn, sale]
 *           default: all
 *         description: Filter by payment type (all, grn for GRN payments, sale for sale payments)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *         description: Filter by specific payment method (CASH, CARD, etc.)
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalPayments:
 *                       type: integer
 *                       example: 150
 *                     totalAmount:
 *                       type: number
 *                       example: 1500000.00
 *                     byMethod:
 *                       type: object
 *                       description: Statistics grouped by payment method
 *                       example:
 *                         CASH: { count: 100, total: 800000.00 }
 *                         CARD: { count: 50, total: 700000.00 }
 *                     byType:
 *                       type: object
 *                       description: Statistics grouped by payment type
 *                       example:
 *                         grn: { count: 50, total: 500000.00 }
 *                         sale: { count: 100, total: 1000000.00 }
 *                 filters:
 *                   type: object
 *                   properties:
 *                     paymentType:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                     endDate:
 *                       type: string
 *                     paymentMethod:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/statistics', verifyToken, paymentController.getPaymentStatistics);

module.exports = router;
