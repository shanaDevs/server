const express = require('express');
const router = express.Router();
const { suppliersController } = require('../../controllers');
const { body, param } = require('express-validator');
const { checkPermission } = require('../../middlewares/auth');

// Validation middleware for create
const supplierCreateValidation = [
    body('companyId')
        .notEmpty()
        .withMessage('Company ID is required')
        .isInt()
        .withMessage('Company ID must be a number'),
    body('supplierCode')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Supplier code must be between 2 and 50 characters'),
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Supplier name is required')
        .isLength({ min: 2, max: 255 })
        .withMessage('Supplier name must be between 2 and 255 characters'),
    body('contactPerson')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Contact person must be max 100 characters'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address'),
    body('phone')
        .optional()
        .trim()
        .matches(/^(?:0|94|\+94)?(?:(11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91)(0|2|3|4|5|7|9)|7(0|1|2|4|5|6|7|8)\d)\d{6}$/)
        .withMessage('Please enter a valid Sri Lankan phone number (e.g., 0743242403, +94743242403)'),
    body('address')
        .optional()
        .trim(),
    body('taxNumber')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Tax number must be max 50 characters'),
    body('paymentTerms')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Payment terms must be max 100 characters'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean')
];

// Validation middleware for update (all fields optional except validations)
const supplierUpdateValidation = [
    body('companyId')
        .optional()
        .isInt()
        .withMessage('Company ID must be a number'),
    body('supplierCode')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Supplier code must be between 2 and 50 characters'),
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Supplier name must be between 2 and 255 characters'),
    body('contactPerson')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Contact person must be max 100 characters'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address'),
    body('phone')
        .optional()
        .trim()
        .matches(/^(?:0|94|\+94)?(?:(11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91)(0|2|3|4|5|7|9)|7(0|1|2|4|5|6|7|8)\d)\d{6}$/)
        .withMessage('Please enter a valid Sri Lankan phone number (e.g., 0743242403, +94743242403)'),
    body('address')
        .optional()
        .trim(),
    body('taxNumber')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Tax number must be max 50 characters'),
    body('paymentTerms')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Payment terms must be max 100 characters'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean')
];

/**
 * @swagger
 * tags:
 *   name: Suppliers
 *   description: Supplier management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Supplier:
 *       type: object
 *       required:
 *         - companyId
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: Supplier ID
 *         companyId:
 *           type: integer
 *           description: Company ID
 *         supplierCode:
 *           type: string
 *           description: Auto-generated supplier code (SUP001, SUP002, etc.) or custom
 *         name:
 *           type: string
 *           description: Supplier name
 *         contactPerson:
 *           type: string
 *           description: Contact person name
 *         email:
 *           type: string
 *           format: email
 *           description: Supplier email address
 *         phone:
 *           type: string
 *           description: Sri Lankan phone number
 *         address:
 *           type: string
 *           description: Supplier address
 *         taxNumber:
 *           type: string
 *           description: Tax identification number
 *         paymentTerms:
 *           type: string
 *           description: Payment terms description
 *         isActive:
 *           type: boolean
 *           description: Whether supplier is active
 */

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     summary: Get all suppliers
 *     tags: [Suppliers]
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
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, company name, or phone number
 *       - in: query
 *         name: isDisabled
 *         schema:
 *           type: boolean
 *         description: Filter by disabled status
 *     responses:
 *       200:
 *         description: List of suppliers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Supplier'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
router.get('/', checkPermission('view_suppliers'), suppliersController.getAllSuppliers);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   get:
 *     summary: Get supplier by ID
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Supplier ID
 *     responses:
 *       200:
 *         description: Supplier details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Supplier'
 *       404:
 *         description: Supplier not found
 */
router.get('/:id', checkPermission('view_suppliers'), suppliersController.getSupplierById);

/**
 * @swagger
 * /api/suppliers:
 *   post:
 *     summary: Create a new supplier
 *     tags: [Suppliers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - name
 *             properties:
 *               companyId:
 *                 type: integer
 *                 example: 1
 *               supplierCode:
 *                 type: string
 *                 description: Optional - will be auto-generated if not provided (SUP001, SUP002, etc.)
 *                 example: "SUP001"
 *               name:
 *                 type: string
 *                 example: "ABC Suppliers"
 *               contactPerson:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "supplier@example.com"
 *               phone:
 *                 type: string
 *                 example: "0743242403"
 *               address:
 *                 type: string
 *                 example: "123 Main Street, Colombo"
 *               taxNumber:
 *                 type: string
 *                 example: "TAX123456"
 *               paymentTerms:
 *                 type: string
 *                 example: "Net 30 days"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Supplier created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Supplier'
 *       400:
 *         description: Validation error
 */
router.post('/', checkPermission('create_suppliers'), supplierCreateValidation, suppliersController.createSupplier);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   put:
 *     summary: Update a supplier
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Supplier ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyId:
 *                 type: integer
 *               supplierCode:
 *                 type: string
 *               name:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               taxNumber:
 *                 type: string
 *               paymentTerms:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Supplier updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Supplier not found
 */
router.put('/:id', checkPermission('update_suppliers'), supplierUpdateValidation, suppliersController.updateSupplier);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   delete:
 *     summary: Delete a supplier
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Supplier ID
 *     responses:
 *       200:
 *         description: Supplier deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Supplier not found
 */
router.delete('/:id', checkPermission('delete_suppliers'), suppliersController.deleteSupplier);

/**
 * @swagger
 * /api/suppliers/{id}/toggle-status:
 *   patch:
 *     summary: Toggle supplier status (enable/disable)
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Supplier ID
 *     responses:
 *       200:
 *         description: Supplier status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Supplier'
 *       404:
 *         description: Supplier not found
 */
router.patch('/:id/toggle-status', checkPermission('update_suppliers'), suppliersController.toggleSupplierStatus);

const csvUpload = require('../../middlewares/csvUploadMiddleware');
const importController = require('../../controllers/importController');

/**
 * @swagger
 * /api/suppliers/import:
 *   post:
 *     summary: Import suppliers from CSV file
 *     description: Bulk import suppliers from CSV. Checks for duplicates by name.
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with columns - name, contact_person, phone, email, address, city, state, country, postal_code, tax_id, payment_terms, credit_limit, notes, is_active
 *     responses:
 *       201:
 *         description: Suppliers imported successfully
 *       400:
 *         description: No file uploaded or CSV is empty
 */
router.post('/import', checkPermission('create_suppliers'), csvUpload.single('file'), importController.importSuppliersFromCSV);

module.exports = router;
