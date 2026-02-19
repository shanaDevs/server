const express = require('express');
const router = express.Router();
const counterController = require('../../controllers/sales/counterController');
const { verifyToken, checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Sales Counters
 *   description: Counter management and daily sessions
 */

router.use(verifyToken);

/**
 * @swagger
 * /api/counters:
 *   get:
 *     summary: List all counters for the branch
 *     tags: [Sales Counters]
 *   post:
 *     summary: Register a new counter
 *     tags: [Sales Counters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - counterName
 *             properties:
 *               counterName:
 *                 type: string
 *               counterCode:
 *                 type: string
 */
router.get('/', counterController.getCounters);
router.post('/', counterController.createCounter);

/**
 * @swagger
 * /api/counters/active-session:
 *   get:
 *     summary: Check if the current user has an open session
 *     tags: [Sales Counters]
 */
router.get('/active-session', counterController.checkActiveSession);

/**
 * @swagger
 * /api/counters/open:
 *   post:
 *     summary: Open a counter session (Day Start)
 *     tags: [Sales Counters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - counterId
 *               - openingBalance
 *             properties:
 *               counterId:
 *                 type: integer
 *               openingBalance:
 *                 type: number
 *               notes:
 *                 type: string
 */
router.post('/open', counterController.openSession);

/**
 * @swagger
 * /api/counters/close/{id}:
 *   put:
 *     summary: Close a counter session (Shift End)
 *     tags: [Sales Counters]
 */
router.put('/close/:id', counterController.closeSession);

module.exports = router;
