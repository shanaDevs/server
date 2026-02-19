const express = require('express');
const router = express.Router();
const { grnSummaryController } = require('../../controllers');

/**
 * @swagger
 * /api/grn-summaries/draft:
 *   get:
 *     summary: Get draft GRNs
 *     tags: [GRN Summaries]
 *     responses:
 *       200:
 *         description: Draft GRNs summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GRNSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/draft', grnSummaryController.getDraftGrns);

/**
 * @swagger
 * /api/grn-summaries/received:
 *   get:
 *     summary: Get received GRNs
 *     tags: [GRN Summaries]
 *     responses:
 *       200:
 *         description: Received GRNs summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GRNSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/received', grnSummaryController.getReceivedGrns);

/**
 * @swagger
 * /api/grn-summaries/verified:
 *   get:
 *     summary: Get verified GRNs
 *     tags: [GRN Summaries]
 *     responses:
 *       200:
 *         description: Verified GRNs summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GRNSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/verified', grnSummaryController.getVerifiedGrns);

/**
 * @swagger
 * /api/grn-summaries/approved:
 *   get:
 *     summary: Get approved GRNs
 *     tags: [GRN Summaries]
 *     responses:
 *       200:
 *         description: Approved GRNs summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GRNSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/approved', grnSummaryController.getApprovedGrns);

/**
 * @swagger
 * /api/grn-summaries/rejected:
 *   get:
 *     summary: Get rejected GRNs
 *     tags: [GRN Summaries]
 *     responses:
 *       200:
 *         description: Rejected GRNs summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GRNSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/rejected', grnSummaryController.getRejectedGrns);

/**
 * @swagger
 * /api/grn-summaries/count-by-month-range:
 *   get:
 *     summary: Get GRN count by month and range
 *     tags: [GRN Summaries]
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date
 *         description: Start month (YYYY-MM)
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date
 *         description: End month (YYYY-MM)
 *     responses:
 *       200:
 *         description: GRN count grouped by month
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GRNSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/count-by-month-range', grnSummaryController.getGrnCountByMonthAndRange);

/**
 * @swagger
 * /api/grn-summaries/highest-amount-grn-by-month:
 *   get:
 *     summary: Get highest amount GRN by month
 *     tags: [GRN Summaries]
 *     responses:
 *       200:
 *         description: Highest GRN amount by month
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GRNSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/highest-amount-grn-by-month', grnSummaryController.getHighestAmountGrnByMonth);

module.exports = router;
