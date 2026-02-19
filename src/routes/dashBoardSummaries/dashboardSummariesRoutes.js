const express = require('express');
const router = express.Router();
const dashboardSummariesController = require('../../controllers/dashBoardSummaries/dashboardSummariesController');
// const { authenticate } = require('../../middlewares/auth');
const { applyBranchFilter } = require('../../middlewares/branchAccess');

/**
 * @swagger
 * /api/dashboard-summaries/latest-invoices:
 *   get:
 *     summary: Get latest invoices/sales
 *     description: Retrieve the most recent invoices with customer and cashier information. Supports branch filtering.
 *     tags: [Dashboard Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of invoices to retrieve
 *     responses:
 *       200:
 *         description: Latest invoices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       invoiceNumber:
 *                         type: string
 *                         example: "INV-20251223-001"
 *                       customerName:
 *                         type: string
 *                         example: "John Doe"
 *                       customerPhone:
 *                         type: string
 *                         example: "0771234567"
 *                       totalAmount:
 *                         type: number
 *                         format: float
 *                         example: 1500.50
 *                       saleDate:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                         example: "completed"
 *                       paymentStatus:
 *                         type: string
 *                         example: "paid"
 *                       cashier:
 *                         type: string
 *                         example: "Jane Smith"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/latest-invoices', applyBranchFilter, dashboardSummariesController.getLatestInvoices);

/**
 * @swagger
 * /api/dashboard-summaries/top-selling-products:
 *   get:
 *     summary: Get top selling products
 *     description: Retrieve the best-selling products based on quantity sold. Supports date range and branch filtering.
 *     tags: [Dashboard Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of products to retrieve
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Top selling products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: integer
 *                       productName:
 *                         type: string
 *                       productCode:
 *                         type: string
 *                       totalQuantity:
 *                         type: number
 *                         format: float
 *                         example: 150.500
 *                       totalAmount:
 *                         type: number
 *                         format: float
 *                         example: 45000.00
 *                       orderCount:
 *                         type: integer
 *                         example: 25
 *                       unitOfMeasure:
 *                         type: string
 *                         example: "pcs"
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/top-selling-products', applyBranchFilter, dashboardSummariesController.getTopSellingProducts);

/**
 * @swagger
 * /api/dashboard-summaries/lowest-selling-products:
 *   get:
 *     summary: Get lowest selling products
 *     description: Retrieve the least-selling products based on quantity sold. Supports date range and branch filtering.
 *     tags: [Dashboard Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of products to retrieve
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lowest selling products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: integer
 *                       productName:
 *                         type: string
 *                       productCode:
 *                         type: string
 *                       totalQuantity:
 *                         type: number
 *                         format: float
 *                         example: 5.250
 *                       totalAmount:
 *                         type: number
 *                         format: float
 *                         example: 250.00
 *                       orderCount:
 *                         type: integer
 *                         example: 2
 *                       unitOfMeasure:
 *                         type: string
 *                         example: "pcs"
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/lowest-selling-products', applyBranchFilter, dashboardSummariesController.getLowestSellingProducts);

/**
 * @swagger
 * /api/dashboard-summaries/highest-lowest-products:
 *   get:
 *     summary: Get both highest and lowest selling products
 *     description: Retrieve both best-selling and least-selling products in one response. Supports date range and branch filtering.
 *     tags: [Dashboard Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of products to retrieve for each category (highest and lowest)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Highest and lowest selling products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 highest:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 10
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: integer
 *                           productName:
 *                             type: string
 *                           productCode:
 *                             type: string
 *                           totalQuantity:
 *                             type: number
 *                             format: float
 *                             example: 150.500
 *                           totalAmount:
 *                             type: number
 *                             format: float
 *                             example: 45000.00
 *                           orderCount:
 *                             type: integer
 *                             example: 25
 *                           unitOfMeasure:
 *                             type: string
 *                             example: "pcs"
 *                 lowest:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 10
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: integer
 *                           productName:
 *                             type: string
 *                           productCode:
 *                             type: string
 *                           totalQuantity:
 *                             type: number
 *                             format: float
 *                             example: 5.250
 *                           totalAmount:
 *                             type: number
 *                             format: float
 *                             example: 250.00
 *                           orderCount:
 *                             type: integer
 *                             example: 2
 *                           unitOfMeasure:
 *                             type: string
 *                             example: "pcs"
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/highest-lowest-products', applyBranchFilter, dashboardSummariesController.getHighestAndLowestSellingProducts);

/**
 * @swagger
 * /api/dashboard-summaries/due-customers:
 *   get:
 *     summary: Get customers with due payments
 *     description: Retrieve customers who have outstanding credit payments. Supports branch filtering.
 *     tags: [Dashboard Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of customers to retrieve
 *     responses:
 *       200:
 *         description: Due customers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 15
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       customerId:
 *                         type: integer
 *                       customerCode:
 *                         type: string
 *                         example: "CUS001"
 *                       customerName:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       customerType:
 *                         type: string
 *                         example: "wholesale"
 *                       totalDue:
 *                         type: number
 *                         format: float
 *                         example: 5000.00
 *                       creditCount:
 *                         type: integer
 *                         example: 3
 *                       earliestDueDate:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                         enum: [pending, overdue]
 *                         example: "overdue"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/due-customers', applyBranchFilter, dashboardSummariesController.getDueCustomers);

/**
 * @swagger
 * /api/dashboard-summaries/due-suppliers:
 *   get:
 *     summary: Get suppliers with due payments
 *     description: Retrieve suppliers who have outstanding payment balances. Supports branch filtering.
 *     tags: [Dashboard Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of suppliers to retrieve
 *     responses:
 *       200:
 *         description: Due suppliers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 8
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       supplierId:
 *                         type: integer
 *                       supplierCode:
 *                         type: string
 *                         example: "SUP001"
 *                       supplierName:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       email:
 *                         type: string
 *                       totalDue:
 *                         type: number
 *                         format: float
 *                         example: 25000.00
 *                       grnCount:
 *                         type: integer
 *                         example: 5
 *                       lastGrnDate:
 *                         type: string
 *                         format: date
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/due-suppliers', applyBranchFilter, dashboardSummariesController.getDueSuppliers);

/**
 * @swagger
 * /api/dashboard-summaries/best-customers:
 *   get:
 *     summary: Get best customers by purchase value
 *     description: Retrieve top customers ranked by total purchase amount. Supports date range and branch filtering.
 *     tags: [Dashboard Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of customers to retrieve
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Best customers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       customerId:
 *                         type: integer
 *                       customerCode:
 *                         type: string
 *                         example: "CUS001"
 *                       customerName:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       customerType:
 *                         type: string
 *                         example: "wholesale"
 *                       totalPurchases:
 *                         type: number
 *                         format: float
 *                         example: 150000.00
 *                       totalOrders:
 *                         type: integer
 *                         example: 45
 *                       averageOrderValue:
 *                         type: number
 *                         format: float
 *                         example: 3333.33
 *                       lastPurchaseDate:
 *                         type: string
 *                         format: date-time
 *                       loyaltyPoints:
 *                         type: integer
 *                         example: 1500
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/best-customers', applyBranchFilter, dashboardSummariesController.getBestCustomers);

/**
 * @swagger
 * /api/dashboard-summaries/total-sales:
 *   get:
 *     summary: Get total sales summary
 *     description: Retrieve overall sales statistics including total sales amount, transaction count, and average sale. Supports date range and branch filtering.
 *     tags: [Dashboard Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Total sales retrieved successfully
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
 *                     totalSales:
 *                       type: number
 *                       format: float
 *                       example: 500000.00
 *                     totalTransactions:
 *                       type: integer
 *                       example: 1250
 *                     averageSale:
 *                       type: number
 *                       format: float
 *                       example: 400.00
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/total-sales', applyBranchFilter, dashboardSummariesController.getTotalSales);

/**
 * @swagger
 * /api/dashboard-summaries/stock-cost:
 *   get:
 *     summary: Get stock cost summary
 *     description: Retrieve total inventory/stock cost value. Supports branch filtering.
 *     tags: [Dashboard Summaries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stock cost retrieved successfully
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
 *                     totalStockCost:
 *                       type: number
 *                       format: float
 *                       example: 250000.00
 *                     totalQuantity:
 *                       type: number
 *                       format: float
 *                       example: 5000.500
 *                     totalProducts:
 *                       type: integer
 *                       example: 450
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/stock-cost', applyBranchFilter, dashboardSummariesController.getStockCost);

/**
 * @swagger
 * /api/dashboard-summaries/today-sales:
 *   get:
 *     summary: Get today's sales summary
 *     description: Retrieve sales statistics for today only. Supports branch filtering.
 *     tags: [Dashboard Summaries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's sales retrieved successfully
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
 *                     todaySales:
 *                       type: number
 *                       format: float
 *                       example: 15000.00
 *                     todayTransactions:
 *                       type: integer
 *                       example: 45
 *                     todayProfit:
 *                       type: number
 *                       format: float
 *                       example: 3500.00
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/today-sales', applyBranchFilter, dashboardSummariesController.getTodaySales);

/**
 * @swagger
 * /api/dashboard-summaries/total-incomes:
 *   get:
 *     summary: Get total incomes summary
 *     description: Retrieve total income, profit, and cost statistics. Supports date range and branch filtering.
 *     tags: [Dashboard Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Total incomes retrieved successfully
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
 *                     totalIncome:
 *                       type: number
 *                       format: float
 *                       example: 500000.00
 *                     totalProfit:
 *                       type: number
 *                       format: float
 *                       example: 125000.00
 *                     totalCost:
 *                       type: number
 *                       format: float
 *                       example: 375000.00
 *                     profitMargin:
 *                       type: number
 *                       format: float
 *                       example: 25.00
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/total-incomes', applyBranchFilter, dashboardSummariesController.getTotalIncomes);

/**
 * @swagger
 * /api/dashboard-summaries/customer-payments:
 *   get:
 *     summary: Get customer payments summary
 *     description: Retrieve customer payment statistics by payment method. Supports date range and branch filtering.
 *     tags: [Dashboard Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Customer payments retrieved successfully
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
 *                       type: number
 *                       format: float
 *                       example: 450000.00
 *                     totalCount:
 *                       type: integer
 *                       example: 1200
 *                     byPaymentMethod:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           paymentMethod:
 *                             type: string
 *                             example: "cash"
 *                           totalAmount:
 *                             type: number
 *                             format: float
 *                             example: 250000.00
 *                           paymentCount:
 *                             type: integer
 *                             example: 800
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/customer-payments', applyBranchFilter, dashboardSummariesController.getCustomerPayments);

/**
 * @swagger
 * /api/dashboard-summaries/supplier-payments:
 *   get:
 *     summary: Get supplier payments summary
 *     description: Retrieve supplier payment statistics including top suppliers. Supports date range and branch filtering.
 *     tags: [Dashboard Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Supplier payments retrieved successfully
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
 *                       type: number
 *                       format: float
 *                       example: 300000.00
 *                     totalGRNs:
 *                       type: integer
 *                       example: 150
 *                     averagePayment:
 *                       type: number
 *                       format: float
 *                       example: 2000.00
 *                     topSuppliers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           supplierId:
 *                             type: integer
 *                           supplierCode:
 *                             type: string
 *                             example: "SUP001"
 *                           supplierName:
 *                             type: string
 *                           totalAmount:
 *                             type: number
 *                             format: float
 *                             example: 50000.00
 *                           grnCount:
 *                             type: integer
 *                             example: 25
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/supplier-payments', applyBranchFilter, dashboardSummariesController.getSupplierPayments);

module.exports = router;
