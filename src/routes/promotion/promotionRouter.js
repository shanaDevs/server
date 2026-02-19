const express = require('express');
const router = express.Router();
const promotionController = require('../../controllers/promotion/promotionController');
const { body, param } = require('express-validator');
const { verifyToken, checkPermission } = require('../../middlewares/auth');

// Validation rules for creating promotion
const createPromotionValidation = [
    body('promotionType')
        .notEmpty().withMessage('Promotion type is required')
        .isIn(['PRODUCT', 'BILL', 'BOGO', 'BUY_X_GET_Y']).withMessage('Invalid promotion type'),
    body('productId')
        .optional()
        .isInt({ min: 1 }).withMessage('Product ID must be a valid integer'),
    body('productCode')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Product code cannot exceed 50 characters'),
    body('title')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
    body('description')
        .optional()
        .trim(),
    body('discountPercentage')
        .optional()
        .isFloat({ min: 0, max: 100 }).withMessage('Discount percentage must be between 0 and 100'),
    body('discountValue')
        .optional()
        .isFloat({ min: 0 }).withMessage('Discount value must be positive'),
    body('promoCode')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Promo code cannot exceed 50 characters'),
    body('couponCode')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Coupon code cannot exceed 50 characters'),
    body('buyQuantity')
        .optional()
        .isInt({ min: 1 }).withMessage('Buy quantity must be at least 1'),
    body('getQuantity')
        .optional()
        .isInt({ min: 1 }).withMessage('Get quantity must be at least 1'),
    body('rewardProductCode')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Reward product code cannot exceed 50 characters'),
    body('rewardProductId')
        .optional()
        .isInt({ min: 1 }).withMessage('Reward product ID must be a valid integer'),
    body('minimumPurchaseAmount')
        .optional()
        .isFloat({ min: 0 }).withMessage('Minimum purchase amount must be positive'),
    body('maximumDiscountAmount')
        .optional()
        .isFloat({ min: 0 }).withMessage('Maximum discount amount must be positive'),
    body('usageLimit')
        .optional()
        .isInt({ min: 1 }).withMessage('Usage limit must be at least 1'),
    body('perCustomerLimit')
        .optional()
        .isInt({ min: 1 }).withMessage('Per customer limit must be at least 1'),
    body('startDate')
        .notEmpty().withMessage('Start date is required')
        .isISO8601().withMessage('Start date must be a valid date'),
    body('endDate')
        .notEmpty().withMessage('End date is required')
        .isISO8601().withMessage('End date must be a valid date'),
    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be a boolean')
];

// Validation rules for updating promotion
const updatePromotionValidation = [
    param('id')
        .isInt({ min: 1 }).withMessage('Promotion ID must be a valid integer'),
    body('promotionType')
        .optional()
        .isIn(['PRODUCT', 'BILL', 'BOGO', 'BUY_X_GET_Y']).withMessage('Invalid promotion type'),
    body('productId')
        .optional()
        .isInt({ min: 1 }).withMessage('Product ID must be a valid integer'),
    body('productCode')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Product code cannot exceed 50 characters'),
    body('title')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
    body('description')
        .optional()
        .trim(),
    body('discountPercentage')
        .optional()
        .isFloat({ min: 0, max: 100 }).withMessage('Discount percentage must be between 0 and 100'),
    body('discountValue')
        .optional()
        .isFloat({ min: 0 }).withMessage('Discount value must be positive'),
    body('promoCode')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Promo code cannot exceed 50 characters'),
    body('couponCode')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Coupon code cannot exceed 50 characters'),
    body('buyQuantity')
        .optional()
        .isInt({ min: 1 }).withMessage('Buy quantity must be at least 1'),
    body('getQuantity')
        .optional()
        .isInt({ min: 1 }).withMessage('Get quantity must be at least 1'),
    body('rewardProductCode')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Reward product code cannot exceed 50 characters'),
    body('rewardProductId')
        .optional()
        .isInt({ min: 1 }).withMessage('Reward product ID must be a valid integer'),
    body('minimumPurchaseAmount')
        .optional()
        .isFloat({ min: 0 }).withMessage('Minimum purchase amount must be positive'),
    body('maximumDiscountAmount')
        .optional()
        .isFloat({ min: 0 }).withMessage('Maximum discount amount must be positive'),
    body('usageLimit')
        .optional()
        .isInt({ min: 1 }).withMessage('Usage limit must be at least 1'),
    body('perCustomerLimit')
        .optional()
        .isInt({ min: 1 }).withMessage('Per customer limit must be at least 1'),
    body('startDate')
        .optional()
        .isISO8601().withMessage('Start date must be a valid date'),
    body('endDate')
        .optional()
        .isISO8601().withMessage('End date must be a valid date'),
    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be a boolean')
];

