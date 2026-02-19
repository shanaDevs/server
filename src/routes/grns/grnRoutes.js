const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const grnController = require('../../controllers/grns/grnController');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   - name: GRNs
 *     description: Goods Received Note (GRN) management and inventory receiving
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     GRNItem:
 *       type: object
 *       required:
 *         - productId
 *         - quantityReceived
 *       properties:
 *         id:
 *           type: integer
 *           description: GRN item ID (auto-generated)
 *           example: 1
 *         grnId:
 *           type: integer
 *           description: Parent GRN ID
 *           example: 1
 *         poItemId:
 *           type: integer
 *           nullable: true
 *           description: Reference to purchase order item (null if GRN created without PO)
 *           example: 5
 *         productId:
 *           type: integer
 *           description: Product being received
 *           example: 101
 *         quantityReceived:
 *           type: number
 *           format: decimal
 *           description: Quantity received (supports decimal for items sold by weight/volume)
 *           example: 50.5
 *         unitCost:
 *           type: number
 *           format: decimal
 *           description: Unit cost per item (purchase price)
 *           example: 85000.00
 *         sellingPrice:
 *           type: number
 *           format: decimal
 *           description: Selling price (required when approving GRN)
 *           example: 125000.00
 *         mrp:
 *           type: number
 *           format: decimal
 *           description: Maximum Retail Price (required when approving GRN)
 *           example: 150000.00
 *         batchNumber:
 *           type: string
 *           description: Batch/Lot number (auto-generated as BCH-0001, BCH-0002, etc. if not provided)
 *           example: BCH-0001
 *         expiryDate:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Batch expiry date (YYYY-MM-DD)
 *           example: 2026-12-31
 *         branchId:
 *           type: integer
 *           nullable: true
 *           description: Branch where item is stored
 *           example: 1
 *         locationId:
 *           type: integer
 *           nullable: true
 *           description: Storage location/warehouse ID for the received item
 *           example: 3
 *         lineTotal:
 *           type: number
 *           format: decimal
 *           readOnly: true
 *           description: Calculated line total (quantityReceived × unitCost)
 *           example: 4275000.00
 *     
 *     GRN:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: GRN ID (auto-generated)
 *           example: 1
 *         grnNumber:
 *           type: string
 *           description: Unique GRN number (auto-generated as GRN-000001, GRN-000002, etc.)
 *           example: GRN-000001
 *         poId:
 *           type: integer
 *           nullable: true
 *           description: Purchase Order ID (null if GRN created without PO)
 *           example: 5
 *         supplierId:
 *           type: integer
 *           description: Supplier ID
 *           example: 10
 *         grnDate:
 *           type: string
 *           format: date
 *           description: Date goods were received (YYYY-MM-DD)
 *           example: 2025-12-30
 *         receivedBy:
 *           type: integer
 *           nullable: true
 *           description: User ID who received the goods
 *           example: 2
 *         createdBy:
 *           type: integer
 *           nullable: true
 *           description: User ID who created the GRN
 *           example: 1
 *         status:
 *           type: string
 *           enum: [draft, received, verified, approved, rejected]
 *           description: |
 *             GRN status:
 *             - draft: Initial state, can be edited
 *             - received: Goods physically received
 *             - verified: Quality inspection completed
 *             - approved: GRN approved, inventory updated
 *             - rejected: GRN rejected, no inventory update
 *           example: approved
 *         totalQuantity:
 *           type: integer
 *           description: Total quantity of all items received
 *           example: 150
 *         totalAmount:
 *           type: number
 *           format: decimal
 *           description: Total amount (sum of all line totals)
 *           example: 12750000.00
 *         inspectionNotes:
 *           type: string
 *           nullable: true
 *           description: Quality inspection notes and remarks
 *           example: All items in good condition. Minor packaging damage on 2 units.
 *         branchId:
 *           type: integer
 *           nullable: true
 *           description: Branch where goods were received
 *           example: 1
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Record creation timestamp
 *           example: 2025-12-30T11:56:47Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Record last update timestamp
 *           example: 2025-12-30T11:56:47Z
 *         items:
 *           type: array
 *           description: Array of GRN items
 *           items:
 *             $ref: '#/components/schemas/GRNItem'
 *         supplier:
 *           type: object
 *           description: Supplier details (populated in response)
 *         purchaseOrder:
 *           type: object
 *           nullable: true
 *           description: Purchase order details (populated in response if linked)
 *     
 *     GRNCreateRequest:
 *       type: object
 *       required:
 *         - items
 *       properties:
 *         grnNumber:
 *           type: string
 *           description: Optional - Auto-generated if not provided
 *           example: GRN-000001
 *         poId:
 *           type: integer
 *           nullable: true
 *           description: Optional - Purchase order reference
 *           example: 5
 *         supplierId:
 *           type: integer
 *           description: Optional - Auto-detected from first product's supplier if not provided
 *           example: 10
 *         grnDate:
 *           type: string
 *           format: date
 *           description: Date goods were received (defaults to today if not provided)
 *           example: 2025-12-30
 *         inspectionNotes:
 *           type: string
 *           description: Quality inspection notes
 *           example: All items inspected and verified
 *         branchId:
 *           type: integer
 *           description: Branch where goods are received (auto-detected from user if not provided)
 *           example: 1
 *         items:
 *           type: array
 *           description: GRN items (products received) - at least one item required
 *           minItems: 1
 *           items:
 *             type: object
 *             required:
 *               - productId
 *               - quantityReceived
 *             properties:
 *               poItemId:
 *                 type: integer
 *                 nullable: true
 *                 description: Reference to purchase order item
 *                 example: 5
 *               productId:
 *                 type: integer
 *                 description: Product being received
 *                 example: 101
 *               quantityReceived:
 *                 type: number
 *                 format: decimal
 *                 description: Quantity received
 *                 example: 50.5
 *               unitCost:
 *                 type: number
 *                 format: decimal
 *                 description: Unit cost per item (defaults to 0 if not provided)
 *                 example: 85000.00
 *               sellingPrice:
 *                 type: number
 *                 format: decimal
 *                 description: Selling price (required when approving GRN)
 *                 example: 125000.00
 *               mrp:
 *                 type: number
 *                 format: decimal
 *                 description: Maximum Retail Price (required when approving GRN)
 *                 example: 150000.00
 *               batchNumber:
 *                 type: string
 *                 description: Batch number (auto-generated if not provided)
 *                 example: BCH-0001
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 description: Batch expiry date
 *                 example: 2026-12-31
 *               locationId:
 *                 type: integer
 *                 nullable: true
 *                 description: Storage location ID
 *                 example: 3
 *       example:
 *         poId: 5
 *         supplierId: 10
 *         grnDate: "2025-12-30"
 *         inspectionNotes: "All items inspected and verified"
 *         branchId: 1
 *         items:
 *           - productId: 101
 *             quantityReceived: 50
 *             unitCost: 85000.00
 *             sellingPrice: 125000.00
 *             mrp: 150000.00
 *             batchNumber: BCH-0001
 *             expiryDate: "2026-12-31"
 *             locationId: 3
 *           - productId: 102
 *             quantityReceived: 100
 *             unitCost: 45000.00
 *             sellingPrice: 65000.00
 *             mrp: 75000.00
 */

