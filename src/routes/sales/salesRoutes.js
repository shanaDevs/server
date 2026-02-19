const express = require('express');
const router = express.Router();
const salesController = require('../../controllers/sales/salesController');
const { body } = require('express-validator');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Sales management including returns and refunds
 */

// Validation rules
const saleValidation = [
    body().custom((value, { req }) => {
        const hasItems = Array.isArray(req.body.items) && req.body.items.length > 0;
        const hasReturnItems = Array.isArray(req.body.returnItems) && req.body.returnItems.length > 0;
        if (!hasItems && !hasReturnItems) {
            throw new Error('Transaction must contain at least one sale item or return item');
        }
        return true;
    }),
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.productId').isInt().withMessage('Product ID is required'),
    body('items.*.quantity').isFloat({ min: 0.001 }).withMessage('Quantity must be greater than 0'),
    body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
    body('customerId').optional().isInt(),
    body('discountPercentage').optional().isFloat({ min: 0, max: 100 }),
    body('taxPercentage').optional().isFloat({ min: 0, max: 100 })
];

const paymentValidation = [
    body('paymentMethod').isIn(['cash', 'card', 'bank_transfer', 'mobile_money', 'cheque', 'loyalty_points', 'credit', 'other']).withMessage('Invalid payment method'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
];

const returnValidation = [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required for return'),
    body('items.*.saleItemId').isInt().withMessage('Sale item ID is required'),
    body('items.*.quantity').isFloat({ min: 0.001 }).withMessage('Return quantity must be greater than 0'),
    body('reason').optional().trim()
];

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Get all sales
 *     tags: [Sales]
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
 *         name: customerId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, partial, paid, refunded, cancelled]
 *       - in: query
 *         name: saleStatus
 *         schema:
 *           type: string
 *           enum: [draft, completed, cancelled, returned]
 *       - in: query
 *         name: saleType
 *         schema:
 *           type: string
 *           enum: [retail, wholesale, online, phone_order]
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
 *         name: cashierId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of sales with payment summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sales:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       saleNumber:
 *                         type: string
 *                       customerId:
 *                         type: integer
 *                       totalAmount:
 *                         type: number
 *                       paymentStatus:
 *                         type: string
 *                         enum: [pending, partial, paid, refunded, cancelled]
 *                       saleStatus:
 *                         type: string
 *                       paymentSummary:
 *                         type: object
 *                         properties:
 *                           totalAmount:
 *                             type: number
 *                             description: Total sale amount
 *                           paidAmount:
 *                             type: number
 *                             description: Amount paid so far
 *                           remainingAmount:
 *                             type: number
 *                             description: Amount remaining to pay (for partial payments)
 *                           changeAmount:
 *                             type: number
 *                             description: Change amount (for overpayment)
 *                           paymentStatus:
 *                             type: string
 *                             enum: [pending, partial, paid, refunded, cancelled]
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalSales:
 *                   type: integer
 */
router.get('/', checkPermission('view_sales'), salesController.getAllSales);

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     summary: Get sale by ID
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sale details with items, payments, and payment summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sale:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     saleNumber:
 *                       type: string
 *                     totalAmount:
 *                       type: number
 *                     paymentStatus:
 *                       type: string
 *                       enum: [pending, partial, paid, refunded, cancelled]
 *                     items:
 *                       type: array
 *                       description: Sale items
 *                     payments:
 *                       type: array
 *                       description: Payment records
 *                 paymentSummary:
 *                   type: object
 *                   properties:
 *                     totalAmount:
 *                       type: number
 *                       description: Total sale amount
 *                     paidAmount:
 *                       type: number
 *                       description: Amount paid so far
 *                     remainingAmount:
 *                       type: number
 *                       description: Amount remaining to pay (for partial payments)
 *                     changeAmount:
 *                       type: number
 *                       description: Change amount (for overpayment)
 *                     paymentStatus:
 *                       type: string
 *                       enum: [pending, partial, paid, refunded, cancelled]
 *                       description: Payment status - 'partial' when payment is incomplete
 *       404:
 *         description: Sale not found
 */
router.get('/:id', checkPermission('view_sales'), salesController.getSaleById);

