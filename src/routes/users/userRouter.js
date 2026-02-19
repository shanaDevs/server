const express = require('express');
const router = express.Router();
const { userController } = require('../../controllers');
const { body } = require('express-validator');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - phone
 *         - firstName
 *         - lastName
 *         - userName
 *         - password
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated user ID
 *         phone:
 *           type: string
 *           description: User phone number
 *         firstName:
 *           type: string
 *           description: User first name
 *         lastName:
 *           type: string
 *           description: User last name
 *         userName:
 *           type: string
 *           description: User username
 *         role:
 *           type: string
 *           enum: [user, super_admin, admin, manager, super_cashier, cashier]
 *           description: User role
 *         isDisabled:
 *           type: boolean
 *           description: Whether the user is disabled
 *         isDeleted:
 *           type: boolean
 *           description: Whether the user is deleted
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     LoginRequest:
 *       type: object
 *       required:
 *         - phone
 *         - password
 *       properties:
 *         phone:
 *           type: string
 *         password:
 *           type: string
 *           format: password
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - phone
 *         - firstName
 *         - lastName
 *         - userName
 *         - password
 *       properties:
 *         phone:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         userName:
 *           type: string
 *         password:
 *           type: string
 *           format: password
 *         role:
 *           type: string
 *           enum: [user, admin, manager, super_admin, super_cashier, cashier]
 */

// Validation rules
const registerValidation = [
    body('phone').trim().isLength({ min: 10, max: 11 }).withMessage('Phone number must be exactly 11 characters').matches(/^\d+$/).withMessage('Phone number must contain only digits'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('userName').trim().notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['user', 'admin', 'manager', 'super_admin', 'super_cashier', 'cashier']).withMessage('Invalid role')
];

const loginValidation = [
    body('phone').trim().isLength({ min: 10, max: 11 }).withMessage('Phone number must be exactly 11 characters').matches(/^\d+$/).withMessage('Phone number must contain only digits'),
    body('password').notEmpty().withMessage('Password is required')
];

const updateUserValidation = [
    body('phone').optional().trim().isLength({ min: 10, max: 11 }).withMessage('Phone number must be exactly 11 characters').matches(/^\d+$/).withMessage('Phone number must contain only digits'),
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('userName').optional().trim().notEmpty().withMessage('Username cannot be empty'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['user', 'admin', 'manager', 'super_admin', 'super_cashier', 'cashier']).withMessage('Invalid role'),
    body('isDisabled').optional().isBoolean().withMessage('isDisabled must be a boolean')
];

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 *       401:
 *         description: Unauthorized - No token provided
 *       403:
 *         description: Forbidden - Super admin role required
 */
router.post('/register', checkPermission('create_users'), registerValidation, userController.register);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account disabled or deleted
 */
router.post('/login', loginValidation, userController.login);

/**
 * @swagger
 * /api/users/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh-token', userController.refreshToken);

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: Logout user (client-side token removal)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', userController.logout);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
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
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role
 *       - in: query
 *         name: isDisabled
 *         schema:
 *           type: boolean
 *         description: Filter by disabled status
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized - No token provided
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/', checkPermission('view_users'), userController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/:id', checkPermission('view_users'), userController.getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               userName:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *               isDisabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
router.put('/:id', checkPermission('update_users'), updateUserValidation, userController.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Soft delete user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete('/:id', checkPermission('delete_users'), userController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/toggle-status:
 *   patch:
 *     summary: Toggle user disabled/enabled status
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User status toggled successfully
 *       404:
 *         description: User not found
 */
router.patch('/:id/toggle-status', checkPermission('update_users'), userController.toggleUserStatus);

module.exports = router;
