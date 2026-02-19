const express = require('express');
const router = express.Router();
const { supplierReturnController } = require('../../controllers');
const { verifyToken } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Supplier Returns
 *   description: Supplier return management - Handle returns of products to suppliers
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SupplierReturn:
 *       type: object
 *       required:
 *         - supplierId
 *         - productId
 *         - quantity
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated supplier return ID
 *         supplierId:
 *           type: integer
 *           description: Supplier ID
 *         productId:
 *           type: integer
 *           description: Product ID being returned
 *         inventoryId:
 *           type: integer
 *           description: Reference to inventory record (optional)
 *         quantity:
 *           type: integer
 *           description: Quantity being returned to supplier
 *         returnDate:
 *           type: string
 *           format: date
 *           description: Date of return
 *         inventoryReferenceNo:
 *           type: string
 *           description: Reference number from inventory (optional)
 *         remarks:
 *           type: string
 *           description: Reason for return or additional notes
 *         performedByUserId:
 *           type: integer
 *           description: User who performed the return
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/supplier-returns:
 *   post:
 *     summary: Create a new supplier return
 *     description: Return products to supplier and automatically adjust inventory. Stock will be decreased by the returned quantity.
 *     tags: [Supplier Returns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplierId
 *               - productId
 *               - quantity
 *             properties:
 *               supplierId:
 *                 type: integer
 *                 description: Supplier ID to return the product to
 *                 example: 1
 *               productId:
 *                 type: integer
 *                 description: Product ID being returned
 *                 example: 5
 *               inventoryId:
 *                 type: integer
 *                 description: Reference to specific inventory record (optional)
 *                 example: 10
 *               quantity:
 *                 type: integer
 *                 description: Quantity of products being returned
 *                 example: 10
 *               returnDate:
 *                 type: string
 *                 format: date
 *                 description: Date of the return (defaults to current date)
 *                 example: "2025-12-05"
 *               inventoryReferenceNo:
 *                 type: string
 *                 description: Reference number from inventory system
 *                 example: "INV-2025-001"
 *               remarks:
 *                 type: string
 *                 description: Reason for return or additional notes
 *                 example: "Defective items - quality issues found"
 *           examples:
 *             defectiveReturn:
 *               summary: Return defective products
 *               value:
 *                 supplierId: 1
 *                 productId: 5
 *                 quantity: 10
 *                 returnDate: "2025-12-05"
 *                 remarks: "Defective products - poor quality"
 *             damagedReturn:
 *               summary: Return damaged products
 *               value:
 *                 supplierId: 2
 *                 productId: 8
 *                 inventoryId: 15
 *                 quantity: 5
 *                 returnDate: "2025-12-05"
 *                 inventoryReferenceNo: "INV-2025-120"
 *                 remarks: "Damaged during shipping"
 *     responses:
 *       201:
 *         description: Supplier return created successfully and inventory updated
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
 *                   example: "Supplier return saved & stock updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     supplierReturn:
 *                       $ref: '#/components/schemas/SupplierReturn'
 *                     stockEntry:
 *                       type: object
 *                       description: The inventory adjustment record created
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
 *                   example: "Insufficient stock. Current: 5"
 *       401:
 *         description: Unauthorized - No token provided
 *       404:
 *         description: Product or supplier not found
 *       500:
 *         description: Server error
 */
router.get('/', verifyToken, supplierReturnController.getAllSupplierReturns);
router.post('/', verifyToken, supplierReturnController.createSupplierReturn);

module.exports = router;