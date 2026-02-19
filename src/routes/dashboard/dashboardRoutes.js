const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/dashboard/dashboardController');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics and analytics
 */

/**
 * @swagger
 * /api/dashboard/statistics:
 *   get:
 *     summary: Get dashboard statistics for today or a specific date
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: 2025-12-19
 *         description: Date for statistics (YYYY-MM-DD format). Defaults to today if not provided.
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         date:
 *                           type: string
 *                           format: date
 *                           description: The date for which statistics are calculated
 *                           example: "2025-12-19"
 *                         totalSales:
 *                           type: number
 *                           format: float
 *                           description: Total value of sales made (in currency)
 *                           example: 15000.50
 *                         totalTransactions:
 *                           type: integer
 *                           description: Number of bills/invoices generated (completed orders)
 *                           example: 25
 *                         itemsSold:
 *                           type: number
 *                           format: float
 *                           description: Total quantity of individual items sold
 *                           example: 150.000
 *                         grossProfit:
 *                           type: number
 *                           format: float
 *                           description: Total profit made (totalAmount - totalCost)
 *                           example: 4500.25
 *                     analytics:
 *                       type: object
 *                       properties:
 *                         salesTrend:
 *                           type: array
 *                           description: Hourly sales breakdown for line chart (0-23 hours)
 *                           items:
 *                             type: object
 *                             properties:
 *                               hour:
 *                                 type: integer
 *                                 example: 14
 *                               amount:
 *                                 type: number
 *                                 example: 2500.50
 *                         salesByCategory:
 *                           type: array
 *                           description: Sales breakdown by category for pie chart
 *                           items:
 *                             type: object
 *                             properties:
 *                               category:
 *                                 type: string
 *                                 example: "Groceries"
 *                               amount:
 *                                 type: number
 *                                 example: 8000.00
 *                               percentage:
 *                                 type: number
 *                                 example: 53.3
 *                               count:
 *                                 type: integer
 *                                 example: 15
 *                         paymentMethods:
 *                           type: array
 *                           description: Payment methods breakdown for pie chart
 *                           items:
 *                             type: object
 *                             properties:
 *                               method:
 *                                 type: string
 *                                 example: "cash"
 *                               amount:
 *                                 type: number
 *                                 example: 10000.00
 *                               percentage:
 *                                 type: number
 *                                 example: 66.7
 *                               count:
 *                                 type: integer
 *                                 example: 20
 *                         topProducts:
 *                           type: array
 *                           description: Top 5 selling products for bar chart
 *                           items:
 *                             type: object
 *                             properties:
 *                               productId:
 *                                 type: integer
 *                                 example: 123
 *                               productName:
 *                                 type: string
 *                                 example: "Product A"
 *                               quantity:
 *                                 type: number
 *                                 example: 150.000
 *                               amount:
 *                                 type: number
 *                                 example: 3000.00
 *                         lowStockAlerts:
 *                           type: array
 *                           description: Products with stock below minimum threshold (requires immediate attention)
 *                           items:
 *                             type: object
 *                             properties:
 *                               productId:
 *                                 type: integer
 *                                 example: 456
 *                               productName:
 *                                 type: string
 *                                 example: "Rice 5kg"
 *                               productCode:
 *                                 type: string
 *                                 example: "RIC-0001"
 *                               currentStock:
 *                                 type: number
 *                                 example: 3.000
 *                               minStockLevel:
 *                                 type: integer
 *                                 example: 10
 *                               unitOfMeasure:
 *                                 type: string
 *                                 example: "pcs"
 *                               status:
 *                                 type: string
 *                                 enum: [low_stock, out_of_stock]
 *                                 example: "low_stock"
 *                         recentTransactions:
 *                           type: array
 *                           description: Last 10 sales/transactions
 *                           items:
 *                             type: object
 *                             properties:
 *                               billNo:
 *                                 type: string
 *                                 example: "INV-2025-001234"
 *                               amount:
 *                                 type: number
 *                                 example: 1250.50
 *                               time:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2025-12-22T10:30:00Z"
 *                               cashier:
 *                                 type: string
 *                                 example: "John Doe"
 *                               saleId:
 *                                 type: integer
 *                                 example: 789
 *       400:
 *         description: Invalid date format
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
 *                   example: "Invalid date format. Please use YYYY-MM-DD format."
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/statistics', checkPermission('view_sales'), dashboardController.getDashboardStatistics);

module.exports = router;
