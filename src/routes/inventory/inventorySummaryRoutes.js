const express = require('express');
const router = express.Router();
const { inverntorySummaryController } = require('../../controllers');

/**
 * @swagger
 * /api/inventory-summaries/reference-type/{type}:
 *   get:
 *     summary: Get inventory reference type summary
 *     tags: [Inventory Summaries]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Reference type (e.g., 'sale', 'grn')
 *     responses:
 *       200:
 *         description: Reference type summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventorySummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/reference-type/:type', inverntorySummaryController.getReferenceTypeSummary);

/**
 * @swagger
 * /api/inventory-summaries/most-selling-product:
 *   get:
 *     summary: Get the most selling inventory product
 *     tags: [Inventory Summaries]
 *     responses:
 *       200:
 *         description: Most selling product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventorySummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/most-selling-product', inverntorySummaryController.getMostSellingProduct);

/**
 * @swagger
 * /api/inventory-summaries/top-selling-products:
 *   get:
 *     summary: Get top selling inventory products
 *     tags: [Inventory Summaries]
 *     responses:
 *       200:
 *         description: Top selling products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventorySummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/top-selling-products', inverntorySummaryController.getTopSellingProducts);

/**
 * @swagger
 * /api/inventory-summaries/lowest-selling-product:
 *   get:
 *     summary: Get lowest selling inventory product
 *     tags: [Inventory Summaries]
 *     responses:
 *       200:
 *         description: Lowest selling product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventorySummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/lowest-selling-product', inverntorySummaryController.getLowestSellingProduct);

module.exports = router;