// routes/purchase/purchaseSummaryRoutes.js
const express = require('express');
const router = express.Router();
const {purchaseOrderController} = require('../../controllers');

/**
 * @swagger
 * /api/purchase-order-summaries/status-summary-draft:
 *   get:
 *     summary: Get purchase order status summary (draft + sent)
 *     tags: [Purchase Order Summaries]
 *     responses:
 *       200:
 *         description: Purchase order status summary per month
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrderSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/status-summary-draft', purchaseOrderController.getStatusSummaryByMonth);

/**
 * @swagger
 * /api/purchase-order-summaries/expected-deliveries:
 *   get:
 *     summary: Get expected deliveries by month
 *     tags: [Purchase Order Summaries]
 *     responses:
 *       200:
 *         description: Expected deliveries by month
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrderSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/expected-deliveries', purchaseOrderController.getExpectedDeliveriesByMonth);

/**
 * @swagger
 * /api/purchase-order-summaries/sent-orders:
 *   get:
 *     summary: Get sent purchase orders by month
 *     tags: [Purchase Order Summaries]
 *     responses:
 *       200:
 *         description: Sent orders count/summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrderSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/sent-orders', purchaseOrderController.getSentPurchaseOrdersByMonth);

/**
 * @swagger
 * /api/purchase-order-summaries/top-suppliers:
 *   get:
 *     summary: Get top suppliers by orders
 *     tags: [Purchase Order Summaries]
 *     responses:
 *       200:
 *         description: Top suppliers by order count/value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrderSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/top-suppliers', purchaseOrderController.getTopSuppliersByOrders);

module.exports = router;
