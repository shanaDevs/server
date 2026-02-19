const express = require('express');
const router = express.Router();
const { customerSummaryController } = require('../../controllers');

/**
 * @swagger
 * /api/customer-summaries/total-customers:
 *   get:
 *     summary: Get total customers with data
 *     tags: [Customer Summaries]
 *     responses:
 *       200:
 *         description: Total customers count and summary data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomerSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/total-customers', customerSummaryController.getTotalCustomersWithData);

/**
 * @swagger
 * /api/customer-summaries/active-customers:
 *   get:
 *     summary: Get active customers with data
 *     tags: [Customer Summaries]
 *     responses:
 *       200:
 *         description: Active customers count and summary data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomerSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/active-customers', customerSummaryController.getActiveCustomersWithData);

/**
 * @swagger
 * /api/customer-summaries/deleted-customers:
 *   get:
 *     summary: Get deleted customers with data
 *     tags: [Customer Summaries]
 *     responses:
 *       200:
 *         description: Deleted customers count and summary data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomerSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/deleted-customers', customerSummaryController.getDeletedCustomersWithData);

/**
 * @swagger
 * /api/customer-summaries/most-total-purchase-customer:
 *   get:
 *     summary: Get most total purchase customer with data
 *     tags: [Customer Summaries]
 *     responses:
 *       200:
 *         description: Customer with highest total purchases
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomerSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/most-total-purchase-customer', customerSummaryController.getMostTotalPurchaseCustomerWithData);

module.exports = router;
