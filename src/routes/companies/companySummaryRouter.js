// routes/companySummaryRoutes.js
const express = require('express');
const router = express.Router();
const { companySummaryController } = require('../../controllers');

/**
 * @swagger
 * /api/company-summaries/total-companies:
 *   get:
 *     summary: Get total companies count
 *     tags: [Company Summaries]
 *     responses:
 *       200:
 *         description: Total count of all companies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanySummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/total-companies', companySummaryController.getTotalCompanies);

/**
 * @swagger
 * /api/company-summaries/active-companies:
 *   get:
 *     summary: Get active companies count
 *     tags: [Company Summaries]
 *     responses:
 *       200:
 *         description: Count of active companies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanySummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/active-companies', companySummaryController.getActiveCompanies);

/**
 * @swagger
 * /api/company-summaries/disabled-companies:
 *   get:
 *     summary: Get disabled companies count
 *     tags: [Company Summaries]
 *     responses:
 *       200:
 *         description: Count of disabled companies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanySummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/disabled-companies', companySummaryController.getDisabledCompanies);

/**
 * @swagger
 * /api/company-summaries/latest-company:
 *   get:
 *     summary: Get latest company
 *     tags: [Company Summaries]
 *     responses:
 *       200:
 *         description: Details of the latest company created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanySummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/latest-company', companySummaryController.getLatestCompany);

module.exports = router;
