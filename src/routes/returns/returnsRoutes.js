const express = require('express');
const router = express.Router();
const returnsController = require('../../controllers/returns/returnsController');
const { verifyToken } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   - name: Returns - Supplier
 *     description: Supplier return management - Return products to suppliers and receive payments
 *   - name: Returns - Customer
 *     description: Customer return management - Process customer returns and refunds
 *   - name: Returns - Dashboard
 *     description: Returns dashboard and analytics
 */

// ==================== SUPPLIER RETURNS ====================

/**
 * @swagger
 * /api/returns/supplier/summary:
 *   get:
 *     summary: Get supplier return summary
 *     tags: [Returns - Supplier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Summary data
 */
router.get('/supplier/summary', verifyToken, returnsController.getSupplierReturnSummary);

/**
 * @swagger
 * /api/returns/supplier/expired-products:
 *   get:
 *     summary: Get expired products eligible for supplier return
 *     tags: [Returns - Supplier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysBeforeExpiry
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Include products expiring within N days
 *     responses:
 *       200:
 *         description: List of expired products
 */
router.get('/supplier/expired-products', verifyToken, returnsController.getExpiredProducts);

/**
 * @swagger
 * /api/returns/supplier:
 *   get:
 *     summary: Get all supplier returns
 *     tags: [Returns - Supplier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, approved, completed, cancelled]
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: returnReason
 *         schema:
 *           type: string
 *           enum: [defective, damaged, expired, wrong_item, quality_issue, overstock, other]
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, partial, received, credited, cancelled]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of supplier returns
 */
router.get('/supplier', verifyToken, returnsController.getAllSupplierReturns);

/**
 * @swagger
 * /api/returns/supplier/{id}:
 *   get:
 *     summary: Get supplier return by ID
 *     tags: [Returns - Supplier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Supplier return details
 *       404:
 *         description: Return not found
 */
router.get('/supplier/:id', verifyToken, returnsController.getSupplierReturnById);

/**
 * @swagger
 * /api/returns/supplier:
 *   post:
 *     summary: Create supplier return
 *     tags: [Returns - Supplier]
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
 *               - returnReason
 *             properties:
 *               supplierId:
 *                 type: integer
 *               productId:
 *                 type: integer
 *               grnId:
 *                 type: integer
 *               quantity:
 *                 type: number
 *               unitCost:
 *                 type: number
 *               returnReason:
 *                 type: string
 *                 enum: [defective, damaged, expired, wrong_item, quality_issue, overstock, other]
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               returnDate:
 *                 type: string
 *                 format: date
 *               remarks:
 *                 type: string
 *           examples:
 *             expiredProduct:
 *               summary: Return expired product
 *               value:
 *                 supplierId: 1
 *                 productId: 5
 *                 quantity: 10
 *                 returnReason: expired
 *                 expiryDate: "2026-01-15"
 *                 remarks: "Product expired - returning to supplier"
 *             defectiveProduct:
 *               summary: Return defective product
 *               value:
 *                 supplierId: 1
 *                 productId: 8
 *                 grnId: 15
 *                 quantity: 5
 *                 returnReason: defective
 *                 remarks: "Quality issues found during inspection"
 *     responses:
 *       201:
 *         description: Supplier return created
 *       400:
 *         description: Validation error
 */
router.post('/supplier', verifyToken, returnsController.createSupplierReturn);

/**
 * @swagger
 * /api/returns/supplier/{id}/approve:
 *   post:
 *     summary: Approve supplier return
 *     tags: [Returns - Supplier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Return approved
 *       400:
 *         description: Cannot approve
 */
router.post('/supplier/:id/approve', verifyToken, returnsController.approveSupplierReturn);

/**
 * @swagger
 * /api/returns/supplier/{id}/payment:
 *   post:
 *     summary: Record payment received from supplier for return
 *     tags: [Returns - Supplier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, bank_transfer, cheque, credit_note, adjustment, other]
 *                 default: credit_note
 *               paymentDate:
 *                 type: string
 *                 format: date
 *               referenceNumber:
 *                 type: string
 *               bankName:
 *                 type: string
 *               chequeNumber:
 *                 type: string
 *               chequeDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment recorded
 *       400:
 *         description: Invalid payment
 */
router.post('/supplier/:id/payment', verifyToken, returnsController.recordSupplierReturnPayment);

/**
 * @swagger
 * /api/returns/supplier/{id}/payments:
 *   get:
 *     summary: Get payment history for supplier return
 *     tags: [Returns - Supplier]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment history
 */
router.get('/supplier/:id/payments', verifyToken, returnsController.getSupplierReturnPayments);

