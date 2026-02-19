const express = require('express');
const router = express.Router();
const supplierPaymentController = require('../../controllers/suppliers/supplierPaymentController');
const { body, param } = require('express-validator');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Supplier Payments
 *   description: Supplier bill payment management - partial and full payments
 */

// Payment validation
const paymentValidation = [
    body('supplierId')
        .notEmpty()
        .withMessage('Supplier ID is required')
        .isInt()
        .withMessage('Supplier ID must be an integer'),
    body('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isFloat({ gt: 0 })
        .withMessage('Amount must be greater than 0'),
    body('paymentMethod')
        .optional()
        .isIn(['cash', 'card', 'bank_transfer', 'cheque', 'mobile_money', 'other'])
        .withMessage('Invalid payment method'),
    body('grnId')
        .optional()
        .isInt()
        .withMessage('GRN ID must be an integer'),
    body('referenceNumber')
        .optional()
        .isString()
        .isLength({ max: 100 }),
    body('bankName')
        .optional()
        .isString()
        .isLength({ max: 100 }),
    body('chequeNumber')
        .optional()
        .isString()
        .isLength({ max: 50 }),
    body('chequeDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid cheque date format'),
    body('notes')
        .optional()
        .isString()
];

/**
 * @swagger
 * /api/supplier-payments/outstanding:
 *   get:
 *     summary: Get all outstanding supplier bills
 *     tags: [Supplier Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: integer
 *         description: Filter by supplier ID
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, partial]
 *         description: Filter by payment status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by supplier name or code
 *     responses:
 *       200:
 *         description: List of outstanding bills with summary
 */
router.get(
    '/outstanding',
    checkPermission('view_grns'),
    supplierPaymentController.getOutstandingBills
);

/**
 * @swagger
 * /api/supplier-payments/suppliers-with-balance:
 *   get:
 *     summary: Get all suppliers with outstanding balance
 *     tags: [Supplier Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: minBalance
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxBalance
 *         schema:
 *           type: number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of suppliers with outstanding balances
 */
router.get(
    '/suppliers-with-balance',
    checkPermission('view_suppliers'),
    supplierPaymentController.getSuppliersWithBalance
);

/**
 * @swagger
 * /api/supplier-payments/summary/{supplierId}:
 *   get:
 *     summary: Get supplier outstanding balance summary
 *     tags: [Supplier Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Supplier balance summary with outstanding bills
 *       404:
 *         description: Supplier not found
 */
router.get(
    '/summary/:supplierId',
    checkPermission('view_suppliers'),
    param('supplierId').isInt().withMessage('Supplier ID must be an integer'),
    supplierPaymentController.getSupplierOutstandingSummary
);

/**
 * @swagger
 * /api/supplier-payments/history/{supplierId}:
 *   get:
 *     summary: Get payment history for a supplier
 *     tags: [Supplier Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
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
 *         name: paymentMethod
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment history
 */
router.get(
    '/history/:supplierId',
    checkPermission('view_payments'),
    param('supplierId').isInt().withMessage('Supplier ID must be an integer'),
    supplierPaymentController.getPaymentHistory
);

/**
 * @swagger
 * /api/supplier-payments/{id}:
 *   get:
 *     summary: Get single payment details
 *     tags: [Supplier Payments]
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
 *         description: Payment details
 *       404:
 *         description: Payment not found
 */
router.get(
    '/:id',
    checkPermission('view_payments'),
    param('id').isInt().withMessage('Payment ID must be an integer'),
    supplierPaymentController.getPaymentById
);

/**
 * @swagger
 * /api/supplier-payments:
 *   post:
 *     summary: Make payment to supplier (partial or full)
 *     tags: [Supplier Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplierId
 *               - amount
 *             properties:
 *               supplierId:
 *                 type: integer
 *                 description: Supplier ID
 *               grnId:
 *                 type: integer
 *                 description: Optional - specific GRN to pay. If not provided, pays oldest GRNs first (FIFO)
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, bank_transfer, cheque, mobile_money, other]
 *                 default: cash
 *               referenceNumber:
 *                 type: string
 *                 description: Transaction/reference number
 *               bankName:
 *                 type: string
 *               chequeNumber:
 *                 type: string
 *               chequeDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *           example:
 *             supplierId: 1
 *             amount: 50000
 *             paymentMethod: bank_transfer
 *             referenceNumber: "TXN123456"
 *             bankName: "Commercial Bank"
 *             notes: "Partial payment for December purchases"
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Supplier or GRN not found
 */
router.post(
    '/',
    checkPermission('create_payments'),
    paymentValidation,
    supplierPaymentController.makePayment
);

/**
 * @swagger
 * /api/supplier-payments/{id}/cancel:
 *   put:
 *     summary: Cancel a payment
 *     tags: [Supplier Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Payment cancelled
 *       404:
 *         description: Payment not found
 */
router.put(
    '/:id/cancel',
    checkPermission('delete_payments'),
    param('id').isInt().withMessage('Payment ID must be an integer'),
    supplierPaymentController.cancelPayment
);

module.exports = router;
