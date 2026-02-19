// routes/reports/userActivityRoutes.js
const express = require('express');
const router = express.Router();
const { userSummaryController} = require('../../controllers');

/**
 * @swagger
 * /api/user-summaries/most-active:
 *   get:
 *     summary: Get most active users
 *     tags: [User Summaries]
 *     responses:
 *       200:
 *         description: List of most active users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/most-active', userSummaryController.getMostActiveUsers);

/**
 * @swagger
 * /api/user-summaries/least-active:
 *   get:
 *     summary: Get least active users
 *     tags: [User Summaries]
 *     responses:
 *       200:
 *         description: List of least active users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/least-active', userSummaryController.getLeastActiveUsers);

/**
 * @swagger
 * /api/user-summaries/count:
 *   get:
 *     summary: Get user count
 *     tags: [User Summaries]
 *     responses:
 *       200:
 *         description: User count summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/count', userSummaryController.getUsersCount);

module.exports = router;
