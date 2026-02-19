const express = require('express');
const router = express.Router();
const locationController = require('../../controllers/inventory/locationController');
const { body } = require('express-validator');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Location:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         type:
 *           type: string
 *           enum: [warehouse, store, shelf, bin, other]
 *         parentLocationId:
 *           type: integer
 *         branchId:
 *           type: integer
 *         address:
 *           type: string
 *         capacity:
 *           type: integer
 *         isActive:
 *           type: boolean
 */

// Validation rules
const createLocationValidation = [
    body('name').trim().notEmpty().withMessage('Location name is required'),
    body('code').optional().trim(),
    body('type').optional().isIn(['warehouse', 'store', 'shelf', 'bin', 'other']),
    body('parentLocationId').optional().isInt(),
    body('branchId').optional().isInt(),
    body('address').optional().trim(),
    body('capacity').optional().isInt()
];

const updateLocationValidation = [
    body('name').optional().trim().notEmpty(),
    body('code').optional().trim(),
    body('type').optional().isIn(['warehouse', 'store', 'shelf', 'bin', 'other']),
    body('parentLocationId').optional().isInt(),
    body('branchId').optional().isInt(),
    body('address').optional().trim(),
    body('capacity').optional().isInt(),
    body('isActive').optional().isBoolean()
];

/**
 * @swagger
 * /api/locations:
 *   get:
 *     summary: Get all locations
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [warehouse, store, shelf, bin, other]
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of locations
 */
router.get('/', locationController.getAllLocations);

/**
 * @swagger
 * /api/locations/types:
 *   get:
 *     summary: Get available location types
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Location types
 */
router.get('/types', locationController.getLocationTypes);

/**
 * @swagger
 * /api/locations/{id}:
 *   get:
 *     summary: Get location by ID
 *     tags: [Inventory]
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
 *         description: Location details
 *       404:
 *         description: Location not found
 */
router.get('/:id', locationController.getLocationById);

/**
 * @swagger
 * /api/locations:
 *   post:
 *     summary: Create new location
 *     tags: [Inventory]
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
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [warehouse, store, shelf, bin, other]
 *               parentLocationId:
 *                 type: integer
 *               branchId:
 *                 type: integer
 *               address:
 *                 type: string
 *               capacity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Location created
 */
router.post('/', checkPermission('create_location'), createLocationValidation, locationController.createLocation);

/**
 * @swagger
 * /api/locations/{id}:
 *   put:
 *     summary: Update location
 *     tags: [Inventory]
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
 *             $ref: '#/components/schemas/Location'
 *     responses:
 *       200:
 *         description: Location updated
 *       404:
 *         description: Location not found
 */
router.put('/:id', checkPermission('update_location'), updateLocationValidation, locationController.updateLocation);

/**
 * @swagger
 * /api/locations/{id}:
 *   delete:
 *     summary: Delete location
 *     tags: [Inventory]
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
 *         description: Location deleted
 *       404:
 *         description: Location not found
 */
router.delete('/:id', checkPermission('delete_location'), locationController.deleteLocation);

module.exports = router;
