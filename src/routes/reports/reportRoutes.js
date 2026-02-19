const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/reports/reportController');
const { verifyToken } = require('../../middlewares/auth');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Reporting and data export endpoints
 */

/**
 * @swagger
 * /api/reports/sales/statistics:
 *   get:
 *     summary: Get sales statistics for a specific period
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, annually]
 *           default: daily
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Reference date (YYYY-MM-DD)
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sales statistics retrieved successfully
 */
router.get('/sales/statistics', verifyToken, checkPermission('view_stats_report'), reportController.getSalesStatistics);

/**
 * @swagger
 * /api/reports/sales/export:
 *   get:
 *     summary: Export sales data to Excel
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, annually]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Excel file generated
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/sales/export', verifyToken, checkPermission('export_report'), reportController.exportSalesExcel);

/**
 * @swagger
 * /api/reports/payments/statistics:
 *   get:
 *     summary: Get payment statistics for a specific period
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, annually]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 */
router.get('/payments/statistics', verifyToken, checkPermission('view_stats_report'), reportController.getPaymentStatistics);

/**
 * @swagger
 * /api/reports/payments/export:
 *   get:
 *     summary: Export payments data to Excel
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, annually]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Excel file generated
 */
router.get('/payments/export', verifyToken, checkPermission('export_report'), reportController.exportPaymentsExcel);

module.exports = router;
