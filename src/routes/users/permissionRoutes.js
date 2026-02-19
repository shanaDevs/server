const express = require('express');
const router = express.Router();
const { permissionController } = require('../../controllers');
const { body } = require('express-validator');
const { verifyToken, checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Permission:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         action:
 *           type: string
 *           enum: [GET, POST, PUT, DELETE, PATCH]
 *         description:
 *           type: string
 *         module:
 *           type: string
 *         isActive:
 *           type: boolean
 */

// Validation
const createPermissionValidation = [
    body('name').trim().notEmpty().withMessage('Permission name is required'),
    body('action').trim().notEmpty().isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).withMessage('Action must be GET, POST, PUT, DELETE, or PATCH'),
    body('module').trim().notEmpty().withMessage('Module is required'),
    body('description').optional().trim()
];

const grantPermissionsValidation = [
    body('permissionIds').isArray({ min: 1 }).withMessage('permissionIds must be a non-empty array'),
    body('permissionIds.*').isInt().withMessage('Each permission ID must be an integer')
];

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of permissions grouped by module
 */
router.get('/', verifyToken, permissionController.getAllPermissions);

/**
 * @swagger
 * /api/permissions:
 *   post:
 *     summary: Create new permission (super_admin only)
 *     tags: [Permissions]
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
 *               - action
 *               - module
 *             properties:
 *               name:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE, PATCH]
 *               description:
 *                 type: string
 *               module:
 *                 type: string
 *     responses:
 *       201:
 *         description: Permission created
 */
router.post('/', checkPermission('create_permissions'), createPermissionValidation, permissionController.createPermission);

/**
 * @swagger
 * /api/permissions/seed:
 *   post:
 *     summary: Seed default permissions (super_admin only)
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default permissions seeded
 */
router.post('/seed', checkPermission('create_permissions'), permissionController.seedPermissions);

/**
 * @swagger
 * /api/permissions/auto-generate:
 *   post:
 *     summary: Auto-generate permissions from route files (super_admin only)
 *     description: Scans all route files and automatically creates/updates permissions based on defined endpoints
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permissions auto-generated successfully
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
 *                   type: object
 */
router.post('/auto-generate', checkPermission('create_permissions'), permissionController.autoGenerate);

/**
 * @swagger
 * /api/permissions/user/{userId}:
 *   get:
 *     summary: Get user's permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User permissions
 */
router.get('/user/:userId', checkPermission('view_permission'), permissionController.getUserPermissions);

/**
 * @swagger
 * /api/permissions/user/{userId}/grant:
 *   post:
 *     summary: Grant permissions to user
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               - permissionIds
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Permissions granted
 */
router.post('/user/:userId/grant', checkPermission('assign_permissions'), grantPermissionsValidation, permissionController.grantPermissions);

/**
 * @swagger
 * /api/permissions/user/{userId}/revoke:
 *   post:
 *     summary: Revoke permissions from user
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               - permissionIds
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Permissions revoked
 */
router.post('/user/:userId/revoke', checkPermission('assign_permissions'), grantPermissionsValidation, permissionController.revokePermissions);

/**
 * @swagger
 * /api/permissions/user/{userId}/sync:
 *   put:
 *     summary: Sync user permissions (replace all)
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               - permissionIds
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Permissions synchronized
 */
router.put('/user/:userId/sync', checkPermission('assign_permissions'), permissionController.syncUserPermissions);

module.exports = router;
