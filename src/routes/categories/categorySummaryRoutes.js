const express = require('express');
const router = express.Router();
const { categorySummaryController } = require('../../controllers');

/**
 * @swagger
 * /api/category-summaries/category-counts:
 *   get:
 *     summary: Get all category counts
 *     tags: [Category Summaries]
 *     responses:
 *       200:
 *         description: Total count of all categories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategorySummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/category-counts', categorySummaryController.getAllCategoryCount);

/**
 * @swagger
 * /api/category-summaries/active-category-counts:
 *   get:
 *     summary: Get active category counts
 *     tags: [Category Summaries]
 *     responses:
 *       200:
 *         description: Count of active categories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategorySummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/active-category-counts', categorySummaryController.getActiveCategoryCount);

/**
 * @swagger
 * /api/category-summaries/inactive-category-counts:
 *   get:
 *     summary: Get inactive category counts
 *     tags: [Category Summaries]
 *     responses:
 *       200:
 *         description: Count of inactive categories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategorySummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/inactive-category-counts', categorySummaryController.getInactiveCategoryCount);

module.exports = router;