const express = require('express');
const router = express.Router();
const { customerRefundSummaryController } = require('../../controllers');

/**
 * @swagger
 * /api/customer-refund-summaries/most-refunded-product-by-month:
 *   get:
 *     summary: Get most refunded product by month
 *     tags: [Customer Refund Summaries]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12"
 *         description: Month in YYYY-MM format
 *     responses:
 *       200:
 *         description: Most refunded product for the specified month
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomerRefundSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/most-refunded-product-by-month', customerRefundSummaryController.getMostRefundedProductByMonth);

module.exports = router;
