const express = require('express');
const router = express.Router();
const customerDiscountController = require('../../controllers/customers/customerDiscountController');
const { body } = require('express-validator');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Customer Discounts
 *   description: Customer-specific product discount management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CustomerDiscount:
 *       type: object
 *       required:
 *         - customerId
 *         - productId
 *         - discountPercentage
 *         - discountAmount
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated discount ID
 *         customerId:
 *           type: integer
 *           description: Customer ID
 *         productId:
 *           type: integer
 *           description: Product ID
 *         discountPercentage:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           maximum: 100
 *           description: Discount percentage (0-100)
 *         discountAmount:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           description: Fixed discount amount
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *       example:
 *         customerId: 1
 *         productId: 5
 *         discountPercentage: 10.50
 *         discountAmount: 50.00
 */

// Validation rules for customer discount
const customerDiscountValidation = [
    body('customerId').isInt({ min: 1 }).withMessage('Valid customer ID is required'),
    body('productId').isInt({ min: 1 }).withMessage('Valid product ID is required'),
    body('discount_percentage').isFloat({ min: 0, max: 100 }).withMessage('Discount percentage must be between 0 and 100'),
    body('discount_amount').isFloat({ min: 0 }).withMessage('Discount amount must be non-negative')
];

const customerDiscountUpdateValidation = [
    body('discount_percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount percentage must be between 0 and 100'),
    body('discount_amount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be non-negative')
];

/**
 * @swagger
 * /api/customer-discounts:
 *   post:
 *     summary: Create a new customer discount
 *     tags: [Customer Discounts]
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
 *               - productId
 *               - discountPercentage
 *               - discountAmount
 *             properties:
 *               customerId:
 *                 type: integer
 *                 example: 1
 *               productId:
 *                 type: integer
 *                 example: 5
 *               discountPercentage:
 *                 type: number
 *                 format: decimal
 *                 example: 10.50
 *               discountAmount:
 *                 type: number
 *                 format: decimal
 *                 example: 50.00
 *     responses:
 *       201:
 *         description: Customer discount created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Customer discount created successfully
 *                 data:
 *                   $ref: '#/components/schemas/CustomerDiscount'
 *       400:
 *         description: Invalid input or customer/product not found
 *       401:
 *         description: Unauthorized
 */
router.post('/', checkPermission('manage_customers'), customerDiscountValidation, customerDiscountController.createCustomerDiscount);

/**
 * @swagger
 * /api/customer-discounts:
 *   get:
 *     summary: Get all customer discounts
 *     tags: [Customer Discounts]
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
 *         description: Number of items per page
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *         description: Filter by product ID
 *     responses:
 *       200:
 *         description: List of customer discounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CustomerDiscount'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', checkPermission('view_customers'), customerDiscountController.getAllCustomerDiscounts);

/**
 * @swagger
 * /api/customer-discounts/customer/{customerId}/product/{productId}:
 *   get:
 *     summary: Get customer discount by customer and product ID
 *     tags: [Customer Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Customer discount details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CustomerDiscount'
 *       404:
 *         description: Customer discount not found
 *       401:
 *         description: Unauthorized
 */
router.get('/customer/:customerId/product/:productId', checkPermission('view_customers'), customerDiscountController.getCustomerDiscountByIds);

/**
 * @swagger
 * /api/customer-discounts/customer/{customerId}:
 *   get:
 *     summary: Get all discounts for a specific customer
 *     tags: [Customer Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: List of discounts for the customer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CustomerDiscount'
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 */
router.get('/customer/:customerId', checkPermission('view_customers'), customerDiscountController.getDiscountsByCustomer);

/**
 * @swagger
 * /api/customer-discounts/customer/{customerId}/product/{productId}:
 *   put:
 *     summary: Update customer discount
 *     tags: [Customer Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               discountPercentage:
 *                 type: number
 *                 format: decimal
 *                 example: 15.00
 *               discountAmount:
 *                 type: number
 *                 format: decimal
 *                 example: 75.00
 *     responses:
 *       200:
 *         description: Customer discount updated successfully
 *       404:
 *         description: Customer discount not found
 *       401:
 *         description: Unauthorized
 */
router.put('/customer/:customerId/product/:productId', checkPermission('manage_customers'), customerDiscountUpdateValidation, customerDiscountController.updateCustomerDiscount);

/**
 * @swagger
 * /api/customer-discounts/customer/{customerId}/product/{productId}:
 *   delete:
 *     summary: Delete customer discount
 *     tags: [Customer Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Customer discount deleted successfully
 *       404:
 *         description: Customer discount not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/customer/:customerId/product/:productId', checkPermission('manage_customers'), customerDiscountController.deleteCustomerDiscount);

module.exports = router;
