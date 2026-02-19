const express = require('express');
const router = express.Router();
const customerPaymentController = require('../../controllers/customers/customerPaymentController');
const { body, param } = require('express-validator');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Customer Payments
 *   description: Customer bill payment management - partial and full payments
 */

// Payment validation
const paymentValidation = [
    body('customerId')
        .notEmpty()
        .withMessage('Customer ID is required')
        .isInt()
        .withMessage('Customer ID must be an integer'),
    body('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isFloat({ gt: 0 })
        .withMessage('Amount must be greater than 0'),
    body('paymentMethod')
        .optional()
        .isIn(['cash', 'card', 'bank_transfer', 'mobile_money', 'cheque', 'loyalty_points', 'credit', 'other'])
        .withMessage('Invalid payment method'),
    body('saleId')
        .optional()
        .isInt()
        .withMessage('Sale ID must be an integer'),
    body('referenceNumber')
        .optional()
        .isString()
        .isLength({ max: 100 }),
    body('bankName')
        .optional()
        .isString()
        .isLength({ max: 100 }),
    body('cardType')
        .optional()
        .isString()
        .isLength({ max: 50 }),
    body('cardLastFour')
        .optional()
        .isString()
        .isLength({ max: 4 }),
    body('notes')
        .optional()
        .isString()
];

/**
 * @swagger
 * /api/customer-payments/outstanding:
 *   get:
 *     summary: Get all outstanding customer bills (unpaid/partial sales)
 *     tags: [Customer Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, partial]
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
 *         description: Search by customer name, code, or phone
 *     responses:
 *       200:
 *         description: List of outstanding bills with summary
 */
router.get(
    '/outstanding',
    checkPermission('view_sales'),
    customerPaymentController.getOutstandingBills
);

/**
 * @swagger
 * /api/customer-payments/customers-with-balance:
 *   get:
 *     summary: Get all customers with outstanding balance
 *     tags: [Customer Payments]
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
 *         description: List of customers with outstanding balances
 */
router.get(
    '/customers-with-balance',
    checkPermission('view_customers'),
    customerPaymentController.getCustomersWithBalance
);

/**
 * @swagger
 * /api/customer-payments/summary/{customerId}:
 *   get:
 *     summary: Get customer outstanding balance summary
 *     tags: [Customer Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customer balance summary with outstanding bills
 *       404:
 *         description: Customer not found
 */
router.get(
    '/summary/:customerId',
    checkPermission('view_customers'),
    param('customerId').isInt().withMessage('Customer ID must be an integer'),
    customerPaymentController.getCustomerOutstandingSummary
);

/**
 * @swagger
 * /api/customer-payments/history/{customerId}:
 *   get:
 *     summary: Get payment history for a customer
 *     tags: [Customer Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
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
    '/history/:customerId',
    checkPermission('view_payments'),
    param('customerId').isInt().withMessage('Customer ID must be an integer'),
    customerPaymentController.getPaymentHistory
);

/**
 * @swagger
 * /api/customer-payments/credits/{customerId}:
 *   get:
 *     summary: Get credit transactions for a customer
 *     tags: [Customer Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
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
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [credit_issued, payment_received, credit_adjustment]
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
 *     responses:
 *       200:
 *         description: Credit transaction history
 */
router.get(
    '/credits/:customerId',
    checkPermission('view_customers'),
    param('customerId').isInt().withMessage('Customer ID must be an integer'),
    customerPaymentController.getCreditTransactions
);

/**
 * @swagger
 * /api/customer-payments:
 *   post:
 *     summary: Receive payment from customer (partial or full)
 *     tags: [Customer Payments]
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
 *               - amount
 *             properties:
 *               customerId:
 *                 type: integer
 *                 description: Customer ID
 *               saleId:
 *                 type: integer
 *                 description: Optional - specific sale to pay. If not provided, pays oldest sales first (FIFO)
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, bank_transfer, mobile_money, cheque, loyalty_points, credit, other]
 *                 default: cash
 *               referenceNumber:
 *                 type: string
 *               bankName:
 *                 type: string
 *               cardType:
 *                 type: string
 *               cardLastFour:
 *                 type: string
 *               notes:
 *                 type: string
 *           example:
 *             customerId: 1
 *             amount: 25000
 *             paymentMethod: cash
 *             notes: "Customer paid outstanding balance"
 *     responses:
 *       201:
 *         description: Payment received successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Customer or Sale not found
 */
router.post(
    '/',
    checkPermission('create_payments'),
    paymentValidation,
    customerPaymentController.receivePayment
);

module.exports = router;
