const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { checkBranchAccess } = require('../middlewares/branchAccess');

// Apply authentication and branch access middleware to all routes except exempt ones
const exemptPaths = ['/health', '/users/login', '/users/register', '/users/refresh-token'];

router.use((req, res, next) => {
    // Skip middleware for exempt paths
    if (exemptPaths.some(path => req.path.startsWith(path))) {
        return next();
    }
    // Apply verifyToken for all other routes
    verifyToken(req, res, (err) => {
        if (err) return next(err);
        // Then apply branch access check
        checkBranchAccess(req, res, next);
    });
});

// Import route files here
router.use('/products', require('./products/productRoutes'));
router.use('/users', require('./users/userRouter'));
router.use('/audit-logs', require('./users/auditLogRoutes'));
router.use('/permissions', require('./users/permissionRoutes'));
router.use('/suppliers', require('./suppliers/supplierRoutes'));
router.use('/companies', require('./companies/companyRoutes'));
router.use('/categories', require('./categories/categoryRoutes'));
router.use('/purchase-orders', require('./purchaseOrders/purchaseOrderRoutes'));
router.use('/grns', require('./grns/grnRoutes'));
router.use('/inventory', require('./inventory/inventoryRoutes'));
router.use('/locations', require('./inventory/locationRoutes'));
router.use('/roles', require('./users/roleRoutes'));
router.use('/customers', require('./customers/customerRoutes'));
router.use('/customer-discounts', require('./customers/customerDiscountRoutes'));
router.use('/payments', require('./payment/paymentRouter'));
router.use('/sales', require('./sales/salesRoutes'));
router.use('/pos', require('./pos/posRoutes'));
router.use('/supplier-returns', require('./suppliers/supplierReturnRoutes'));
router.use('/brands', require('./products/brandRouter'));
router.use('/product-audit-logs', require('./products/productAuditLogRoutes'));
router.use('/customer-refunds', require('./customerRefund/customerRefundRoutes'));
router.use('/customer-refund-items', require('./customerRefund/customerRefundItemRoutes'));
router.use('/settings', require('./settings/systemSettingsRoutes'));
router.use('/branches', require('./branches/branchRoutes'));
router.use('/category-summaries', require('./categories/categorySummaryRoutes')),
    router.use('/company-summaries', require('./companies/companySummaryRouter'));
router.use('/customer-refund-summaries', require('./customerRefund/customerRefundSummaryRoutes'));
router.use('/customer-summaries', require('./customers/customerSummaryRoute'));
router.use('/grn-summaries', require('./grns/grnSummaryRoutes'));
router.use('/inventory-summaries', require('./inventory/inventorySummaryRoutes'));
router.use('/purchase-order-summaries', require('./purchaseOrders/purchaseOrderSummaryRouters'));
router.use('/sales-summaries', require('./sales/salesSummaryRoute'));
router.use('/supplier-summaries', require('./suppliers/supplierSummaryRoutes'));
router.use('/user-summaries', require('./users/userSummaryRoutes'));
router.use('/test', require('./testRoutes'));
router.use('/dashboard', require('./dashboard/dashboardRoutes'));
router.use('/emails', require('./emails/emailRoutes'));
router.use('/repairs', require('./repairs/repairsRoute'));
router.use('/reports', require('./reports/reportRoutes'));
router.use('/dashboard-summaries', require('./dashBoardSummaries/dashboardSummariesRoutes'));
router.use('/promotions', require('./promotion/promotionRouter'));
router.use('/expenses', require('./expenses/expenseRoutes'));
router.use('/counters', require('./sales/counterRoutes'));
router.use('/supplier-payments', require('./suppliers/supplierPaymentRoutes'));
router.use('/customer-payments', require('./customers/customerPaymentRoutes'));
router.use('/returns', require('./returns/returnsRoutes'));
router.use('/finance', require('./finance/financeRoutes'));
router.use('/transactions', require('./finance/transactionRoutes'));

// TSOA Auto-Generated Routes
// These routes are automatically generated from TypeScript controllers with decorators
try {
    const { RegisterRoutes } = require('./tsoa/routes');
    RegisterRoutes(router);
    console.log('✅ TSOA routes registered successfully');
} catch (error) {
    console.warn('⚠️  TSOA routes not available. Run "npm run tsoa:build" to generate them.');
    console.warn('   Error:', error.message);
}



/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API and database status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: string
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: 'connected'
    });
});

module.exports = router;