/**
 * @swagger
 * /api/grns:
 *   get:
 *     summary: Get all GRNs with pagination and filtering
 *     description: Retrieve a paginated list of all Goods Received Notes with optional filtering by status, supplier, branch, and search query
 *     tags: [GRNs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *         example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, received, verified, approved, rejected]
 *         description: Filter by GRN status
 *         example: approved
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: integer
 *         description: Filter by supplier ID
 *         example: 10
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *         description: Filter by branch ID
 *         example: 1
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by GRN number or inspection notes
 *         example: GRN-000001
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter GRNs from this date (YYYY-MM-DD)
 *         example: 2025-01-01
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter GRNs up to this date (YYYY-MM-DD)
 *         example: 2025-12-31
 *     responses:
 *       200:
 *         description: List of GRNs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GRN'
 *                 total:
 *                   type: integer
 *                   description: Total number of GRNs matching the filter
 *                   example: 45
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   description: Items per page
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages
 *                   example: 5
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', checkPermission('view_grns'), grnController.getAllGRNs);

/**
 * @swagger
 * /api/grns/{id}:
 *   get:
 *     summary: Get GRN by ID with complete details
 *     description: Retrieve detailed information about a specific GRN including all items, supplier details, and purchase order information (if linked)
 *     tags: [GRNs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: GRN ID
 *         example: 1
 *     responses:
 *       200:
 *         description: GRN details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/GRN'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', checkPermission('view_grns'), grnController.getGRNById);

/**
 * @swagger
 * /api/grns:
 *   post:
 *     summary: Create a new GRN
 *     description: |
 *       Create a new Goods Received Note with or without a Purchase Order reference.
 *       
 *       **Key Features:**
 *       - Auto-generates GRN number if not provided (GRN-000001, GRN-000002, etc.)
 *       - Auto-generates batch numbers for items if not provided (BCH-0001, BCH-0002, etc.)
 *       - Auto-detects supplier from first product if supplierId not provided
 *       - Supports creating GRN without linking to a Purchase Order
 *       - Automatically calculates totalQuantity and totalAmount
 *       - Supports decimal quantities for items sold by weight/volume
 *       
 *       **Important Notes:**
 *       - GRN is created in 'draft' status by default
 *       - Inventory is NOT updated until GRN is approved
 *       - sellingPrice and mrp are required when approving the GRN
 *       - branchId is auto-detected from authenticated user if not provided
 *     tags: [GRNs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GRNCreateRequest'
 *     responses:
 *       201:
 *         description: GRN created successfully
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
 *                   example: GRN created successfully
 *                 data:
 *                   $ref: '#/components/schemas/GRN'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', checkPermission('create_grns'), [
    body('receivedDate').isISO8601()
], grnController.createGRN);

/**
 * @swagger
 * /api/grns/{id}:
 *   put:
 *     summary: Update GRN details and items
 *     description: |
 *       Edit GRN header information and/or items. Automatically recalculates totals if items are modified.
 *       
 *       **Important Restrictions:**
 *       - Cannot edit GRN if status is 'approved' or 'rejected'
 *       - Only GRNs with status 'draft', 'received', or 'verified' can be edited
 *       - If items array is provided, all existing items will be replaced
 *       - Totals (totalQuantity, totalAmount) are automatically recalculated
 *       
 *       **Partial Updates:**
 *       - You can update only header fields without providing items
 *       - You can update only items without changing header fields
 *       - Any field not provided will retain its current value
 *     tags: [GRNs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: GRN ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grnNumber:
 *                 type: string
 *                 description: GRN number
 *                 example: GRN-000001
 *               poId:
 *                 type: integer
 *                 nullable: true
 *                 description: Purchase Order ID (null for GRN without PO)
 *                 example: 5
 *               supplierId:
 *                 type: integer
 *                 description: Supplier ID
 *                 example: 10
 *               grnDate:
 *                 type: string
 *                 format: date
 *                 description: GRN date (YYYY-MM-DD)
 *                 example: 2025-12-30
 *               inspectionNotes:
 *                 type: string
 *                 description: Quality inspection notes
 *                 example: Updated inspection notes
 *               branchId:
 *                 type: integer
 *                 description: Branch ID where goods were received
 *                 example: 1
 *               items:
 *                 type: array
 *                 description: GRN items array (replaces all existing items if provided)
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantityReceived
 *                   properties:
 *                     poItemId:
 *                       type: integer
 *                       nullable: true
 *                       description: Purchase Order Item ID
 *                       example: 5
 *                     productId:
 *                       type: integer
 *                       description: Product ID
 *                       example: 101
 *                     quantityReceived:
 *                       type: number
 *                       format: decimal
 *                       description: Quantity received
 *                       example: 60
 *                     unitCost:
 *                       type: number
 *                       format: decimal
 *                       description: Unit cost per item
 *                       example: 85000.00
 *                     sellingPrice:
 *                       type: number
 *                       format: decimal
 *                       description: Selling price
 *                       example: 125000.00
 *                     mrp:
 *                       type: number
 *                       format: decimal
 *                       description: Maximum Retail Price
 *                       example: 150000.00
 *                     batchNumber:
 *                       type: string
 *                       description: Batch number
 *                       example: BCH-0001
 *                     expiryDate:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                       description: Batch expiry date (YYYY-MM-DD)
 *                       example: 2026-12-31
 *                     locationId:
 *                       type: integer
 *                       nullable: true
 *                       description: Storage location ID
 *                       example: 3
 *           example:
 *             grnDate: "2025-12-30"
 *             inspectionNotes: "Updated inspection - all items verified"
 *             items:
 *               - productId: 101
 *                 quantityReceived: 60
 *                 unitCost: 85000.00
 *                 sellingPrice: 125000.00
 *                 mrp: 150000.00
 *     responses:
 *       200:
 *         description: GRN updated successfully
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
 *                   example: GRN updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/GRN'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       400:
 *         description: Validation error or cannot edit approved/rejected GRN
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
 *                   example: Cannot edit approved or rejected GRN
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/:id', checkPermission('update_grns'), grnController.updateGRN);

/**
 * @swagger
 * /api/grns/{id}/status:
 *   patch:
 *     summary: Update GRN status and process approval
 *     description: |
 *       Update the status of a GRN. When approving a GRN, this endpoint:
 *       
 *       **Approval Process (status = 'approved'):**
 *       1. Validates that all items have sellingPrice and mrp
 *       2. Creates inventory records for all items
 *       3. Updates product quantities and prices
 *       4. Creates inventory ledger entries
 *       5. Records payment transaction (if paymentAmount provided)
 *       6. Updates supplier balance
 *       7. Sends email notification to supplier (if configured)
 *       8. Creates product audit logs
 *       
 *       **Payment Handling:**
 *       - paymentMethod and paymentAmount are REQUIRED when status = 'approved'
 *       - If paymentAmount < totalAmount, remaining balance is recorded as supplier credit
 *       - Supported payment methods: CASH, CARD, BANK_TRANSFER, CHEQUE, CREDIT
 *       
 *       **Status Transitions:**
 *       - draft → received → verified → approved
 *       - Any status → rejected (with reason in inspectionNotes)
 *       
 *       **Important Notes:**
 *       - Once approved, GRN cannot be edited or deleted
 *       - Rejection does not update inventory
 *       - Status changes are logged in audit trail
 *     tags: [GRNs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: GRN ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, received, verified, approved, rejected]
 *                 description: |
 *                   New status for the GRN:
 *                   - draft: Initial state
 *                   - received: Goods physically received
 *                   - verified: Quality inspection completed
 *                   - approved: Approved and inventory updated
 *                   - rejected: Rejected, no inventory update
 *                 example: approved
 *               paymentMethod:
 *                 type: string
 *                 description: |
 *                   Payment method used when approving the GRN.
 *                   **REQUIRED when status = 'approved'**
 *                 enum: [CASH, CARD, BANK_TRANSFER, CHEQUE, CREDIT]
 *                 example: CASH
 *               paymentAmount:
 *                 type: number
 *                 format: double
 *                 description: |
 *                   Amount paid at the time of GRN approval.
 *                   Balance amount will be calculated automatically based on GRN total.
 *                   **REQUIRED when status = 'approved'**
 *                   - If paymentAmount = totalAmount: Full payment
 *                   - If paymentAmount < totalAmount: Partial payment, balance added to supplier credit
 *                   - If paymentAmount = 0: Full credit (payment method should be 'CREDIT')
 *                 example: 50000
 *               rejectionReason:
 *                 type: string
 *                 description: Reason for rejection (recommended when status = 'rejected')
 *                 example: Quality issues found during inspection
 *           examples:
 *             approveWithFullPayment:
 *               summary: Approve GRN with full payment
 *               value:
 *                 status: approved
 *                 paymentMethod: CASH
 *                 paymentAmount: 12750000
 *             approveWithPartialPayment:
 *               summary: Approve GRN with partial payment
 *               value:
 *                 status: approved
 *                 paymentMethod: BANK_TRANSFER
 *                 paymentAmount: 5000000
 *             approveOnCredit:
 *               summary: Approve GRN on full credit
 *               value:
 *                 status: approved
 *                 paymentMethod: CREDIT
 *                 paymentAmount: 0
 *             rejectGRN:
 *               summary: Reject GRN
 *               value:
 *                 status: rejected
 *                 rejectionReason: Quality issues - items damaged during transit
 *     responses:
 *       200:
 *         description: GRN status updated successfully
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
 *                   example: GRN approved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     grn:
 *                       $ref: '#/components/schemas/GRN'
 *                     inventoryRecords:
 *                       type: array
 *                       description: Created inventory records (only when approved)
 *                       items:
 *                         type: object
 *                     paymentRecord:
 *                       type: object
 *                       description: Payment transaction record (only when approved with payment)
 *       400:
 *         description: Invalid input, missing payment details, or validation error
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
 *                   examples:
 *                     - Payment method and amount are required when approving GRN
 *                     - All items must have selling price and MRP before approval
 *                     - Invalid status transition
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/:id/status', checkPermission('update_grns'), grnController.updateGRNStatus);


/**
 * @swagger
 * /api/grns/{id}:
 *   delete:
 *     summary: Delete a GRN
 *     description: |
 *       Delete a GRN and all its associated items.
 *       
 *       **Important Restrictions:**
 *       - Cannot delete GRN if status is 'approved' (inventory already updated)
 *       - Only GRNs with status 'draft', 'received', 'verified', or 'rejected' can be deleted
 *       - Deletion is permanent and cannot be undone
 *       - All associated GRN items will be deleted (cascade delete)
 *       
 *       **Use Cases:**
 *       - Remove draft GRNs that were created by mistake
 *       - Clean up rejected GRNs
 *       - Delete GRNs that are no longer needed
 *     tags: [GRNs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: GRN ID
 *         example: 1
 *     responses:
 *       200:
 *         description: GRN deleted successfully
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
 *                   example: GRN deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       400:
 *         description: Cannot delete approved GRN
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
 *                   example: Cannot delete approved GRN
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id', checkPermission('delete_grns'), grnController.deleteGRN);

/**
 * @swagger
 * /api/grns/{id}/pdf:
 *   get:
 *     summary: Generate and download GRN as PDF
 *     description: |
 *       Generate a professionally formatted PDF document for the GRN.
 *       
 *       **PDF Contents:**
 *       - Company logo and details
 *       - GRN number and date
 *       - Supplier information
 *       - Purchase Order reference (if linked)
 *       - Detailed item list with quantities, prices, and totals
 *       - Batch numbers and expiry dates
 *       - Total quantity and amount
 *       - Inspection notes
 *       - Status and approval information
 *       - Received by and created by details
 *       
 *       **Use Cases:**
 *       - Print GRN for physical records
 *       - Email to supplier as confirmation
 *       - Attach to accounting records
 *       - Archive for compliance
 *       
 *       **Note:** PDF is generated on-the-fly and not stored on server
 *     tags: [GRNs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: GRN ID
 *         example: 1
 *     responses:
 *       200:
 *         description: PDF file generated and downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: attachment; filename=GRN-000001.pdf
 *           Content-Type:
 *             schema:
 *               type: string
 *               example: application/pdf
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id/pdf', grnController.generateGRNPDF);

/**
 * @swagger
 * /api/grns/{id}/payment:
 *   put:
 *     summary: Update GRN payment amount
 *     description: Update the paid amount for a GRN. Balance and payment status are calculated automatically.
 *     tags:
 *       - GRNs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: GRN ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paidAmount
 *             properties:
 *               paidAmount:
 *                 type: number
 *                 format: decimal
 *                 description: Total amount paid for this GRN
 *                 example: 30000.00
 *           examples:
 *             fullPayment:
 *               summary: Full payment
 *               value:
 *                 paidAmount: 50000.00
 *             partialPayment:
 *               summary: Partial payment
 *               value:
 *                 paidAmount: 30000.00
 *     responses:
 *       200:
 *         description: Payment updated successfully
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
 *                   example: Payment updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     grnNumber:
 *                       type: string
 *                       example: GRN-000001
 *                     totalAmount:
 *                       type: number
 *                       example: 50000.00
 *                     paidAmount:
 *                       type: number
 *                       example: 30000.00
 *                     balanceAmount:
 *                       type: number
 *                       example: 20000.00
 *                     paymentStatus:
 *                       type: string
 *                       enum: [paid, partial, pending, overpaid]
 *                       example: partial
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/:id/payment', checkPermission('update_grns'), [
    body('paidAmount').isNumeric().withMessage('Paid amount must be a number')
], grnController.updateGRNPayment);

/**
 * @swagger
 * /api/grns/{id}/payment/add:
 *   post:
 *     summary: Add payment to GRN (incremental)
 *     description: Add a payment amount to existing paid amount. Useful for partial payments over time.
 *     tags:
 *       - GRNs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: GRN ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentAmount
 *             properties:
 *               paymentAmount:
 *                 type: number
 *                 format: decimal
 *                 description: Amount to add to existing paid amount
 *                 example: 10000.00
 *           examples:
 *             firstPayment:
 *               summary: First payment installment
 *               value:
 *                 paymentAmount: 20000.00
 *             secondPayment:
 *               summary: Second payment installment
 *               value:
 *                 paymentAmount: 15000.00
 *     responses:
 *       200:
 *         description: Payment added successfully
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
 *                   example: Payment added successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     grnNumber:
 *                       type: string
 *                       example: GRN-000001
 *                     totalAmount:
 *                       type: number
 *                       example: 50000.00
 *                     paidAmount:
 *                       type: number
 *                       example: 35000.00
 *                     balanceAmount:
 *                       type: number
 *                       example: 15000.00
 *                     paymentStatus:
 *                       type: string
 *                       example: partial
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:id/payment/add', checkPermission('update_grns'), [
    body('paymentAmount').isNumeric().withMessage('Payment amount must be a number').isFloat({ gt: 0 }).withMessage('Payment amount must be greater than 0')
], grnController.addGRNPayment);

/**
 * @swagger
 * /api/grns/{id}/payment:
 *   get:
 *     summary: Get GRN payment details
 *     description: Retrieve payment information for a specific GRN
 *     tags:
 *       - GRNs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: GRN ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAmount:
 *                       type: number
 *                       example: 50000.00
 *                     paidAmount:
 *                       type: number
 *                       example: 30000.00
 *                     balanceAmount:
 *                       type: number
 *                       example: 20000.00
 *                     paymentStatus:
 *                       type: string
 *                       example: partial
 *                     isFullyPaid:
 *                       type: boolean
 *                       example: false
 *                     isPartiallyPaid:
 *                       type: boolean
 *                       example: true
 *                     isPending:
 *                       type: boolean
 *                       example: false
 *                     isOverpaid:
 *                       type: boolean
 *                       example: false
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id/payment', checkPermission('view_grns'), grnController.getGRNPaymentDetails);

/**
 * @swagger
 * /api/grns/number/{grnNumber}:
 *   get:
 *     summary: Get GRN by GRN Number
 *     description: Search and retrieve a specific GRN using its unique GRN number (e.g., GRN260100001)
 *     tags: [GRNs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grnNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: GRN number to search for
 *         example: GRN260100001
 *     responses:
 *       200:
 *         description: GRN found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/GRN'
 *       400:
 *         description: GRN number is required
 *       404:
 *         description: GRN not found
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/number/:grnNumber', checkPermission('view_grns'), grnController.getGRNByNumber);

module.exports = router;
