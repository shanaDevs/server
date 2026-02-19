const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const purchaseOrderController = require('../../controllers/purchaseOrders/purchaseOrderController');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Purchase Orders
 *   description: Purchase order management and tracking
 */

/**
 * @swagger
 * /api/purchase-orders:
 *   get:
 *     summary: Get all purchase orders
 *     tags: [Purchase Orders]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, confirmed, partial, completed, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: integer
 *         description: Filter by supplier ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by PO number or notes
 *     responses:
 *       200:
 *         description: List of purchase orders retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', checkPermission('view_purchase_orders'), purchaseOrderController.getAllPurchaseOrders);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   get:
 *     summary: Get purchase order by ID
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Purchase order ID
 *     responses:
 *       200:
 *         description: Purchase order details retrieved successfully
 *       404:
 *         description: Purchase order not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', checkPermission('view_purchase_orders'), purchaseOrderController.getPurchaseOrderById);

/**
 * @swagger
 * /api/purchase-orders:
 *   post:
 *     summary: Create a new purchase order
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - supplierId
 *             properties:
 *               companyId:
 *                 type: integer
 *                 description: Company ID
 *               supplierId:
 *                 type: integer
 *                 description: Supplier ID
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date
 *                 description: Expected delivery date (YYYY-MM-DD)
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *               items:
 *                 type: array
 *                 description: Purchase order items
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantityOrdered
 *                     - unitCost
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       description: Product ID
 *                     quantityOrdered:
 *                       type: integer
 *                       description: Quantity ordered
 *                     unitCost:
 *                       type: number
 *                       format: decimal
 *                       description: Unit cost
 *                     notes:
 *                       type: string
 *                       description: Item notes
 *     responses:
 *       201:
 *         description: Purchase order created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', checkPermission('create_purchase_orders'), [
    body('companyId').isInt(),
    body('supplierId').isInt()
], purchaseOrderController.createPurchaseOrder);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   put:
 *     summary: Update a purchase order
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Purchase order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date
 *                 description: Expected delivery date
 *               status:
 *                 type: string
 *                 enum: [draft, sent, confirmed, partial, completed, cancelled]
 *                 description: Purchase order status
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       200:
 *         description: Purchase order updated successfully
 *       404:
 *         description: Purchase order not found
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', checkPermission('update_purchase_orders'), purchaseOrderController.updatePurchaseOrder);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   delete:
 *     summary: Delete a purchase order
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Purchase order ID
 *     responses:
 *       200:
 *         description: Purchase order deleted successfully
 *       404:
 *         description: Purchase order not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', checkPermission('delete_purchase_orders'), purchaseOrderController.deletePurchaseOrder);

/**
 * @swagger
 * /api/purchase-orders/{id}/pdf:
 *   get:
 *     summary: Generate and download purchase order as PDF
 *     tags: [Purchase Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Purchase order ID
 *     responses:
 *       200:
 *         description: PDF file generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Purchase order not found
 */
router.get('/:id/pdf', purchaseOrderController.generatePurchaseOrderPDF);

module.exports = router;