/**
 * @swagger
 * components:
 *   schemas:
 *     Promotion:
 *       type: object
 *       required:
 *         - productId
 *         - startDate
 *         - endDate
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated promotion ID
 *         productId:
 *           type: integer
 *           description: Product ID for the promotion
 *         title:
 *           type: string
 *           maxLength: 100
 *           description: Promotion title
 *         description:
 *           type: string
 *           description: Promotion description
 *         discountPercentage:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           maximum: 100
 *           description: Discount percentage (0-100)
 *         discountValue:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           description: Fixed discount value
 *         promoCode:
 *           type: string
 *           maxLength: 50
 *           description: Promotional code
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Promotion start date
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: Promotion end date
 *         isActive:
 *           type: boolean
 *           description: Whether promotion is active
 *         isDeleted:
 *           type: boolean
 *           description: Soft delete flag
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PromotionWithProduct:
 *       allOf:
 *         - $ref: '#/components/schemas/Promotion'
 *         - type: object
 *           properties:
 *             product:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 productCode:
 *                   type: string
 *                 sellingPrice:
 *                   type: number
 *                 costPrice:
 *                   type: number
 *     DiscountCalculation:
 *       type: object
 *       properties:
 *         originalPrice:
 *           type: number
 *           description: Original product price
 *         discountedPrice:
 *           type: number
 *           description: Price after discount
 *         discount:
 *           type: number
 *           description: Discount amount
 *         promotion:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             title:
 *               type: string
 *             promoCode:
 *               type: string
 */

