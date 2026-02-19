const express = require('express');
const router = express.Router();
const customerController = require('../../controllers/customers/customerController');
const { body } = require('express-validator');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customer management including loyalty and credit
 */

// Validation rules for customer
const customerValidation = [
    body('customerName').trim().notEmpty().withMessage('Customer name is required'),
    body('email').optional().isEmail().withMessage('Invalid email address'),
    body('phone').optional().trim(),
    body('customerType').optional().isIn(['retail', 'wholesale', 'distributor', 'vip']).withMessage('Invalid customer type'),
    body('creditLimit').optional().isFloat({ min: 0 }).withMessage('Credit limit must be non-negative'),
    body('discountPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100')
];

const customerUpdateValidation = [
    body('customerName').optional().trim().notEmpty().withMessage('Customer name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email address'),
    body('phone').optional().trim(),
    body('customerType').optional().isIn(['retail', 'wholesale', 'distributor', 'vip']).withMessage('Invalid customer type'),
    body('creditLimit').optional().isFloat({ min: 0 }).withMessage('Credit limit must be non-negative'),
    body('discountPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100')
];

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
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
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: customerType
 *         schema:
 *           type: string
 *           enum: [retail, wholesale, distributor, vip]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of customers
 */
router.get('/', checkPermission('view_customers'), customerController.getAllCustomers);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
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
 *         description: Customer details
 *       404:
 *         description: Customer not found
 */
router.get('/:id', checkPermission('view_customers'), customerController.getCustomerById);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerName
 *             properties:
 *               customerCode:
 *                 type: string
 *                 description: Auto-generated (CUS-0001, CUS-0002, etc.)
 *               customerName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               customerBirthday:
 *                 type: string
 *                 format: date
 *               city:
 *                 type: string
 *               customerType:
 *                 type: string
 *                 enum: [retail, wholesale, distributor, vip]
 *               creditLimit:
 *                 type: number
 *               discountPercentage:
 *                 type: number
 *     responses:
 *       201:
 *         description: Customer created successfully
 */
router.post('/', checkPermission('create_customers'), customerValidation, customerController.createCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update customer
 *     tags: [Customers]
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
 *     responses:
 *       200:
 *         description: Customer updated successfully
 */
router.put('/:id', checkPermission('update_customers'), customerUpdateValidation, customerController.updateCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Delete customer
 *     tags: [Customers]
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
 *         description: Customer deleted successfully
 */
router.delete('/:id', checkPermission('delete_customers'), customerController.deleteCustomer);

/**
 * @swagger
 * /api/customers/{id}/toggle-status:
 *   patch:
 *     summary: Toggle customer active status
 *     tags: [Customers]
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
 *         description: Customer status toggled successfully
 */
router.patch('/:id/toggle-status', checkPermission('update_customers'), customerController.toggleCustomerStatus);

/**
 * @swagger
 * /api/customers/{id}/purchase-history:
 *   get:
 *     summary: Get customer purchase history
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *     responses:
 *       200:
 *         description: Customer purchase history
 */
router.get('/:id/purchase-history', checkPermission('view_customers'), customerController.getCustomerPurchaseHistory);

/**
 * @swagger
 * /api/customers/{id}/loyalty-points:
 *   get:
 *     summary: Get customer loyalty points
 *     tags: [Customers]
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
 *         description: Customer loyalty points details
 */
router.get('/:id/loyalty-points', checkPermission('view_customers'), customerController.getCustomerLoyaltyPoints);

/**
 * @swagger
 * /api/customers/{id}/loyalty-points/add:
 *   post:
 *     summary: Add loyalty points to customer
 *     tags: [Customers]
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
 *               - points
 *             properties:
 *               points:
 *                 type: integer
 *               referenceType:
 *                 type: string
 *               referenceId:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Loyalty points added successfully
 */
router.post('/:id/loyalty-points/add', checkPermission('manage_loyalty'), customerController.addLoyaltyPoints);

/**
 * @swagger
 * /api/customers/{id}/loyalty-points/redeem:
 *   post:
 *     summary: Redeem customer loyalty points
 *     tags: [Customers]
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
 *               - points
 *             properties:
 *               points:
 *                 type: integer
 *               referenceType:
 *                 type: string
 *               referenceId:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Loyalty points redeemed successfully
 */
router.post('/:id/loyalty-points/redeem', checkPermission('manage_loyalty'), customerController.redeemLoyaltyPoints);

/**
 * @swagger
 * /api/customers/{id}/credit-history:
 *   get:
 *     summary: Get customer credit history
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, partial, paid, overdue, written_off]
 *     responses:
 *       200:
 *         description: Customer credit history
 */
router.get('/:id/credit-history', checkPermission('view_customers'), customerController.getCustomerCreditHistory);

/**
 * @swagger
 * /api/customers/{id}/credit/issue:
 *   post:
 *     summary: Issue credit to customer
 *     tags: [Customers]
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
 *               referenceType:
 *                 type: string
 *               referenceId:
 *                 type: integer
 *               dueDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Credit issued successfully
 */
router.post('/:id/credit/issue', checkPermission('manage_credit'), customerController.issueCredit);

/**
 * @swagger
 * /api/customers/{id}/credit/payment:
 *   post:
 *     summary: Receive payment from customer
 *     tags: [Customers]
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
 *                 enum: [cash, card, bank_transfer, mobile_money, cheque, other]
 *               referenceId:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment received successfully
 */
router.post('/:id/credit/payment', checkPermission('manage_credit'), customerController.receivePayment);

/**
 * @swagger
 * /api/customers/{id}/statistics:
 *   get:
 *     summary: Get customer statistics
 *     tags: [Customers]
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
 *         description: Customer statistics including purchases, loyalty, and credit info
 */
router.get('/:id/statistics', checkPermission('view_customers'), customerController.getCustomerStatistics);

module.exports = router;