/**
 * @swagger
 * /api/sales:
 *   post:
 *     summary: Create new sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               customerId:
 *                 type: integer
 *                 description: Customer ID (optional for walk-in customers)
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                     - unitPrice
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *                     unit:
 *                       type: string
 *                     discountPercentage:
 *                       type: number
 *                     discountAmount:
 *                       type: number
 *                     notes:
 *                       type: string
 *               payments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     paymentMethod:
 *                       type: string
 *                       enum: [cash, card, bank_transfer, mobile_money, cheque, loyalty_points, credit, other]
 *                     amount:
 *                       type: number
 *                     referenceNumber:
 *                       type: string
 *                     cardType:
 *                       type: string
 *                     cardLastFour:
 *                       type: string
 *                     bankName:
 *                       type: string
 *               discountPercentage:
 *                 type: number
 *               discountAmount:
 *                 type: number
 *               taxPercentage:
 *                 type: number
 *                 description: Manual tax percentage override (overrides per-item taxes)
 *               taxAmount:
 *                 type: number
 *                 description: Manual tax amount override (fixed amount, takes precedence over percentage)
 *               enableTax:
 *                 type: boolean
 *                 description: Override system tax setting (true=enable, false=disable, null=use system setting)
 *               loyaltyPointsRedeemed:
 *                 type: integer
 *               saleType:
 *                 type: string
 *                 enum: [retail, wholesale, online, phone_order]
 *               notes:
 *                 type: string
 *               customerNotes:
 *                 type: string
 *               promotionId:
 *                 type: integer
 *                 description: ID of applied promotion
 *               promoCode:
 *                 type: string
 *                 description: Coupon code applied
 *               counterSessionId:
 *                 type: integer
 *                 description: Counter session ID
 *               returnItems:
 *                 type: array
 *                 description: Simultaneous returns to process with the sale
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *                     discountAmount:
 *                       type: number
 *                     discountPercentage:
 *                       type: number
 *                     returnReason:
 *                       type: string
 *                     condition:
 *                       type: string
 *                       enum: [good, damaged, defective, expired]
 *     responses:
 *       201:
 *         description: Sale created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 sale:
 *                   type: object
 *                   description: Complete sale object with items and payments
 *                 paymentSummary:
 *                   type: object
 *                   properties:
 *                     totalAmount:
 *                       type: number
 *                       description: Total sale amount
 *                     paidAmount:
 *                       type: number
 *                       description: Amount paid
 *                     remainingAmount:
 *                       type: number
 *                       description: Amount remaining to pay (0 if fully paid, >0 for partial payments)
 *                     changeAmount:
 *                       type: number
 *                       description: Change amount (for overpayment)
 *                     paymentStatus:
 *                       type: string
 *                       enum: [pending, partial, paid, refunded, cancelled]
 *                       description: Payment status - 'partial' when remainingAmount > 0 and paidAmount > 0
 *       400:
 *         description: Invalid input or insufficient stock
 */
router.post('/', checkPermission('create_sales'), saleValidation, salesController.createSale);

/**
 * @swagger
 * /api/sales/{id}:
 *   put:
 *     summary: Update sale notes
 *     tags: [Sales]
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
 *             properties:
 *               notes:
 *                 type: string
 *               customerNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sale updated successfully
 */
router.put('/:id', checkPermission('update_sales'), salesController.updateSale);

/**
 * @swagger
 * /api/sales/{id}/cancel:
 *   post:
 *     summary: Cancel a sale
 *     tags: [Sales]
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
 *     responses:
 *       200:
 *         description: Sale cancelled successfully
 *       400:
 *         description: Cannot cancel this sale
 */
router.post('/:id/cancel', checkPermission('cancel_sales'), salesController.cancelSale);

/**
 * @swagger
 * /api/sales/{id}/return:
 *   post:
 *     summary: Process sale return and refund
 *     description: Process a sale return by returning items to inventory and issuing a refund
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale ID to process return for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 description: Items to return
 *                 items:
 *                   type: object
 *                   required:
 *                     - saleItemId
 *                     - quantity
 *                   properties:
 *                     saleItemId:
 *                       type: integer
 *                       description: ID of the sale item to return
 *                       example: 1
 *                     quantity:
 *                       type: number
 *                       description: Quantity to return
 *                       example: 2
 *               reason:
 *                 type: string
 *                 description: Reason for the return
 *                 example: Defective product
 *               refundMethod:
 *                 type: string
 *                 description: Method of refund
 *                 enum: [cash, card, bank_transfer, mobile_money, cheque, other]
 *                 example: cash
 *     responses:
 *       201:
 *         description: Return processed successfully
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
 *                   example: Sale return processed successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid return request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sale not found
 */
