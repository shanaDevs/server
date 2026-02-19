const express = require('express');
const router = express.Router();
const { verifyToken, checkPermission } = require('../../middlewares/auth');
const { body } = require('express-validator');
const RepairController = require('../../controllers/repairs/RepairController');

/**
 * @swagger
 * tags:
 *   name: Repairs
 *   description: Repair services management - Track repair services, pricing, and value-added services
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Repair:
 *       type: object
 *       required:
 *         - name
 *         - basicCharge
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated repair ID
 *         name:
 *           type: string
 *           description: Name of the repair service
 *           example: "Screen Replacement"
 *         basicCharge:
 *           type: number
 *           format: decimal
 *           description: Basic charge for the repair service
 *           example: 150.00
 *         VAS:
 *           type: object
 *           description: Value-added services (JSON object with additional service details)
 *           example: { "warranty": "90 days", "insuranceCovered": true }
 *         branchId:
 *           type: integer
 *           description: Branch ID where repair service is offered
 *           example: 1
 *         createdBy:
 *           type: integer
 *           description: User ID who created the repair service
 *           example: 5
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/repairs:
 *   post:
 *     summary: Create a new repair service
 *     description: Create a new repair service with basic charge and optional value-added services
 *     tags: [Repairs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Repair'
 *     responses:
 *       201:
 *         description: Repair service created successfully
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
 *                   example: "Repair created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Repair'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', verifyToken, RepairController.createRepair);

/**
 * @swagger
 * /api/repairs:
 *   get:
 *     summary: Get all repair services
 *     description: Retrieve a list of all repair services.
 *     tags: [Repairs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of repair services
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
 *                     $ref: '#/components/schemas/Repair'
 *       401:
 *         description: Unauthorized
 */
router.get('/', verifyToken, RepairController.getAllRepairs);

/**
 * @swagger
 * /api/repairs/{id}:
 *   get:
 *     summary: Get repair service by ID
 *     description: Retrieve detailed information about a specific repair service
 *     tags: [Repairs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Repair service ID
 *     responses:
 *       200:
 *         description: Repair service details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Repair'
 *       404:
 *         description: Repair service not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', verifyToken, RepairController.getRepairById);

/**
 * @swagger
 * /api/repairs/{id}:
 *   put:
 *     summary: Update repair service
 *     description: Update an existing repair service's details
 *     tags: [Repairs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Repair service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Repair'
 *     responses:
 *       200:
 *         description: Repair service updated successfully
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
 *                   example: "Repair updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Repair'
 *       404:
 *         description: Repair service not found
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', verifyToken, RepairController.updateRepair);

/**
 * @swagger
 * /api/repairs/{id}:
 *   delete:
 *     summary: Delete repair service
 *     description: Delete a repair service from the system
 *     tags: [Repairs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Repair service ID
 *     responses:
 *       200:
 *         description: Repair service deleted successfully
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
 *                   example: "Repair deleted successfully"
 *       404:
 *         description: Repair service not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', verifyToken, RepairController.deleteRepair);

module.exports = router;
