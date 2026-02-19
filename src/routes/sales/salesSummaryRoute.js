const express = require('express');
const router = express.Router();
const {salesSummaryController} = require('../../controllers');

/**
 * @swagger
 * /api/sales-summaries/monthly-sales:
 *   get:
 *     summary: Get monthly sales summary
 *     tags: [Sales Summaries]
 *     responses:
 *       200:
 *         description: Monthly sales aggregates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/monthly-sales', salesSummaryController.getMonthlySales);

/**
 * @swagger
 * /api/sales-summaries/most-selling-product:
 *   get:
 *     summary: Get the most selling product
 *     tags: [Sales Summaries]
 *     responses:
 *       200:
 *         description: Most selling product data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/most-selling-product', salesSummaryController.getMostSellingProduct);

/**
 * @swagger
 * /api/sales-summaries/most-buying-customer:
 *   get:
 *     summary: Get the customer who bought the most
 *     tags: [Sales Summaries]
 *     responses:
 *       200:
 *         description: Most buying customer data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/most-buying-customer', salesSummaryController.getMostBuyingCustomer);

/**
 * @swagger
 * /api/sales-summaries/most-selling-cashier:
 *   get:
 *     summary: Get the cashier with highest sales
 *     tags: [Sales Summaries]
 *     responses:
 *       200:
 *         description: Sales data per cashier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/most-selling-cashier', salesSummaryController.getMostSellingCashier);

/**
 * @swagger
 * /api/sales-summaries/daily-sales:
 *   get:
 *     summary: Get daily sales summaries
 *     tags: [Sales Summaries]
 *     responses:
 *       200:
 *         description: Daily sales aggregates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/daily-sales', salesSummaryController.getDailySales);

module.exports = router;