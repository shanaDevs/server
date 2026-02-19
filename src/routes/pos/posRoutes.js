const express = require('express');
const router = express.Router();
const posController = require('../../controllers/pos/posController');
const { body } = require('express-validator');
const { verifyToken, checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: POS
 *   description: Unified POS transaction endpoints (Sales + Payments)
 */

/**
 * @swagger
 * /api/pos/transaction:
 *   post:
 *     summary: Create complete POS transaction (Sale + Payments)
 *     description: Creates a sale with items and processes payments in a single transaction
 *     tags: [POS]
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
 *               - payments
 *             properties:
 *               customerId:
 *                 type: integer
 *                 description: Customer ID (optional for walk-in customers)
 *                 example: 123
 *               items:
 *                 type: array
 *                 description: Array of sale items
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                     - unitPrice
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: number
 *                       example: 2
 *                     unitPrice:
 *                       type: number
 *                       example: 1500.00
 *                     discount:
 *                       type: number
 *                       example: 100.00
 *               payments:
 *                 type: array
 *                 description: Array of payments
 *                 items:
 *                   type: object
 *                   required:
 *                     - amount
 *                     - paymentMethod
 *                   properties:
 *                     amount:
 *                       type: number
 *                       example: 3000.00
 *                     paymentMethod:
 *                       type: string
 *                       enum: [cash, card, bank_transfer, mobile_money, cheque, loyalty_points, credit, other]
 *                       example: cash
 *                     referenceNumber:
 *                       type: string
 *                       example: TXN123456
 *                     cardType:
 *                       type: string
 *                       example: Visa
 *                     cardLastFour:
 *                       type: string
 *                       example: 1234
 *                     bankName:
 *                       type: string
 *                       example: Commercial Bank
 *                     notes:
 *                       type: string
 *                       example: Customer paid via mobile app
 *               discountAmount:
 *                 type: number
 *                 description: Total discount amount
 *                 example: 200.00
 *               taxRate:
 *                 type: number
 *                 description: Tax rate percentage
 *                 example: 18
 *               saleType:
 *                 type: string
 *                 enum: [retail, wholesale, online, phone_order]
 *                 default: retail
 *                 example: retail
 *               notes:
 *                 type: string
 *                 description: Sale notes
 *                 example: Customer requested gift wrapping
 *           example:
 *             customerId: 123
 *             items:
 *               - productId: 1
 *                 quantity: 2
 *                 unitPrice: 1500.00
 *                 discount: 100.00
 *               - productId: 2
 *                 quantity: 1
 *                 unitPrice: 500.00
 *                 discount: 0
 *             payments:
 *               - amount: 2000.00
 *                 paymentMethod: cash
 *               - amount: 1400.00
 *                 paymentMethod: card
 *                 cardType: Visa
 *                 cardLastFour: 1234
 *             discountAmount: 100.00
 *             taxRate: 18
 *             saleType: retail
 *             notes: Regular customer
 *     responses:
 *       201:
 *         description: Transaction completed successfully
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
 *                   example: Transaction completed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     sale:
 *                       type: object
 *                       description: Complete sale object with items and payments
 *                     summary:
 *                       type: object
 *                       properties:
 *                         saleNumber:
 *                           type: string
 *                           example: SALE-20251219-00001
 *                         totalAmount:
 *                           type: number
 *                           example: 3500.00
 *                         discountAmount:
 *                           type: number
 *                           example: 100.00
 *                         taxAmount:
 *                           type: number
 *                           example: 612.00
 *                         netAmount:
 *                           type: number
 *                           example: 4012.00
 *                         totalPaid:
 *                           type: number
 *                           example: 4012.00
 *                         remainingAmount:
 *                           type: number
 *                           example: 0.00
 *                         paymentStatus:
 *                           type: string
 *                           example: paid
 *                         itemCount:
 *                           type: integer
 *                           example: 2
 *                         paymentCount:
 *                           type: integer
 *                           example: 2
 *       400:
 *         description: Validation error
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 */
router.post(
    '/transaction',
    verifyToken,
    checkPermission('create_sales'),
    [
        body('items').isArray({ min: 1 }).withMessage('Items array is required'),
        body('items.*.productId').isInt().withMessage('Product ID must be an integer'),
        body('items.*.quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
        body('items.*.unitPrice').isFloat({ gt: 0 }).withMessage('Unit price must be greater than 0'),
        body('payments').isArray({ min: 1 }).withMessage('Payments array is required'),
        body('payments.*.amount').isFloat({ gt: 0 }).withMessage('Payment amount must be greater than 0'),
        body('payments.*.paymentMethod').isIn(['cash', 'card', 'bank_transfer', 'mobile_money', 'cheque', 'loyalty_points', 'credit', 'other']).withMessage('Invalid payment method')
    ],
    posController.createPOSTransaction
);

/**
 * @swagger
 * /api/pos/statistics:
 *   get:
 *     summary: Get POS transaction statistics
 *     description: Get comprehensive statistics for sales and payments
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *         example: 2025-12-01
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *         example: 2025-12-31
 *       - in: query
 *         name: saleType
 *         schema:
 *           type: string
 *           enum: [retail, wholesale, online, phone_order]
 *         description: Filter by sale type
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [cash, card, bank_transfer, mobile_money, cheque, loyalty_points, credit, other]
 *         description: Filter by payment method
 *       - in: query
 *         name: cashierId
 *         schema:
 *           type: integer
 *         description: Filter by cashier/user ID
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalSales:
 *                           type: integer
 *                           example: 150
 *                         totalRevenue:
 *                           type: number
 *                           example: 500000.00
 *                         totalDiscounts:
 *                           type: number
 *                           example: 25000.00
 *                         totalTax:
 *                           type: number
 *                           example: 85500.00
 *                         netRevenue:
 *                           type: number
 *                           example: 560500.00
 *                         averageOrderValue:
 *                           type: number
 *                           example: 3736.67
 *                     byPaymentStatus:
 *                       type: object
 *                       example:
 *                         paid: { count: 120, total: 450000.00 }
 *                         partial: { count: 20, total: 80000.00 }
 *                         pending: { count: 10, total: 30500.00 }
 *                     bySaleType:
 *                       type: object
 *                       example:
 *                         retail: { count: 100, total: 350000.00 }
 *                         wholesale: { count: 40, total: 180000.00 }
 *                         online: { count: 10, total: 30500.00 }
 *                     byPaymentMethod:
 *                       type: object
 *                       example:
 *                         cash: { count: 80, total: 280000.00 }
 *                         card: { count: 50, total: 200000.00 }
 *                         bank_transfer: { count: 20, total: 80500.00 }
 *                 filters:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                     endDate:
 *                       type: string
 *                     saleType:
 *                       type: string
 *                     paymentMethod:
 *                       type: string
 *                     cashierId:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get(
    '/statistics',
    verifyToken,
    checkPermission('view_sales'),
    posController.getPOSStatistics
);

// ==================== HELD BILL ROUTES ====================

/**
 * @swagger
 * /api/pos/held-bills/statistics:
 *   get:
 *     summary: Get held bills statistics
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics by status
 */
router.get(
    '/held-bills/statistics',
    verifyToken,
    checkPermission('view_sales'),
    posController.getHeldBillsStatistics
);

/**
 * @swagger
 * /api/pos/held-bills:
 *   get:
 *     summary: Get all held bills
 *     tags: [POS]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [held, loaded, expired, completed, cancelled]
 *         default: held
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by hold number or name
 *     responses:
 *       200:
 *         description: List of held bills
 */
router.get(
    '/held-bills',
    verifyToken,
    checkPermission('view_sales'),
    posController.getHeldBills
);

/**
 * @swagger
 * /api/pos/held-bills/{id}:
 *   get:
 *     summary: Get single held bill by ID
 *     tags: [POS]
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
 *         description: Held bill details with product information
 *       404:
 *         description: Held bill not found
 */
router.get(
    '/held-bills/:id',
    verifyToken,
    checkPermission('view_sales'),
    posController.getHeldBillById
);

/**
 * @swagger
 * /api/pos/hold-bill:
 *   post:
 *     summary: Hold/Save a bill for later
 *     tags: [POS]
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
 *               holdName:
 *                 type: string
 *                 description: Custom name (e.g., customer name, table number)
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
 *                     discount:
 *                       type: number
 *                     total:
 *                       type: number
 *               subtotal:
 *                 type: number
 *               discountAmount:
 *                 type: number
 *               discountPercentage:
 *                 type: number
 *               taxRate:
 *                 type: number
 *               taxAmount:
 *                 type: number
 *               totalAmount:
 *                 type: number
 *               saleType:
 *                 type: string
 *                 enum: [retail, wholesale, online, phone_order]
 *               notes:
 *                 type: string
 *               expiresInHours:
 *                 type: integer
 *                 default: 24
 *           example:
 *             holdName: "Table 5 - John"
 *             items:
 *               - productId: 1
 *                 quantity: 2
 *                 unitPrice: 1500
 *                 discount: 0
 *                 total: 3000
 *             subtotal: 3000
 *             totalAmount: 3000
 *             notes: "Customer will return in 1 hour"
 *     responses:
 *       201:
 *         description: Bill held successfully
 *       400:
 *         description: Validation error
 */
router.post(
    '/hold-bill',
    verifyToken,
    checkPermission('create_sales'),
    [
        body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
        body('items.*.productId').isInt().withMessage('Product ID must be an integer'),
        body('items.*.quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
        body('items.*.unitPrice').isFloat({ gte: 0 }).withMessage('Unit price must be non-negative')
    ],
    posController.holdBill
);

/**
 * @swagger
 * /api/pos/held-bills/{id}/load:
 *   put:
 *     summary: Load a held bill to POS
 *     description: Loads the held bill items back to POS for completion. Marks bill as loaded.
 *     tags: [POS]
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
 *         description: Bill loaded successfully with cart items
 *       400:
 *         description: Bill cannot be loaded (expired, already loaded, etc.)
 *       404:
 *         description: Held bill not found
 */
router.put(
    '/held-bills/:id/load',
    verifyToken,
    checkPermission('create_sales'),
    posController.loadHeldBill
);

/**
 * @swagger
 * /api/pos/held-bills/{id}:
 *   put:
 *     summary: Update a held bill
 *     tags: [POS]
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
 *               customerId:
 *                 type: integer
 *               holdName:
 *                 type: string
 *               items:
 *                 type: array
 *               subtotal:
 *                 type: number
 *               discountAmount:
 *                 type: number
 *               taxRate:
 *                 type: number
 *               totalAmount:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bill updated successfully
 *       404:
 *         description: Held bill not found
 */
router.put(
    '/held-bills/:id',
    verifyToken,
    checkPermission('update_sales'),
    posController.updateHeldBill
);

/**
 * @swagger
 * /api/pos/held-bills/{id}/complete:
 *   post:
 *     summary: Complete a held bill (convert to sale)
 *     description: Converts the held bill to an actual sale with payments
 *     tags: [POS]
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
 *               - payments
 *             properties:
 *               payments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - amount
 *                   properties:
 *                     amount:
 *                       type: number
 *                     paymentMethod:
 *                       type: string
 *                       enum: [cash, card, bank_transfer, mobile_money, cheque, loyalty_points, credit, other]
 *                     referenceNumber:
 *                       type: string
 *                     cardType:
 *                       type: string
 *                     cardLastFour:
 *                       type: string
 *           example:
 *             payments:
 *               - amount: 3000
 *                 paymentMethod: cash
 *     responses:
 *       201:
 *         description: Bill completed and sale created
 *       400:
 *         description: Validation error or bill cannot be completed
 *       404:
 *         description: Held bill not found
 */
router.post(
    '/held-bills/:id/complete',
    verifyToken,
    checkPermission('create_sales'),
    [
        body('payments').isArray({ min: 1 }).withMessage('At least one payment is required'),
        body('payments.*.amount').isFloat({ gt: 0 }).withMessage('Payment amount must be greater than 0')
    ],
    posController.completeHeldBill
);

/**
 * @swagger
 * /api/pos/held-bills/{id}/cancel:
 *   put:
 *     summary: Cancel a held bill
 *     tags: [POS]
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
 *         description: Bill cancelled
 *       404:
 *         description: Held bill not found
 */
router.put(
    '/held-bills/:id/cancel',
    verifyToken,
    checkPermission('delete_sales'),
    posController.cancelHeldBill
);

/**
 * @swagger
 * /api/pos/held-bills/{id}:
 *   delete:
 *     summary: Delete a held bill permanently
 *     tags: [POS]
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
 *         description: Bill deleted
 *       404:
 *         description: Held bill not found
 */
router.delete(
    '/held-bills/:id',
    verifyToken,
    checkPermission('delete_sales'),
    posController.deleteHeldBill
);

module.exports = router;