router.post('/:id/return', checkPermission('return_sales'), returnValidation, salesController.returnSale);

/**
 * @swagger
 * /api/sales/payments/search:
 *   get:
 *     summary: Search for sale payments by invoice number
 *     description: Search for a sale and its payments using the invoice number (saleNumber). Useful for looking up outstanding balances and payment history.
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: invoiceNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice number to search for (supports partial match)
 *         example: SAL-20260120-0001
 *     responses:
 *       200:
 *         description: Sale payments found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sale:
 *                   type: object
 *                 payments:
 *                   type: array
 *                 paymentSummary:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: string
 *                       enum: [pending, partial, paid]
 *                       description: Current payment action status
 *                     isFullyPaid:
 *                       type: boolean
 *       404:
 *         description: Sale not found
 */
router.get('/payments/search', checkPermission('view_payments'), salesController.searchSalePayments);

/**
 * @swagger
 * /api/sales/{id}/payments:
 *   get:
 *     summary: Get sale payments by ID or invoice number
 *     description: Retrieve all payments for a sale. The {id} can be either the sale ID or invoice number (saleNumber). Supports partial search via query parameter.
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sale ID or Invoice Number (e.g., SAL-20260120-0001)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Optional search term to find sale by partial invoice number
 *     responses:
 *       200:
 *         description: Sale payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sale:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     invoiceNumber:
 *                       type: string
 *                     saleDate:
 *                       type: string
 *                       format: date-time
 *                     saleStatus:
 *                       type: string
 *                     paymentStatus:
 *                       type: string
 *                     customer:
 *                       type: object
 *                 payments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       paymentDate:
 *                         type: string
 *                         format: date-time
 *                       paymentMethod:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       referenceNumber:
 *                         type: string
 *                       processedBy:
 *                         type: object
 *                 paymentSummary:
 *                   type: object
 *                   properties:
 *                     invoiceNumber:
 *                       type: string
 *                     totalAmount:
 *                       type: number
 *                     paidAmount:
 *                       type: number
 *                     remainingAmount:
 *                       type: number
 *                     changeAmount:
 *                       type: number
 *                     paymentStatus:
 *                       type: string
 *                       enum: [pending, partial, paid, refunded, cancelled]
 *                     action:
 *                       type: string
 *                       description: Display action - 'paid' if fully paid, 'partial' if partially paid, 'pending' if no payment
 *                       enum: [pending, partial, paid]
 *                     isFullyPaid:
 *                       type: boolean
 *                     paymentCount:
 *                       type: integer
 *                     percentagePaid:
 *                       type: integer
 *                       description: Percentage of total amount paid (0-100)
 *       404:
 *         description: Sale not found
 */
router.get('/:id/payments', checkPermission('view_payments'), salesController.getSalePayments);

