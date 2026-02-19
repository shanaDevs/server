const express = require('express');
const router = express.Router();
const { brandController } = require('../../controllers');
const { body } = require('express-validator');
const { checkPermission } = require('../../middlewares/auth');
const csvUpload = require('../../middlewares/csvUploadMiddleware');
const upload = require('../../middlewares/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   name: Brands
 *   description: Product brand management
 */

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: Get all brands
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all brands
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       image:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', checkPermission('view_brand'), brandController.getAllBrands);

/**
 * @swagger
 * /api/brands/{id}:
 *   get:
 *     summary: Get brand by ID
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Brand ID
 *     responses:
 *       200:
 *         description: Brand details
 *       404:
 *         description: Brand not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', checkPermission('view_brand'), brandController.getBrandById);

/**
 * @swagger
 * /api/brands:
 *   post:
 *     summary: Create a new brand
 *     tags: [Brands]
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
 *                 example: "Dell"
 *               description:
 *                 type: string
 *                 example: "Dell Technologies - Computer manufacturer"
 *               image:
 *                 type: string
 *                 example: "/images/brands/dell.png"
 *     responses:
 *       201:
 *         description: Brand created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', checkPermission('create_brand'), upload.single('image'), [
    body('name').notEmpty().withMessage('Brand name is required'),
    body('image').optional({ nullable: true }).isString()
], brandController.createBrand);

/**
 * @swagger
 * /api/brands/{id}:
 *   put:
 *     summary: Update a brand
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Brand ID
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
 *     responses:
 *       200:
 *         description: Brand updated successfully
 *       404:
 *         description: Brand not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', checkPermission('update_brand'), upload.single('image'), brandController.updateBrand);

/**
 * @swagger
 * /api/brands/{id}:
 *   delete:
 *     summary: Delete a brand
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Brand ID
 *     responses:
 *       200:
 *         description: Brand deleted successfully
 *       404:
 *         description: Brand not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', checkPermission('delete_brand'), brandController.deleteBrand);

const importController = require('../../controllers/importController');

/**
 * @swagger
 * /api/brands/import:
 *   post:
 *     summary: Import brands from CSV file
 *     description: Bulk import brands from CSV. Checks for duplicates by name.
 *     tags: [Brands]
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
 *                 description: CSV file with columns - name, description, website, logo, is_active
 *     responses:
 *       201:
 *         description: Brands imported successfully
 *       400:
 *         description: No file uploaded or CSV is empty
 */
router.post('/import', checkPermission('create_brand'), csvUpload.single('file'), importController.importBrandsFromCSV);

module.exports = router;