const express = require('express');
const router = express.Router();
const seedDataController = require('../controllers/test/seedDataController');
const { verifyToken } = require('../middlewares/auth'); // Optional: protect this route

/**
 * @swagger
 * tags:
 *   - name: Test
 *     description: Test data management
 */

/**
 * @swagger
 * /api/test/seed:
 *   post:
 *     summary: Seed the database with sample data (Companies, Products, Customers, Orders, etc.)
 *     tags: [Test]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Populates the database with a comprehensive set of test data including:
 *       - Company and Suppliers
 *       - Categories and Locations
 *       - Brands and Products
 *       - Customers
 *       - Purchase Orders
 *       - GRNs (and Inventory)
 *       - Sales
 *       
 *       Useful for development and testing purposes.
 *     responses:
 *       200:
 *         description: Data seeded successfully
 *       500:
 *         description: Server error
 */
router.post('/seed', verifyToken, seedDataController.seedFullDataSet);

module.exports = router;