// ==================== CUSTOMER RETURNS ====================

/**
 * @swagger
 * /api/returns/customer/summary:
 *   get:
 *     summary: Get customer return summary
 *     tags: [Returns - Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Summary data
 */
router.get('/customer/summary', verifyToken, returnsController.getCustomerReturnSummary);

/**
 * @swagger
 * /api/returns/customer:
 *   get:
 *     summary: Get all customer returns
 *     tags: [Returns - Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, approved, completed, cancelled]
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: returnReason
 *         schema:
 *           type: string
 *           enum: [defective, damaged, expired, wrong_item, not_satisfied, size_issue, quality_issue, other]
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, partial, paid, credited, cancelled]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of customer returns
 */
router.get('/customer', verifyToken, returnsController.getAllCustomerReturns);

/**
 * @swagger
 * /api/returns/customer/{id}:
 *   get:
 *     summary: Get customer return by ID
 *     tags: [Returns - Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customer return details
 *       404:
 *         description: Return not found
 */
router.get('/customer/:id', verifyToken, returnsController.getCustomerReturnById);

/**
 * @swagger
 * /api/returns/customer:
 *   post:
 *     summary: Create customer return
 *     tags: [Returns - Customer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - items
 *             properties:
 *               customerId:
 *                 type: integer
 *               saleId:
 *                 type: integer
 *                 description: Reference to original sale
 *               returnReason:
 *                 type: string
 *                 enum: [defective, damaged, expired, wrong_item, not_satisfied, size_issue, quality_issue, other]
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               refundMethod:
 *                 type: string
 *                 enum: [cash, bank_transfer, card, mobile_money, store_credit, exchange, other]
 *               remarks:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     saleItemId:
 *                       type: integer
 *                     quantity:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *                     returnReason:
 *                       type: string
 *                     expiryDate:
 *                       type: string
 *                       format: date
 *                     batchNumber:
 *                       type: string
 *                     restockable:
 *                       type: boolean
 *                       default: true
 *                     remarks:
 *                       type: string
 *           examples:
 *             expiredProduct:
 *               summary: Return expired product
 *               value:
 *                 customerId: 1
 *                 saleId: 100
 *                 returnReason: expired
 *                 refundMethod: cash
 *                 items:
 *                   - productId: 5
 *                     quantity: 2
 *                     unitPrice: 500
 *                     returnReason: expired
 *                     expiryDate: "2026-01-10"
 *                     restockable: false
 *             defectiveProduct:
 *               summary: Return defective product
 *               value:
 *                 customerId: 1
 *                 returnReason: defective
 *                 refundMethod: store_credit
 *                 remarks: "Customer reported product malfunction"
 *                 items:
 *                   - productId: 8
 *                     quantity: 1
 *                     unitPrice: 1500
 *                     returnReason: defective
 *                     restockable: false
 *     responses:
 *       201:
 *         description: Customer return created
 *       400:
 *         description: Validation error
 */
router.post('/customer', verifyToken, returnsController.createCustomerReturn);

/**
 * @swagger
 * /api/returns/customer/{id}/approve:
 *   post:
 *     summary: Approve customer return
 *     tags: [Returns - Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Return approved
 *       400:
 *         description: Cannot approve
 */
router.post('/customer/:id/approve', verifyToken, returnsController.approveCustomerReturn);

/**
 * @swagger
 * /api/returns/customer/{id}/payment:
 *   post:
 *     summary: Process refund payment to customer
 *     tags: [Returns - Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, bank_transfer, card, mobile_money, credit_adjustment, store_credit, other]
 *                 default: cash
 *               paymentDate:
 *                 type: string
 *                 format: date
 *               referenceNumber:
 *                 type: string
 *               bankName:
 *                 type: string
 *               cardType:
 *                 type: string
 *               cardLastFour:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Refund processed
 *       400:
 *         description: Invalid payment
 */
router.post('/customer/:id/payment', verifyToken, returnsController.processCustomerReturnPayment);

/**
 * @swagger
 * /api/returns/customer/{id}/payments:
 *   get:
 *     summary: Get payment history for customer return
 *     tags: [Returns - Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment history
 */
router.get('/customer/:id/payments', verifyToken, returnsController.getCustomerReturnPayments);

// ==================== DASHBOARD ====================

/**
 * @swagger
 * /api/returns/dashboard:
 *   get:
 *     summary: Get combined returns dashboard
 *     tags: [Returns - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Dashboard data with supplier and customer return summaries
 */
router.get('/dashboard', verifyToken, returnsController.getReturnsDashboard);

module.exports = router;