/**
 * @swagger
 * /api/sales/{id}/payments:
 *   post:
 *     summary: Add payment to existing sale
 *     description: Add a payment to an existing sale. The {id} can be either the sale ID or invoice number. Shows 'paid' action when fully paid, 'partial' when partially paid.
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sale ID or Invoice Number (e.g., SAL-20260120-0001)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *               - amount
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, bank_transfer, mobile_money, cheque, loyalty_points, credit, other]
 *               amount:
 *                 type: number
 *               referenceNumber:
 *                 type: string
 *               cardType:
 *                 type: string
 *               cardLastFour:
 *                 type: string
 *               bankName:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   description: Shows 'Payment completed - Sale fully paid' or 'Partial payment added successfully'
 *                 sale:
 *                   type: object
 *                   description: Updated sale object with payments included
 *                 paymentSummary:
 *                   type: object
 *                   properties:
 *                     invoiceNumber:
 *                       type: string
 *                       description: Sale invoice number
 *                     totalAmount:
 *                       type: number
 *                       description: Total sale amount
 *                     paidAmount:
 *                       type: number
 *                       description: Total amount paid (including this payment)
 *                     remainingAmount:
 *                       type: number
 *                       description: Amount remaining to pay after this payment
 *                     changeAmount:
 *                       type: number
 *                       description: Change amount if overpaid
 *                     paymentStatus:
 *                       type: string
 *                       enum: [pending, partial, paid, refunded, cancelled]
 *                       description: Updated payment status - changes to 'paid' when fully paid, 'partial' when partially paid
 *                     action:
 *                       type: string
 *                       enum: [partial, paid]
 *                       description: Display action - 'paid' when fully paid, 'partial' when partially paid
 *                     isFullyPaid:
 *                       type: boolean
 *                       description: True if sale is fully paid
 *                     paymentCount:
 *                       type: integer
 *                       description: Total number of payments made for this sale
 *       400:
 *         description: Invalid payment amount or sale already fully paid
 *       404:
 *         description: Sale not found
 */
router.post('/:id/payments', checkPermission('create_payments'), paymentValidation, salesController.addPayment);

/**
 * @swagger
 * /api/sales/reports/daily:
 *   get:
 *     summary: Get daily sales report
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for the report (defaults to today)
 *     responses:
 *       200:
 *         description: Daily sales report with revenue, payment breakdown, and cashier performance
 */
router.get('/reports/daily', checkPermission('view_sales_reports'), salesController.getDailySalesReport);

/**
 * @swagger
 * /api/sales/{id}:
 *   delete:
 *     summary: Delete sale (soft delete)
 *     tags: [Sales]
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
 *         description: Sale deleted successfully
 *       400:
 *         description: Cannot delete completed sales
 */
router.delete('/:id', checkPermission('delete_sales'), salesController.deleteSale);

/**
 * @swagger
 * /api/sales/{id}/pdf:
 *   get:
 *     summary: Generate and download sales receipt as PDF
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale ID
 *       - in: query
 *         name: paperSize
 *         schema:
 *           type: string
 *           enum: [A4, A5, THERMAL_80MM]
 *           default: A4
 *         description: Paper size for the receipt (A4 standard, A5 compact, THERMAL_80MM for thermal printers)
 *     responses:
 *       200:
 *         description: PDF receipt generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Sale not found
 */
router.get('/:id/pdf', salesController.generateSaleReceiptPDF);

/**
 * @swagger
 * /api/sales/validate-promotion:
 *   post:
 *     summary: Validate and calculate promotion discount
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - promoCode
 *             properties:
 *               promoCode:
 *                 type: string
 *               customerId:
 *                 type: integer
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *     responses:
 *       200:
 *         description: Promotion is valid and discount calculated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     promotion:
 *                       type: object
 *                     application:
 *                       type: object
 *                       properties:
 *                         discount:
 *                           type: number
 *                         message:
 *                           type: string
 *       400:
 *         description: Invalid promo code
 */
router.post('/validate-promotion', salesController.validatePromotion);

// Import sale returns controller
const saleReturnsController = require('../../controllers/sales/saleReturnsController');

/**
 * @swagger
 * /api/sales/{id}/add-returns:
 *   post:
 *     summary: Add return items to an existing sale
 *     description: Add returned items to a sale within the same transaction, updating inventory and calculating net payable
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - returnItems
 *             properties:
 *               returnItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *                     discountAmount:
 *                       type: number
 *                     discountPercentage:
 *                       type: number
 *                     returnReason:
 *                       type: string
 *                     condition:
 *                       type: string
 *                       enum: [good, damaged, defective, expired]
 *               returnReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns added successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Sale not found
 */
router.post('/:id/add-returns', checkPermission('return_sales'), saleReturnsController.addReturnsToSale);

/**
 * @swagger
 * /api/sales/{id}/returns:
 *   get:
 *     summary: Get return items for a sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale ID
 *     responses:
 *       200:
 *         description: Return items retrieved successfully
 *       404:
 *         description: Sale not found
 */
router.get('/:id/returns', checkPermission('view_sales'), saleReturnsController.getSaleReturns);

module.exports = router;
