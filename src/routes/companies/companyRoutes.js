const express = require('express');
const router = express.Router();
const { companyController } = require('../../controllers');
const { body } = require('express-validator');
const { checkPermission } = require('../../middlewares/auth');

// Validation middleware
const companyValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Company name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Company name must be between 2 and 100 characters'),
    body('contactEmail')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address'),
    body('phoneNumber')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required'),
    body('address')
        .optional()
        .trim(),
    body('taxid')
        .optional()
        .trim()
];

/**
 * @swagger
 * tags:
 *   name: Companies
 *   description: Company management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Company:
 *       type: object
 *       required:
 *         - name
 *         - phoneNumber
 *       properties:
 *         id:
 *           type: integer
 *           description: Company ID
 *         name:
 *           type: string
 *           description: Company name
 *         address:
 *           type: string
 *           description: Company address
 *         contactEmail:
 *           type: string
 *           format: email
 *           description: Company email address
 *         phoneNumber:
 *           type: string
 *           description: Company phone number
 *         taxid:
 *           type: string
 *           description: Tax identification number
 *         isdisabled:
 *           type: boolean
 *           description: Whether company is disabled
 *         idDeleted:
 *           type: boolean
 *           description: Whether company is deleted
 */

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Get all companies
 *     tags: [Companies]
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
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, address, or phone
 *       - in: query
 *         name: isDisabled
 *         schema:
 *           type: boolean
 *         description: Filter by disabled status
 *     responses:
 *       200:
 *         description: List of companies
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
 *                     $ref: '#/components/schemas/Company'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/', checkPermission('view_companies'), companyController.getAllCompanies);

/**
 * @swagger
 * /api/companies/{id}:
 *   get:
 *     summary: Get company by ID
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Company details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       404:
 *         description: Company not found
 */
router.get('/:id', checkPermission('view_companies'), companyController.getCompanyById);

/**
 * @swagger
 * /api/companies:
 *   post:
 *     summary: Create a new company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phoneNumber
 *             properties:
 *               name:
 *                 type: string
 *                 example: "ABC Company Ltd"
 *               address:
 *                 type: string
 *                 example: "123 Main Street, Colombo"
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 example: "contact@abccompany.com"
 *               phoneNumber:
 *                 type: string
 *                 example: "0112345678"
 *               taxid:
 *                 type: string
 *                 example: "TAX123456"
 *     responses:
 *       201:
 *         description: Company created successfully
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
 *                   $ref: '#/components/schemas/Company'
 *       400:
 *         description: Validation error
 */
router.post('/', checkPermission('create_companies'), companyValidation, companyController.createCompany);

/**
 * @swagger
 * /api/companies/{id}:
 *   put:
 *     summary: Update a company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phoneNumber
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               taxid:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Company not found
 */
router.put('/:id', checkPermission('update_companies'), companyValidation, companyController.updateCompany);

/**
 * @swagger
 * /api/companies/{id}:
 *   delete:
 *     summary: Delete a company (soft delete)
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Company deleted successfully
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
 *         description: Company not found
 */
router.delete('/:id', checkPermission('delete_companies'), companyController.deleteCompany);

/**
 * @swagger
 * /api/companies/{id}/toggle-status:
 *   patch:
 *     summary: Toggle company status (enable/disable)
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Company status toggled successfully
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
 *                   $ref: '#/components/schemas/Company'
 *       404:
 *         description: Company not found
 */
router.patch('/:id/toggle-status', checkPermission('update_companies'), companyController.toggleCompanyStatus);

const csvUpload = require('../../middlewares/csvUploadMiddleware');
const importController = require('../../controllers/importController');

/**
 * @swagger
 * /api/companies/import:
 *   post:
 *     summary: Import companies from CSV file
 *     description: Bulk import companies from CSV. Checks for duplicates by name.
 *     tags: [Companies]
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
 *                 description: CSV file with columns - name (required), address, contact_email, phone_number, is_disabled (0 or 1)
 *     responses:
 *       201:
 *         description: Companies imported successfully
 *       400:
 *         description: No file uploaded or CSV is empty
 */
router.post('/import', checkPermission('create_companies'), csvUpload.single('file'), importController.importCompaniesFromCSV);

module.exports = router;