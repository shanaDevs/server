const express = require('express');
const router = express.Router();
const expenseController = require('../../controllers/expenses/expenseController');
const { body } = require('express-validator');
const { verifyToken, checkPermission } = require('../../middlewares/auth');

// Validation rules
const expenseValidation = [
    body('category')
        .isIn([
            'UTILITIES', 'RENT', 'SALARIES', 'SUPPLIES', 'MAINTENANCE',
            'MARKETING', 'TRANSPORTATION', 'INSURANCE', 'TAXES',
            'EQUIPMENT', 'INVENTORY', 'PROFESSIONAL_FEES', 'MISCELLANEOUS', 'OTHER'
        ])
        .withMessage('Invalid expense category'),
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Expense title is required')
        .isLength({ max: 255 })
        .withMessage('Title must not exceed 255 characters'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    body('paymentMethod')
        .optional()
        .isIn(['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'OTHER'])
        .withMessage('Invalid payment method'),
    body('paymentStatus')
        .optional()
        .isIn(['PAID', 'PENDING', 'PARTIAL', 'CANCELLED'])
        .withMessage('Invalid payment status')
];

const updateExpenseValidation = [
    body('category')
        .optional()
        .isIn([
            'UTILITIES', 'RENT', 'SALARIES', 'SUPPLIES', 'MAINTENANCE',
            'MARKETING', 'TRANSPORTATION', 'INSURANCE', 'TAXES',
            'EQUIPMENT', 'INVENTORY', 'PROFESSIONAL_FEES', 'MISCELLANEOUS', 'OTHER'
        ])
        .withMessage('Invalid expense category'),
    body('title')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Expense title cannot be empty')
        .isLength({ max: 255 })
        .withMessage('Title must not exceed 255 characters'),
    body('amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    body('paymentMethod')
        .optional()
        .isIn(['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'OTHER'])
        .withMessage('Invalid payment method'),
    body('paymentStatus')
        .optional()
        .isIn(['PAID', 'PENDING', 'PARTIAL', 'CANCELLED'])
        .withMessage('Invalid payment status')
];

// Apply authentication to all routes
router.use(verifyToken);

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: Get all expenses
 *     tags: [Expenses]
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
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
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
 *         description: List of expenses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get(
    '/',
    checkPermission(['MANAGE_EXPENSES', 'VIEW_EXPENSES']),
    expenseController.getAllExpenses
);

/**
 * @swagger
 * /api/expenses/statistics:
 *   get:
 *     summary: Get expense statistics
 *     tags: [Expenses]
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
 *     responses:
 *       200:
 *         description: Expense statistics
 */
router.get(
    '/statistics',
    checkPermission(['MANAGE_EXPENSES', 'VIEW_EXPENSES']),
    expenseController.getExpenseStatistics
);

/**
 * @swagger
 * /api/expenses/pending:
 *   get:
 *     summary: Get pending expenses
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending expenses
 */
router.get(
    '/pending',
    checkPermission(['MANAGE_EXPENSES', 'VIEW_EXPENSES']),
    expenseController.getPendingExpenses
);

/**
 * @swagger
 * /api/expenses/recurring-due:
 *   get:
 *     summary: Get recurring expenses due
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of due recurring expenses
 */
router.get(
    '/recurring-due',
    checkPermission(['MANAGE_EXPENSES']),
    expenseController.getRecurringExpensesDue
);

/**
 * @swagger
 * /api/expenses/category/{category}:
 *   get:
 *     summary: Get expenses by category
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expenses in category
 */
router.get(
    '/category/:category',
    checkPermission(['MANAGE_EXPENSES', 'VIEW_EXPENSES']),
    expenseController.getExpensesByCategory
);

/**
 * @swagger
 * /api/expenses/{id}:
 *   get:
 *     summary: Get expense by ID
 *     tags: [Expenses]
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
 *         description: Expense details
 *       404:
 *         description: Expense not found
 */
router.get(
    '/:id',
    checkPermission(['MANAGE_EXPENSES', 'VIEW_EXPENSES']),
    expenseController.getExpenseById
);

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Create new expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - amount
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *               amount:
 *                 type: number
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *               paymentStatus:
 *                 type: string
 *               expenseDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Expense created
 *       400:
 *         description: Validation error
 */
router.post(
    '/',
    checkPermission(['MANAGE_EXPENSES']),
    expenseValidation,
    expenseController.createExpense
);

/**
 * @swagger
 * /api/expenses/{id}:
 *   put:
 *     summary: Update expense
 *     tags: [Expenses]
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
 *               title:
 *                 type: string
 *               amount:
 *                 type: number
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Expense updated
 *       404:
 *         description: Expense not found
 */
router.put(
    '/:id',
    checkPermission(['MANAGE_EXPENSES']),
    updateExpenseValidation,
    expenseController.updateExpense
);

/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     summary: Delete expense
 *     tags: [Expenses]
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
 *         description: Expense deleted
 *       404:
 *         description: Expense not found
 */
router.delete(
    '/:id',
    checkPermission(['MANAGE_EXPENSES']),
    expenseController.deleteExpense
);

/**
 * @swagger
 * /api/expenses/{id}/mark-paid:
 *   post:
 *     summary: Mark expense as paid
 *     tags: [Expenses]
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
 *               paymentMethod:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Expense marked as paid
 */
router.post(
    '/:id/mark-paid',
    checkPermission(['MANAGE_EXPENSES']),
    expenseController.markAsPaid
);

/**
 * @swagger
 * /api/expenses/{id}/partial-payment:
 *   post:
 *     summary: Record partial payment
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       200:
 *         description: Partial payment recorded
 */
router.post(
    '/:id/partial-payment',
    checkPermission(['MANAGE_EXPENSES']),
    expenseController.recordPartialPayment
);

module.exports = router;
