const express = require('express');
const router = express.Router();
const inventoryController = require('../../controllers/inventory/inventoryController');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Inventory management and stock tracking with ledger
 */

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Get all inventory records
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *         description: Filter by product ID
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product name or code
 *     responses:
 *       200:
 *         description: List of inventory records retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', checkPermission('view_inventory'), inventoryController.getAllInventory);

/**
 * @swagger
 * /api/inventory/low-stock:
 *   get:
 *     summary: Get low stock items
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of low stock items retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/low-stock', checkPermission('view_inventory'), inventoryController.getLowStock);

/**
 * @swagger
 * /api/inventory/expiring-soon:
 *   get:
 *     summary: Get items expiring soon
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to check for expiry
 *     responses:
 *       200:
 *         description: List of items expiring soon
 *       401:
 *         description: Unauthorized
 */
router.get('/expiring-soon', checkPermission('view_inventory'), inventoryController.getExpiringSoon);

/**
 * @swagger
 * /api/inventory/product/{productId}:
 *   get:
 *     summary: Get current stock balance by product
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Current stock balance with batch details
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 */
router.get('/product/:productId', checkPermission('view_inventory'), inventoryController.getStockByProduct);

/**
 * @swagger
 * /api/inventory/{id}:
 *   get:
 *     summary: Get inventory record by ID
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Inventory ID
 *     responses:
 *       200:
 *         description: Inventory record details retrieved successfully
 *       404:
 *         description: Inventory record not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', checkPermission('view_inventory'), inventoryController.getInventoryById);

/**
 * @swagger
 * /api/inventory/{id}/adjust:
 *   put:
 *     summary: Adjust stock quantity (creates inventory ledger entry)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Reference ID (optional identifier)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *               - transactionType
 *             properties:
 *               productId:
 *                 type: integer
 *                 description: Product ID
 *               quantity:
 *                 type: integer
 *                 description: Quantity to add or remove
 *               transactionType:
 *                 type: string
 *                 enum: [in, out]
 *                 description: in (add stock) or out (remove stock)
 *               referenceType:
 *                 type: string
 *                 enum: [grn, sale, adjustment, transfer, return, damage, opening_stock, other]
 *                 description: Type of transaction reference
 *               supplierId:
 *                 type: integer
 *                 description: Supplier ID (will auto-fetch supplier name and phone)
 *               grnId:
 *                 type: integer
 *                 description: GRN reference ID
 *               batchNumber:
 *                 type: string
 *                 description: Batch number (inherits from last record if not provided)
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 description: Batch expiry date (YYYY-MM-DD or null, inherits from last record if not provided)
 *               unitCost:
 *                 type: number
 *                 format: decimal
 *                 description: Unit cost (inherits from last record or product cost price if not provided)
 *               sellingPrice:
 *                 type: number
 *                 format: decimal
 *                 description: Selling price (inherits from last record or product selling price if not provided)
 *               mrp:
 *                 type: number
 *                 format: decimal
 *                 description: Maximum retail price (inherits from last record or product MRP if not provided)
 *               remarks:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       200:
 *         description: Stock adjusted successfully with ledger entry created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Stock adjusted successfully - new ledger entry created
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error or insufficient stock
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient stock. Current balance: 21, Requested: 23"
 *                 error:
 *                   type: string
 *                   example: INSUFFICIENT_STOCK
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentBalance:
 *                       type: integer
 *                       example: 21
 *                     requested:
 *                       type: integer
 *                       example: 23
 *                     shortfall:
 *                       type: integer
 *                       example: 2
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id/adjust', checkPermission('adjust_inventory'), inventoryController.adjustStock);

/**
 * @swagger
 * /api/inventory/{id}/location:
 *   put:
 *     summary: Update inventory location
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Inventory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locationId
 *             properties:
 *               locationId:
 *                 type: integer
 *                 description: New Location ID
 *     responses:
 *       200:
 *         description: Inventory location updated successfully
 *       404:
 *         description: Inventory record or location not found
 */
router.put('/:id/location', checkPermission('adjust_inventory'), inventoryController.updateLocation);

/**
 * @swagger
 * /api/inventory/{id}/relocate:
 *   post:
 *     summary: Relocate inventory (move partial quantity)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Source Inventory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetLocationId
 *               - quantity
 *             properties:
 *               targetLocationId:
 *                 type: integer
 *                 description: Target Location ID
 *               quantity:
 *                 type: number
 *                 format: float
 *                 description: Quantity to move
 *     responses:
 *       200:
 *         description: Inventory relocated successfully
 *       400:
 *         description: Invalid quantity or insufficient stock
 *       404:
 *         description: Inventory record or location not found
 */
router.post('/:id/relocate', checkPermission('adjust_inventory'), inventoryController.relocateInventory);

/**
 * @swagger
 * /api/inventory/{id}:
 *   delete:
 *     summary: Delete inventory record
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Inventory ID
 *     responses:
 *       200:
 *         description: Inventory record deleted successfully
 *       404:
 *         description: Inventory record not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', checkPermission('delete_inventory'), inventoryController.deleteInventory);

module.exports = router;
