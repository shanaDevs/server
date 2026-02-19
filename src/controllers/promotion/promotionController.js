const promotionService = require('../../services/promotion/promotionService');
const promotionNotificationService = require('../../services/promotion/promotionNotificationService');
const { validationResult } = require('express-validator');
const db = require('../../models');

/**
 * Get all promotions
 */
exports.getAllPromotions = async (req, res, next) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            isActive, 
            productId,
            productCode,
            promotionType,
            couponCode,
            startDate,
            endDate 
        } = req.query;
        
        const offset = (page - 1) * limit;

        const filters = { 
            isActive, 
            productId, 
            productCode, 
            promotionType, 
            couponCode, 
            startDate, 
            endDate 
        };
        const pagination = { 
            limit: parseInt(limit), 
            offset: parseInt(offset) 
        };
        const branchConfig = { 
            branchId: req.branchId, 
            branchAccess: req.user?.branchAccess 
        };

        const { count, rows } = await promotionService.getAllPromotions(
            filters, 
            pagination, 
            branchConfig
        );

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get promotion by ID
 */
exports.getPromotionById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const promotion = await promotionService.getPromotionById(id);

        if (!promotion) {
            return res.status(404).json({ 
                success: false, 
                message: 'Promotion not found' 
            });
        }

        res.json({ 
            success: true, 
            data: promotion 
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new promotion
 */
exports.createPromotion = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const promotionData = {
            ...req.body,
            createdBy: req.user?.id
        };

        const promotion = await promotionService.createPromotion(
            promotionData, 
            transaction
        );
        
        await transaction.commit();

        // Send promotion notifications to all customers asynchronously
        // This runs in the background without blocking the response
        setImmediate(async () => {
            try {
                console.log(`🚀 Sending promotion notifications for: ${promotion.promotionName}`);
                const notificationResults = await promotionNotificationService.sendPromotionToAllCustomers(promotion);
                console.log(`✅ Promotion notifications sent: ${notificationResults.totalCustomersReached} customers reached`);
            } catch (notificationError) {
                console.error('❌ Error sending promotion notifications:', notificationError.message);
                // Don't fail the promotion creation if notifications fail
            }
        });

        res.status(201).json({
            success: true,
            message: 'Promotion created successfully. Notifications are being sent to all customers.',
            data: promotion
        });
    } catch (error) {
        await transaction.rollback();
        
        if (error.message.includes('already exists') || 
            error.message.includes('not found') ||
            error.message.includes('must be') ||
            error.message.includes('required')) {
            return res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
        
        next(error);
    }
};

/**
 * Update promotion
 */
exports.updatePromotion = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const updateData = {
            ...req.body,
            updatedBy: req.user?.id
        };

        const promotion = await promotionService.updatePromotion(
            id, 
            updateData, 
            transaction
        );
        
        await transaction.commit();

        res.json({
            success: true,
            message: 'Promotion updated successfully',
            data: promotion
        });
    } catch (error) {
        await transaction.rollback();
        
        if (error.message === 'Promotion not found') {
            return res.status(404).json({ 
                success: false, 
                message: error.message 
            });
        }
        
        if (error.message.includes('already exists') || 
            error.message.includes('must be')) {
            return res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
        
        next(error);
    }
};

/**
 * Delete promotion (soft delete)
 */
exports.deletePromotion = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;

        await promotionService.deletePromotion(id, transaction);
        await transaction.commit();

        res.json({
            success: true,
            message: 'Promotion deleted successfully'
        });
    } catch (error) {
        await transaction.rollback();
        
        if (error.message === 'Promotion not found') {
            return res.status(404).json({ 
                success: false, 
                message: error.message 
            });
        }
        
        next(error);
    }
};

/**
 * Get active promotions for a product
 */
exports.getActivePromotionsForProduct = async (req, res, next) => {
    try {
        const { productId } = req.params;
        
        const promotions = await promotionService.getActivePromotionsForProduct(
            productId
        );

        res.json({
            success: true,
            data: promotions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Calculate discounted price
 */
exports.calculateDiscountedPrice = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { originalPrice } = req.query;

        if (!originalPrice) {
            return res.status(400).json({
                success: false,
                message: 'Original price is required'
            });
        }

        const result = await promotionService.calculateDiscountedPrice(
            productId,
            parseFloat(originalPrice)
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Validate promo code
 */
exports.validatePromoCode = async (req, res, next) => {
    try {
        const { promoCode } = req.params;
        const { productId } = req.query;

        const result = await promotionService.validatePromoCode(
            promoCode,
            productId
        );

        if (!result.valid) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        res.json({
            success: true,
            data: result.promotion
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Validate coupon code
 */
exports.validateCouponCode = async (req, res, next) => {
    try {
        const { couponCode } = req.params;
        const { customerId } = req.query;

        const result = await promotionService.validateCouponCode(
            couponCode,
            customerId
        );

        if (!result.valid) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        res.json({
            success: true,
            message: 'Coupon is valid',
            data: result.promotion
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Apply promotion to cart
 */
exports.applyPromotion = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { promotionId } = req.params;
        const { items, billTotal, customerId } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Items array is required'
            });
        }

        const result = await promotionService.applyPromotion(
            promotionId,
            items,
            billTotal || 0,
            customerId,
            transaction
        );

        await transaction.commit();

        res.json({
            success: true,
            message: 'Promotion applied successfully',
            data: result
        });
    } catch (error) {
        await transaction.rollback();
        
        if (error.message.includes('not found') || 
            error.message.includes('inactive') ||
            error.message.includes('not currently active')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        next(error);
    }
};

/**
 * Get applicable promotions for cart
 */
exports.getApplicablePromotions = async (req, res, next) => {
    try {
        const { items, billTotal, customerId } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Items array is required'
            });
        }

        const promotions = await promotionService.getApplicablePromotions(
            items,
            billTotal || 0,
            customerId
        );

        res.json({
            success: true,
            data: promotions,
            count: promotions.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Send promotion notifications to all customers (Manual trigger)
 */
exports.sendPromotionNotifications = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Get promotion details
        const promotion = await promotionService.getPromotionById(id);

        if (!promotion) {
            return res.status(404).json({ 
                success: false, 
                message: 'Promotion not found' 
            });
        }

        // Send notifications in the background
        setImmediate(async () => {
            try {
                console.log(`🚀 Manually sending promotion notifications for: ${promotion.promotionName}`);
                const notificationResults = await promotionNotificationService.sendPromotionToAllCustomers(promotion);
                console.log(`✅ Promotion notifications sent: ${notificationResults.totalCustomersReached} customers reached`);
            } catch (notificationError) {
                console.error('❌ Error sending promotion notifications:', notificationError.message);
            }
        });

        res.json({
            success: true,
            message: 'Promotion notifications are being sent to all customers in the background.',
            data: {
                promotionId: promotion.id,
                promotionName: promotion.promotionName
            }
        });
    } catch (error) {
        next(error);
    }
};
