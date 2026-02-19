const express = require('express');
const router = express.Router();
const { categoryController } = require('../../controllers');
const { body } = require('express-validator');
const { checkPermission } = require('../../middlewares/auth');
const csvUpload = require('../../middlewares/csvUploadMiddleware');
const upload = require('../../middlewares/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: Category ID
 *         name:
 *           type: string
 *           description: Category name
 *         description:
 *           type: string
 *           description: Category description
 *         parent_id:
 *           type: integer
 *           description: Parent category ID (null for top-level categories)
 *         is_active:
 *           type: boolean
 *           description: Whether category is active
 *         image:
 *           type: string
 *           description: URL or path to category image
 *         created_at:
 *           type: string
 *           format: date-time
 */

// Validation rules
const createCategoryValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Category name is required')
        .isLength({ max: 255 })
        .withMessage('Category name cannot exceed 255 characters'),
    body('description')
        .optional()
        .trim(),
    body('parent_id')
        .optional({ nullable: true })
        .isInt()
        .withMessage('Parent ID must be an integer'),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean'),
    body('image')
        .optional({ nullable: true })
        .isString()
];

const updateCategoryValidation = [
    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Category name cannot be empty')
        .isLength({ max: 255 })
        .withMessage('Category name cannot exceed 255 characters'),
    body('description')
        .optional()
        .trim(),
    body('parent_id')
        .optional(),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean'),
    body('image')
        .optional({ nullable: true })
        .isString()
];

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories with pagination and filtering
 *     tags: [Categories]
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
 *         description: Search by name or description
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: parent_id
 *         schema:
 *           type: string
 *         description: Filter by parent ID (use "null" for top-level categories)
 *     responses:
 *       200:
 *         description: List of categories
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
 *                     $ref: '#/components/schemas/Category'
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
router.get('/', checkPermission('view_categories'), categoryController.getAllCategories);

/**
 * @swagger
 * /api/categories/tree:
 *   get:
 *     summary: Get category tree (hierarchical structure)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status (optional)
 *     responses:
 *       200:
 *         description: Hierarchical category tree
 *       401:
 *         description: Unauthorized
 */
router.get('/tree', checkPermission('view_categories'), categoryController.getCategoryTree);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID with subcategories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details with subcategories
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', checkPermission('view_categories'), categoryController.getCategoryById);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name
 *                 example: Electronics
 *               description:
 *                 type: string
 *                 description: Category description
 *                 example: Electronic devices and accessories
 *               parent_id:
 *                 type: integer
 *                 description: Parent category ID (null for top-level categories)
 *                 example: null
 *               is_active:
 *                 type: boolean
 *                 description: Whether the category is active
 *                 default: true
 *                 example: true
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Parent category not found
 *       409:
 *         description: Category name already exists
 */
router.post('/', checkPermission('create_categories'), upload.single('image'), createCategoryValidation, categoryController.createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parent_id:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.put('/:id', checkPermission('update_categories'), upload.single('image'), updateCategoryValidation, categoryController.updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete category (soft delete)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete category with active subcategories
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.delete('/:id', checkPermission('delete_categories'), categoryController.deleteCategory);

/**
 * @swagger
 * /api/categories/{id}/toggle-status:
 *   patch:
 *     summary: Toggle category active/inactive status
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category status toggled successfully
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
 *                   example: Category activated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Server error
 */
router.patch('/:id/toggle-status', checkPermission('update_categories'), categoryController.toggleCategoryStatus);

const importController = require('../../controllers/importController');

/**
 * @swagger
 * /api/categories/import:
 *   post:
 *     summary: Import categories from CSV file
 *     description: Bulk import categories from CSV. Checks for duplicates by name.
 *     tags: [Categories]
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
 *                 description: CSV file with columns - name, description, parent_id, is_active
 *     responses:
 *       201:
 *         description: Categories imported successfully
 *       400:
 *         description: No file uploaded or CSV is empty
 */
router.post('/import', checkPermission('create_categories'), csvUpload.single('file'), importController.importCategoriesFromCSV);

module.exports = router;