/**
 * @swagger
 * /api/promotions:
 *   get:
 *     summary: Get all promotions
 *     description: Retrieve a paginated list of promotions with optional filters
 *     tags: [Promotions]
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
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by active status
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *         description: Filter by product ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successfully retrieved promotions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
    '/',
    verifyToken,
    checkPermission('promotion', 'read'),
    promotionController.getAllPromotions
);

/**
 * @swagger
 * /api/promotions/product/{productId}/active:
 *   get:
 *     summary: Get active promotions for a product
 *     description: Retrieve all currently active promotions for a specific product
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Successfully retrieved active promotions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
    '/product/:productId/active',
    verifyToken,
    checkPermission('promotion', 'read'),
    promotionController.getActivePromotionsForProduct
);

/**
 * @swagger
 * /api/promotions/product/{productId}/calculate:
 *   get:
 *     summary: Calculate discounted price
 *     description: Calculate the discounted price for a product based on active promotions
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *       - in: query
 *         name: originalPrice
 *         required: true
 *         schema:
 *           type: number
 *         description: Original product price
 *     responses:
 *       200:
 *         description: Successfully calculated discounted price
 *       400:
 *         description: Original price is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
    '/product/:productId/calculate',
    verifyToken,
    checkPermission('promotion', 'read'),
    promotionController.calculateDiscountedPrice
);

/**
 * @swagger
 * /api/promotions/validate/{promoCode}:
 *   get:
 *     summary: Validate promo code
 *     description: Validate a promotional code and return promotion details if valid
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: promoCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Promotional code to validate
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *         description: Optional product ID to validate promo code for specific product
 *     responses:
 *       200:
 *         description: Promo code is valid
 *       400:
 *         description: Invalid or expired promo code
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
    '/validate/:promoCode',
    verifyToken,
    checkPermission('promotion', 'read'),
    promotionController.validatePromoCode
);

/**
 * @swagger
 * /api/promotions/{id}:
 *   get:
 *     summary: Get promotion by ID
 *     description: Retrieve a single promotion by its ID
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Promotion ID
 *     responses:
 *       200:
 *         description: Successfully retrieved promotion
 *       404:
 *         description: Promotion not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
    '/:id',
    verifyToken,
    checkPermission('promotion', 'read'),
    promotionController.getPromotionById
);

/**
 * @swagger
 * /api/promotions:
 *   post:
 *     summary: Create a new promotion
 *     description: Create a new promotion for a product
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - startDate
 *               - endDate
 *             properties:
 *               productId:
 *                 type: integer
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: "Summer Sale"
 *               description:
 *                 type: string
 *                 example: "Get 20% off on this product"
 *               discountPercentage:
 *                 type: number
 *                 example: 20
 *               discountValue:
 *                 type: number
 *                 example: 50
 *               promoCode:
 *                 type: string
 *                 example: "SUMMER20"
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-01-01T00:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-12-31T23:59:59Z"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Promotion created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
    '/',
    verifyToken,
    checkPermission('promotion', 'create'),
    createPromotionValidation,
    promotionController.createPromotion
);

/**
 * @swagger
 * /api/promotions/{id}:
 *   put:
 *     summary: Update promotion
 *     description: Update an existing promotion
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Promotion ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               discountPercentage:
 *                 type: number
 *               discountValue:
 *                 type: number
 *               promoCode:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Promotion updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Promotion not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put(
    '/:id',
    verifyToken,
    checkPermission('promotion', 'update'),
    updatePromotionValidation,
    promotionController.updatePromotion
);

/**
 * @swagger
 * /api/promotions/{id}:
 *   delete:
 *     summary: Delete promotion
 *     description: Soft delete a promotion (marks as deleted and inactive)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Promotion ID
 *     responses:
 *       200:
 *         description: Promotion deleted successfully
 *       404:
 *         description: Promotion not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete(
    '/:id',
    verifyToken,
    checkPermission('promotion', 'delete'),
    promotionController.deletePromotion
);

/**
 * @swagger
 * /api/promotions/coupon/{couponCode}:
 *   get:
 *     summary: Validate coupon code
 *     description: Check if a coupon code is valid and can be used
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: couponCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon code to validate
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Customer ID for usage limit checking
 *     responses:
 *       200:
 *         description: Coupon is valid
 *       400:
 *         description: Invalid or expired coupon code
 *       500:
 *         description: Server error
 */
router.get(
    '/coupon/:couponCode',
    promotionController.validateCouponCode
);

/**
 * @swagger
 * /api/promotions/apply/{promotionId}:
 *   post:
 *     summary: Apply promotion to cart
 *     description: Calculate and apply a promotion to cart items
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: promotionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Promotion ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     productCode:
 *                       type: string
 *                     price:
 *                       type: number
 *                     quantity:
 *                       type: integer
 *               billTotal:
 *                 type: number
 *                 description: Total bill amount before discount
 *               customerId:
 *                 type: integer
 *                 description: Customer ID for usage tracking
 *     responses:
 *       200:
 *         description: Promotion applied successfully
 *       400:
 *         description: Invalid request or promotion cannot be applied
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
    '/apply/:promotionId',
    verifyToken,
    promotionController.applyPromotion
);

/**
 * @swagger
 * /api/promotions/applicable:
 *   post:
 *     summary: Get applicable promotions for cart
 *     description: Get all promotions that can be applied to the current cart
 *     tags: [Promotions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     productCode:
 *                       type: string
 *                     price:
 *                       type: number
 *                     quantity:
 *                       type: integer
 *               billTotal:
 *                 type: number
 *               customerId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: List of applicable promotions
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post(
    '/applicable',
    promotionController.getApplicablePromotions
);

/**
 * @swagger
 * /api/promotions/{id}/send-notifications:
 *   post:
 *     summary: Send promotion notifications to all customers
 *     description: Manually trigger sending promotion notifications to all active customers via email and/or SMS
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Promotion ID
 *     responses:
 *       200:
 *         description: Notification sending initiated successfully
 *       404:
 *         description: Promotion not found
 *       500:
 *         description: Server error
 */
router.post(
    '/:id/send-notifications',
    verifyToken,
    checkPermission('promotions', 'update'),
    promotionController.sendPromotionNotifications
);

module.exports = router;
