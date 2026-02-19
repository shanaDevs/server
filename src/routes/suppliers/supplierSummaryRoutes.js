// routes/suppliers/supplierSummaryRoutes.js
const express = require('express');
const router = express.Router();
const { supplierSummaryController } = require('../../controllers');

/**
 * @swagger
 * /api/supplier-summaries/top-supplied:
 *   get:
 *     summary: Get top suppliers by supply volume/value
 *     tags: [Supplier Summaries]
 *     responses:
 *       200:
 *         description: Top suppliers summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupplierSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/top-supplied', supplierSummaryController.getTopSuppliedSuppliers);

/**
 * @swagger
 * /api/supplier-summaries/top-returns:
 *   get:
 *     summary: Get suppliers with highest returns
 *     tags: [Supplier Summaries]
 *     responses:
 *       200:
 *         description: Suppliers with most returns
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupplierSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/top-returns', supplierSummaryController.getTopReturnSuppliers);

/**
 * @swagger
 * /api/supplier-summaries/top-returned-products:
 *   get:
 *     summary: Get top returned products per supplier
 *     tags: [Supplier Summaries]
 *     responses:
 *       200:
 *         description: Top returned products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupplierSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/top-returned-products', supplierSummaryController.getTopReturnedProductsPerSupplier);
module.exports = router;