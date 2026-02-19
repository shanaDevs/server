const express = require('express');
const router = express.Router();
const branchController = require('../../controllers/branches/branchController');
const { verifyToken, requireSuperAdmin, requireAdminOrAbove } = require('../../middlewares/auth');
const { checkBranchAccess } = require('../../middlewares/branchAccess');

/**
 * @swagger
 * components:
 *   schemas:
 *     Branch:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Branch ID
 *         name:
 *           type: string
 *           description: Branch name
 *         code:
 *           type: string
 *           description: Unique branch code
 *         address:
 *           type: string
 *           description: Branch address
 *         phone:
 *           type: string
 *           description: Branch phone number
 *         email:
 *           type: string
 *           description: Branch email
 *         isActive:
 *           type: boolean
 *           description: Branch active status
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UserBranch:
 *       type: object
 *       properties:
 *         userId:
 *           type: integer
 *           description: User ID
 *         branchId:
 *           type: integer
 *           description: Branch ID
 *         isDefault:
 *           type: boolean
 *           description: Is this the default branch for the user
 *         canAccessAllBranches:
 *           type: boolean
 *           description: Can the user access all branches
 */

/**
 * @swagger
 * /api/branches/my-context:
 *   get:
 *     summary: Get current user's branch context
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User branch context retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: integer
 *                     defaultBranchId:
 *                       type: integer
 *                     canAccessAllBranches:
 *                       type: boolean
 *                     branches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Branch'
 *       401:
 *         description: Unauthorized
 */
router.get('/my-context', [verifyToken, checkBranchAccess], branchController.getMyBranchContext);

/**
 * @swagger
 * /api/branches:
 *   post:
 *     summary: Create a new branch
 *     tags: [Branches]
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
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Branch created successfully
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
 *                   $ref: '#/components/schemas/Branch'
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.post('/', requireSuperAdmin, branchController.createBranch);

/**
 * @swagger
 * /api/branches:
 *   get:
 *     summary: Get all branches
 *     tags: [Branches]
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
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Branches retrieved successfully
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
 *                     $ref: '#/components/schemas/Branch'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', [verifyToken, checkBranchAccess], branchController.getAllBranches);

/**
 * @swagger
 * /api/branches/{id}:
 *   get:
 *     summary: Get branch by ID
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Branch'
 *       404:
 *         description: Branch not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', [verifyToken, checkBranchAccess], branchController.getBranchById);

/**
 * @swagger
 * /api/branches/{id}:
 *   put:
 *     summary: Update branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Branch updated successfully
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
 *                   $ref: '#/components/schemas/Branch'
 *       404:
 *         description: Branch not found
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.put('/:id', requireSuperAdmin, branchController.updateBranch);

/**
 * @swagger
 * /api/branches/{id}:
 *   delete:
 *     summary: Delete branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch deleted successfully
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
 *         description: Branch not found
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.delete('/:id', requireSuperAdmin, branchController.deleteBranch);

/**
 * @swagger
 * /api/branches/assign-user:
 *   post:
 *     summary: Assign user to branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - branchId
 *             properties:
 *               userId:
 *                 type: integer
 *               branchId:
 *                 type: integer
 *               isDefault:
 *                 type: boolean
 *               canAccessAllBranches:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User assigned to branch successfully
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
 *                   $ref: '#/components/schemas/UserBranch'
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Admin or above required
 */
router.post('/assign-user', requireAdminOrAbove, branchController.assignUserToBranch);

/**
 * @swagger
 * /api/branches/remove-user/{userId}/{branchId}:
 *   delete:
 *     summary: Remove user from branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: User removed from branch successfully
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
 *         description: User-Branch assignment not found
 *       403:
 *         description: Forbidden - Admin or above required
 */
router.delete('/remove-user/:userId/:branchId', requireAdminOrAbove, branchController.removeUserFromBranch);

/**
 * @swagger
 * /api/branches/{id}/users:
 *   get:
 *     summary: Get all users in a branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch users retrieved successfully
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
 *                       userName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       UserBranch:
 *                         $ref: '#/components/schemas/UserBranch'
 *       404:
 *         description: Branch not found
 *       403:
 *         description: Forbidden - Admin or above required
 */
router.get('/:id/users', requireAdminOrAbove, branchController.getBranchUsers);

/**
 * @swagger
 * /api/branches/user/{id}/branches:
 *   get:
 *     summary: Get all branches for a user
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User branches retrieved successfully
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/Branch'
 *                       - type: object
 *                         properties:
 *                           UserBranch:
 *                             $ref: '#/components/schemas/UserBranch'
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin or above required
 */
router.get('/user/:id/branches', requireAdminOrAbove, branchController.getUserBranches);

/**
 * @swagger
 * /api/branches/user/{userId}/access:
 *   put:
 *     summary: Update user branch access permissions
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *             required:
 *               - branchId
 *             properties:
 *               branchId:
 *                 type: integer
 *               isDefault:
 *                 type: boolean
 *               canAccessAllBranches:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User branch access updated successfully
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
 *                   $ref: '#/components/schemas/UserBranch'
 *       404:
 *         description: User-Branch assignment not found
 *       403:
 *         description: Forbidden - Admin or above required
 */
router.put('/user/:userId/access', requireAdminOrAbove, branchController.updateUserBranchAccess);

module.exports = router;
