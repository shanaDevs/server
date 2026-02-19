const express = require('express');
const router = express.Router();
const systemSettingsController = require('../../controllers/settings/systemSettingsController');
const { body } = require('express-validator');
const { checkPermission } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: System Settings
 *   description: System configuration and settings management
 */

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get system settings
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System settings retrieved successfully
 *       404:
 *         description: Settings not found
 */
router.get('/', systemSettingsController.getSettings);

const upload = require('../../middlewares/uploadMiddleware');

// ...

/**
 * @swagger
 * /api/settings:
 *   post:
 *     summary: Create or update system settings
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - shopName
 *             properties:
 *               shopName:
 *                 type: string
 *               shopAddress:
 *                 type: string
 *               shopPhone:
 *                 type: string
 *               shopEmail:
 *                 type: string
 *               shopLogo:
 *                 type: string
 *                 format: binary
 *               taxRate:
 *                 type: number
 *                 format: decimal
 *                 description: Tax rate value (percentage or fixed amount based on taxType)
 *               taxType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *                 description: Tax calculation method
 *               taxName:
 *                 type: string
 *                 description: Display name for tax (e.g., VAT, GST, Sales Tax)
 *               currency:
 *                 type: string
 *               currencySymbol:
 *                 type: string
 *               invoicePrefix:
 *                 type: string
 *               invoiceFooter:
 *                 type: string
 *               enableTax:
 *                 type: boolean
 *                 description: Enable or disable tax calculation globally
 *               enableLoyalty:
 *                 type: boolean
 *               loyaltyPointsPerAmount:
 *                 type: number
 *               loyaltyPointValue:
 *                 type: number
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       201:
 *         description: Settings created successfully
 */
router.post('/', upload.single('shopLogo'), [
    body('shopName').trim().notEmpty().withMessage('Shop name is required'),
    body('taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100')
], systemSettingsController.upsertSettings);

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Update system settings
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               shopName:
 *                 type: string
 *               shopAddress:
 *                 type: string
 *               shopPhone:
 *                 type: string
 *               shopEmail:
 *                 type: string
 *               shopLogo:
 *                 type: string
 *                 format: binary
 *               taxRate:
 *                 type: number
 *                 format: decimal
 *               currency:
 *                 type: string
 *               currencySymbol:
 *                 type: string
 *               invoicePrefix:
 *                 type: string
 *               invoiceFooter:
 *                 type: string
 *               enableTax:
 *                 type: boolean
 *               enableLoyalty:
 *                 type: boolean
 *               loyaltyPointsPerAmount:
 *                 type: number
 *               loyaltyPointValue:
 *                 type: number
 *               notificationChannel:
 *                  type: string
 *                  enum: [EMAIL_ONLY, SMS_ONLY, EMAIL_AND_SMS]
 *               enableEmailNotifications:
 *                  type: boolean
 *               enableSMSNotifications:
 *                  type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put('/', upload.single('shopLogo'), systemSettingsController.upsertSettings);

/**
 * @swagger
 * /api/settings:
 *   delete:
 *     summary: Delete system settings
 *     tags: [System Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings deleted successfully
 *       404:
 *         description: Settings not found
 */
router.delete('/', systemSettingsController.deleteSettings);

module.exports = router;
