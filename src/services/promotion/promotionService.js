const db = require('../../models');
const { Promotion, Product } = db;
const { Op } = require('sequelize');

class PromotionService {
    /**
     * Get all promotions with filters and pagination
     */
    async getAllPromotions(filters, pagination, branchConfig) {
        const { isActive, productId, productCode, promotionType, couponCode, startDate, endDate } = filters;
        const { limit, offset } = pagination;

        const where = { isDeleted: false };

        // Apply filters
        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }
        
        if (productId) {
            where.productId = productId;
        }

        if (productCode) {
            where.productCode = productCode;
        }

        if (promotionType) {
            where.promotionType = promotionType;
        }

        if (couponCode) {
            where.couponCode = couponCode;
        }

        // Date range filter
        if (startDate && endDate) {
            where[Op.or] = [
                {
                    startDate: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                {
                    endDate: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                {
                    [Op.and]: [
                        { startDate: { [Op.lte]: startDate } },
                        { endDate: { [Op.gte]: endDate } }
                    ]
                }
            ];
        }

        return await Promotion.findAndCountAll({
            where,
            limit,
            offset,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'productCode', 'costPrice'],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']]
        });
    }

    /**
     * Get promotion by ID
     */
    async getPromotionById(id) {
        return await Promotion.findOne({
            where: { id, isDeleted: false },
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'productCode', 'costPrice']
                }
            ]
        });
    }

    /**
     * Create a new promotion
     */
    async createPromotion(data, transaction) {
        // Validate dates
        if (new Date(data.startDate) >= new Date(data.endDate)) {
            throw new Error('End date must be after start date');
        }

        // Validate promotion type
        const validTypes = ['PRODUCT', 'BILL', 'BOGO', 'BUY_X_GET_Y'];
        if (!validTypes.includes(data.promotionType)) {
            throw new Error(`Invalid promotion type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate based on promotion type
        if (data.promotionType === 'PRODUCT') {
            // For product promotions, need either productId or productCode
            if (!data.productId && !data.productCode) {
                throw new Error('Product ID or Product Code is required for product promotions');
            }

            // If productCode is provided, find the product
            if (data.productCode) {
                const product = await Product.findOne({
                    where: { productCode: data.productCode }
                });
                if (!product) {
                    throw new Error(`Product with code ${data.productCode} not found`);
                }
                data.productId = product.id;
            } else if (data.productId) {
                const product = await Product.findByPk(data.productId);
                if (!product) {
                    throw new Error('Product not found');
                }
                data.productCode = product.productCode;
            }

            // Validate discount for product promotions
            if (!data.discountPercentage && !data.discountValue) {
                throw new Error('Either discount percentage or discount value is required for product promotions');
            }
        } 
        else if (data.promotionType === 'BILL') {
            // For bill promotions, productId and productCode should be null
            data.productId = null;
            data.productCode = null;

            // Validate discount
            if (!data.discountPercentage && !data.discountValue) {
                throw new Error('Either discount percentage or discount value is required for bill promotions');
            }

            // Minimum purchase amount is recommended for bill promotions
            if (!data.minimumPurchaseAmount) {
                console.warn('Warning: Bill promotion without minimum purchase amount');
            }
        }
        else if (data.promotionType === 'BOGO') {
            // Buy One Get One - need product info
            if (!data.productId && !data.productCode) {
                throw new Error('Product ID or Product Code is required for BOGO promotions');
            }

            // If productCode is provided, find the product
            if (data.productCode) {
                const product = await Product.findOne({
                    where: { productCode: data.productCode }
                });
                if (!product) {
                    throw new Error(`Product with code ${data.productCode} not found`);
                }
                data.productId = product.id;
            }

            // Set default quantities if not provided
            data.buyQuantity = data.buyQuantity || 1;
            data.getQuantity = data.getQuantity || 1;

            // For BOGO, reward product is the same as buy product
            data.rewardProductId = data.productId;
            data.rewardProductCode = data.productCode;
        }
        else if (data.promotionType === 'BUY_X_GET_Y') {
            // Buy X Get Y - need both buy and reward products
            if (!data.productId && !data.productCode) {
                throw new Error('Product ID or Product Code is required for BUY_X_GET_Y promotions');
            }

            if (!data.rewardProductId && !data.rewardProductCode) {
                throw new Error('Reward Product ID or Code is required for BUY_X_GET_Y promotions');
            }

            // Validate buy product
            if (data.productCode) {
                const product = await Product.findOne({
                    where: { productCode: data.productCode }
                });
                if (!product) {
                    throw new Error(`Product with code ${data.productCode} not found`);
                }
                data.productId = product.id;
            }

            // Validate reward product
            if (data.rewardProductCode) {
                const rewardProduct = await Product.findOne({
                    where: { productCode: data.rewardProductCode }
                });
                if (!rewardProduct) {
                    throw new Error(`Reward product with code ${data.rewardProductCode} not found`);
                }
                data.rewardProductId = rewardProduct.id;
            }

            // Validate quantities
            if (!data.buyQuantity || data.buyQuantity < 1) {
                throw new Error('Buy quantity must be at least 1 for BUY_X_GET_Y promotions');
            }
            if (!data.getQuantity || data.getQuantity < 1) {
                throw new Error('Get quantity must be at least 1 for BUY_X_GET_Y promotions');
            }
        }

        // Validate discount values
        if (data.discountPercentage && (data.discountPercentage < 0 || data.discountPercentage > 100)) {
            throw new Error('Discount percentage must be between 0 and 100');
        }

        if (data.discountValue && data.discountValue < 0) {
            throw new Error('Discount value must be positive');
        }

        // Validate coupon code uniqueness
        if (data.couponCode) {
            const existingCoupon = await Promotion.findOne({
                where: {
                    couponCode: data.couponCode,
                    isDeleted: false
                }
            });
            if (existingCoupon) {
                throw new Error('Coupon code already exists');
            }
            
            // Sync promoCode with couponCode for backward compatibility
            if (!data.promoCode) {
                data.promoCode = data.couponCode;
            }
        }
        
        // If promoCode is provided but not couponCode, sync them
        if (data.promoCode && !data.couponCode) {
            data.couponCode = data.promoCode;
        }

        // Check for overlapping promotions (only for product-specific promotions)
        if (data.promotionType === 'PRODUCT' && data.productId) {
            const overlapping = await Promotion.findOne({
                where: {
                    productId: data.productId,
                    promotionType: 'PRODUCT',
                    isDeleted: false,
                    isActive: true,
                    [Op.or]: [
                        {
                            startDate: {
                                [Op.between]: [data.startDate, data.endDate]
                            }
                        },
                        {
                            endDate: {
                                [Op.between]: [data.startDate, data.endDate]
                            }
                        },
                        {
                            [Op.and]: [
                                { startDate: { [Op.lte]: data.startDate } },
                                { endDate: { [Op.gte]: data.endDate } }
                            ]
                        }
                    ]
                }
            });

            if (overlapping) {
                throw new Error('An active promotion already exists for this product in the specified date range');
            }
        }

        // Initialize usage count
        data.usageCount = 0;

        return await Promotion.create(data, { transaction });
    }

    /**
     * Update promotion
     */
    async updatePromotion(id, data, transaction) {
        const promotion = await Promotion.findOne({
            where: { id, isDeleted: false }
        });

        if (!promotion) {
            throw new Error('Promotion not found');
        }

        // Validate dates if provided
        const startDate = data.startDate || promotion.startDate;
        const endDate = data.endDate || promotion.endDate;

        if (new Date(startDate) >= new Date(endDate)) {
            throw new Error('End date must be after start date');
        }

        // Validate discount if provided
        if (data.discountPercentage !== undefined) {
            if (data.discountPercentage < 0 || data.discountPercentage > 100) {
                throw new Error('Discount percentage must be between 0 and 100');
            }
        }

        if (data.discountValue !== undefined && data.discountValue < 0) {
            throw new Error('Discount value must be positive');
        }
        
        // Sync promoCode and couponCode for backward compatibility
        if (data.couponCode && !data.promoCode) {
            data.promoCode = data.couponCode;
        }
        if (data.promoCode && !data.couponCode) {
            data.couponCode = data.promoCode;
        }

        // Check for overlapping promotions if dates or product changed
        if (data.productId || data.startDate || data.endDate) {
            const productId = data.productId || promotion.productId;
            
            const overlapping = await Promotion.findOne({
                where: {
                    id: { [Op.ne]: id },
                    productId: productId,
                    isDeleted: false,
                    isActive: true,
                    [Op.or]: [
                        {
                            startDate: {
                                [Op.between]: [startDate, endDate]
                            }
                        },
                        {
                            endDate: {
                                [Op.between]: [startDate, endDate]
                            }
                        },
                        {
                            [Op.and]: [
                                { startDate: { [Op.lte]: startDate } },
                                { endDate: { [Op.gte]: endDate } }
                            ]
                        }
                    ]
                }
            });

            if (overlapping) {
                throw new Error('An active promotion already exists for this product in the specified date range');
            }
        }

        await promotion.update(data, { transaction });
        return promotion;
    }

    /**
     * Delete promotion (soft delete)
     */
    async deletePromotion(id, transaction) {
        const promotion = await Promotion.findOne({
            where: { id, isDeleted: false }
        });

        if (!promotion) {
            throw new Error('Promotion not found');
        }

        await promotion.update({ 
            isDeleted: true,
            isActive: false 
        }, { transaction });

        return promotion;
    }

    /**
     * Get active promotions for a specific product
     */
    async getActivePromotionsForProduct(productId) {
        const now = new Date();
        
        return await Promotion.findAll({
            where: {
                productId,
                isActive: true,
                isDeleted: false,
                startDate: { [Op.lte]: now },
                endDate: { [Op.gte]: now }
            },
            order: [['discountPercentage', 'DESC'], ['discountValue', 'DESC']]
        });
    }

    /**
     * Calculate discounted price for a product
     */
    async calculateDiscountedPrice(productId, originalPrice) {
        const activePromotions = await this.getActivePromotionsForProduct(productId);
        
        if (activePromotions.length === 0) {
            return {
                originalPrice,
                discountedPrice: originalPrice,
                discount: 0,
                promotion: null
            };
        }

        // Use the first (best) promotion
        const promotion = activePromotions[0];
        let discountedPrice = originalPrice;
        let discount = 0;

        if (promotion.discountPercentage) {
            discount = (originalPrice * promotion.discountPercentage) / 100;
            discountedPrice = originalPrice - discount;
        } else if (promotion.discountValue) {
            discount = Math.min(promotion.discountValue, originalPrice);
            discountedPrice = originalPrice - discount;
        }

        return {
            originalPrice,
            discountedPrice: Math.max(0, discountedPrice),
            discount,
            promotion: {
                id: promotion.id,
                title: promotion.title,
                promoCode: promotion.promoCode
            }
        };
    }

    /**
     * Validate promo code or coupon code
     */
    async validatePromoCode(code, productId = null) {
        const now = new Date();
        
        const where = {
            [Op.or]: [
                { promoCode: code },
                { couponCode: code }
            ],
            isActive: true,
            isDeleted: false,
            startDate: { [Op.lte]: now },
            endDate: { [Op.gte]: now }
        };

        if (productId) {
            where[Op.or] = [
                { productId: productId },
                { promotionType: 'BILL' }  // Bill promotions work for any product
            ];
        }

        const promotion = await Promotion.findOne({
            where,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'productCode', 'costPrice'],
                    required: false
                }
            ]
        });

        if (!promotion) {
            return {
                valid: false,
                message: 'Invalid or expired promo/coupon code'
            };
        }

        // Check usage limits
        if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
            return {
                valid: false,
                message: 'This promotion has reached its usage limit'
            };
        }

        return {
            valid: true,
            promotion
        };
    }

    /**
     * Validate coupon code with customer usage tracking
     */
    async validateCouponCode(couponCode, customerId = null) {
        const now = new Date();
        
        const promotion = await Promotion.findOne({
            where: {
                couponCode,
                isActive: true,
                isDeleted: false,
                startDate: { [Op.lte]: now },
                endDate: { [Op.gte]: now }
            },
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'productCode', 'costPrice'],
                    required: false
                }
            ]
        });

        if (!promotion) {
            return {
                valid: false,
                message: 'Invalid or expired coupon code'
            };
        }

        // Check overall usage limit
        if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
            return {
                valid: false,
                message: 'This coupon has reached its usage limit'
            };
        }

        // Check per-customer usage limit if customerId provided
        if (customerId && promotion.perCustomerLimit) {
            const CustomerPromotionUsage = db.CustomerPromotionUsage;
            if (CustomerPromotionUsage) {
                const usage = await CustomerPromotionUsage.findOne({
                    where: {
                        customerId,
                        promotionId: promotion.id
                    }
                });

                if (usage && usage.usageCount >= promotion.perCustomerLimit) {
                    return {
                        valid: false,
                        message: 'You have already used this coupon the maximum number of times'
                    };
                }
            }
        }

        return {
            valid: true,
            promotion
        };
    }

    /**
     * Apply promotion to a product or bill
     */
    async applyPromotion(promotionId, items, billTotal = 0, customerId = null, transaction = null) {
        const promotion = await Promotion.findByPk(promotionId);

        if (!promotion || !promotion.isActive || promotion.isDeleted) {
            throw new Error('Promotion not found or inactive');
        }

        const now = new Date();
        if (now < promotion.startDate || now > promotion.endDate) {
            throw new Error('Promotion is not currently active');
        }

        let result = {
            promotionId: promotion.id,
            promotionType: promotion.promotionType,
            discount: 0,
            freeItems: [],
            message: ''
        };

        switch (promotion.promotionType) {
            case 'PRODUCT':
                result = await this._applyProductPromotion(promotion, items);
                break;
            case 'BILL':
                result = await this._applyBillPromotion(promotion, billTotal);
                break;
            case 'BOGO':
                result = await this._applyBOGOPromotion(promotion, items);
                break;
            case 'BUY_X_GET_Y':
                result = await this._applyBuyXGetYPromotion(promotion, items);
                break;
        }

        // Update usage count
        if (transaction) {
            await promotion.increment('usageCount', { transaction });

            // Track customer usage
            if (customerId && db.CustomerPromotionUsage) {
                const CustomerPromotionUsage = db.CustomerPromotionUsage;
                const [usage, created] = await CustomerPromotionUsage.findOrCreate({
                    where: {
                        customerId,
                        promotionId: promotion.id
                    },
                    defaults: {
                        usageCount: 1
                    },
                    transaction
                });

                if (!created) {
                    await usage.increment('usageCount', { transaction });
                }
            }
        }

        return result;
    }

    /**
     * Apply product-specific promotion
     */
    async _applyProductPromotion(promotion, items) {
        const applicableItems = items.filter(item => 
            item.productId === promotion.productId || 
            item.productCode === promotion.productCode
        );

        if (applicableItems.length === 0) {
            return {
                promotionId: promotion.id,
                promotionType: 'PRODUCT',
                discount: 0,
                message: 'Product not in cart'
            };
        }

        let totalDiscount = 0;
        applicableItems.forEach(item => {
            const itemTotal = item.price * item.quantity;
            let itemDiscount = 0;

            if (promotion.discountPercentage) {
                itemDiscount = (itemTotal * promotion.discountPercentage) / 100;
            } else if (promotion.discountValue) {
                itemDiscount = promotion.discountValue * item.quantity;
            }

            // Apply maximum discount cap if specified
            if (promotion.maximumDiscountAmount) {
                itemDiscount = Math.min(itemDiscount, promotion.maximumDiscountAmount);
            }

            totalDiscount += itemDiscount;
        });

        return {
            promotionId: promotion.id,
            promotionType: 'PRODUCT',
            discount: totalDiscount,
            freeItems: [],
            message: `Discount applied on ${applicableItems.length} item(s)`
        };
    }

    /**
     * Apply bill-level promotion
     */
    async _applyBillPromotion(promotion, billTotal) {
        // Check minimum purchase amount
        if (promotion.minimumPurchaseAmount && billTotal < promotion.minimumPurchaseAmount) {
            return {
                promotionId: promotion.id,
                promotionType: 'BILL',
                discount: 0,
                message: `Minimum purchase of ${promotion.minimumPurchaseAmount} required`
            };
        }

        let discount = 0;

        if (promotion.discountPercentage) {
            discount = (billTotal * promotion.discountPercentage) / 100;
        } else if (promotion.discountValue) {
            discount = promotion.discountValue;
        }

        // Apply maximum discount cap if specified
        if (promotion.maximumDiscountAmount) {
            discount = Math.min(discount, promotion.maximumDiscountAmount);
        }

        // Discount cannot exceed bill total
        discount = Math.min(discount, billTotal);

        return {
            promotionId: promotion.id,
            promotionType: 'BILL',
            discount,
            freeItems: [],
            message: 'Bill discount applied'
        };
    }

    /**
     * Apply Buy One Get One (BOGO) promotion
     */
    async _applyBOGOPromotion(promotion, items) {
        const applicableItems = items.filter(item => 
            item.productId === promotion.productId || 
            item.productCode === promotion.productCode
        );

        if (applicableItems.length === 0) {
            return {
                promotionId: promotion.id,
                promotionType: 'BOGO',
                discount: 0,
                freeItems: [],
                message: 'Product not in cart'
            };
        }

        const buyQty = promotion.buyQuantity || 1;
        const getQty = promotion.getQuantity || 1;
        
        let totalQuantity = 0;
        applicableItems.forEach(item => {
            totalQuantity += item.quantity;
        });

        // Calculate how many free items customer gets based on what they BOUGHT (paid for)
        // Logic: Total Items in Cart = Paid + Free
        // We need to figure out how many 'sets' of (Buy + Get) fit, or if we are just qualifying for new ones.
        
        // Simple "Buy X Get Y" logic often implies: For every X bought, get Y free.
        // If I have X items, I qualify for Y free.
        // If I have X+Y items, Y of them are free.
        
        // Current logic: totalQuantity / buyQty. 
        // Example: Buy 1 Get 1. totalQuantity = 1. sets = 1. free = 1.
        // Case A: Cart has 1. We owe them 1. Discount = 0 (payer pays for 1). Return freeItem = 1.
        // Case B: Cart has 2. We owe them 1. Discount = 1 item cost. (payer pays for 1).
        
        // We need to differentiate items that are "candidates for being free".
        // In BOGO, they are the same product.
        
        const setsQualified = Math.floor(totalQuantity / buyQty);
        let potentialFreeQty = setsQualified * getQty;
        
        // How many items in cart CAN be made free?
        // We must ensure we leave 'setsQualified * buyQty' as paid items.
        // Actually, simple formula: For every (Buy+Get) group, Get is free.
        // BUT user asked for "Reach requirement -> Auto add free product".
        // So if I have 1 (Buy=1), I get 1.
        
        // Let's assume the cart contains mixed "Paid" and "To Be Free" items. 
        // It's hard to distinguish without a flag. 
        // Simplest approach: Discount = 0 initially.
        // Send 'freeItems' to frontend. Frontend adds them.
        // Re-validate. Now totalQuantity includes the free ones.
        
        // Wait, if I have 1, I qualify for 1. 
        // If I add the free one, I have 2. 
        // new total = 2. setsQualified(2/1) = 2. free = 2.
        // Then I get 2 more? infinite loop.
        
        // CORRECT LOGIC:
        // Sets are calculated based on PAIRS (Buy+Get) if in cart, or just Buy if adding.
        // Actually, "Buy 1 Get 1" usually means "Buy 1, Receive 1". Total 2 transaction.
        // So for every (Buy+Get) items, Get is free.
        // Group Size = BuyQty + GetQty.
        // Groups = floor(total / GroupSize).
        // Remainder = total % GroupSize.
        // If Remainder >= BuyQty, we qualify for (Remainder - BuyQty) FREE items... wait no.
        // If Remainder >= BuyQty, we qualify for 'GetQty' free items, but they might not be in cart yet.
        
        const groupSize = buyQty + getQty;
        const fullyQualifiedGroups = Math.floor(totalQuantity / groupSize);
        const remainder = totalQuantity % groupSize;
        
        let itemsToDiscount = fullyQualifiedGroups * getQty;
        let itemsToAdd = 0;
        
        if (remainder >= buyQty) {
            // We have enough to trigger a NEW free set, but the free items (or some of them) might be missing
            // The number of items we HAVE in this remainder chunk is 'remainder'.
            // The number we NEED to complete the group is 'groupSize'.
            // The number MISSING is groupSize - remainder.
            // These missing items are the ones we should ADD.
            const missingFreeItems = groupSize - remainder;
             itemsToAdd = missingFreeItems;
             
             // The items present in the remainder (remainder - buyQty) are also free if they exist?
             // No, remainder includes the BuyQty. 
             // Example: Buy 1 Get 1. Group=2.
             // Cart=1. Groups=0. Remainder=1. 1 >= 1. Missing = 2-1 = 1. Add 1.
             // Cart=3. Groups=1 (2 items). Remainder=1. 1 >= 1. Missing = 2-1 = 1. Add 1. (Total will be 4: 2 paid, 2 free)
        }
        
        // Calculate Discount Value
        // The discount applies to 'itemsToDiscount' items that are ALREADY in the cart.
        // Note: We might also support partial fulfillment (e.g. user added 1 of the 2 free items manually), 
        // but 'itemsToAdd' handles filling the gap.
        
        // Price per item (assuming uniform price for BOGO same-product)
        const productPrice = applicableItems[0].price; // Use mapped 'price' which comes from unitPrice
        const discount = itemsToDiscount * productPrice;

        return {
            promotionId: promotion.id,
            promotionType: 'BOGO',
            discount, // Only discount items that complete the "Buy+Get" cycle present in cart
            freeItems: itemsToAdd > 0 ? [{
                productId: promotion.productId,
                productCode: promotion.productCode,
                productName: promotion.productName || 'Free Item',
                quantity: itemsToAdd,
                price: 0,
                isFree: true // Flag for frontend
            }] : [],
            message: itemsToAdd > 0 
                ? `Buy ${buyQty} Get ${getQty} - Adding ${itemsToAdd} FREE item(s)`
                : `Buy ${buyQty} Get ${getQty} Applied`
        };
    }

    /**
     * Apply Buy X Get Y promotion (cross-product)
     */
    async _applyBuyXGetYPromotion(promotion, items) {
        const buyItems = items.filter(item => 
            item.productId === promotion.productId || 
            item.productCode === promotion.productCode
        );

        if (buyItems.length === 0) {
            return {
                promotionId: promotion.id,
                promotionType: 'BUY_X_GET_Y',
                discount: 0,
                freeItems: [],
                message: 'Required product not in cart'
            };
        }

        const buyQty = promotion.buyQuantity || 1;
        const getQty = promotion.getQuantity || 1;
        
        let totalBuyQuantity = 0;
        buyItems.forEach(item => {
            totalBuyQuantity += item.quantity;
        });

        // Calculate how many free reward items customer gets
        const setsQualified = Math.floor(totalBuyQuantity / buyQty);
        const freeQuantity = setsQualified * getQty;

        if (freeQuantity === 0) {
            return {
                promotionId: promotion.id,
                promotionType: 'BUY_X_GET_Y',
                discount: 0,
                freeItems: [],
                message: `Buy ${buyQty} to get ${getQty} reward item(s) free`
            };
        }

        // Get reward product details
        const rewardProduct = await Product.findOne({
            where: {
                [Op.or]: [
                    { id: promotion.rewardProductId },
                    { productCode: promotion.rewardProductCode }
                ]
            }
        });

        if (!rewardProduct) {
            throw new Error('Reward product not found');
        }

        // Check how many reward items are ALREADY in the cart
        const cartRewardItems = items.filter(item => 
            item.productId === rewardProduct.id || 
            item.productCode === rewardProduct.productCode
        );
        
        let existingRewardQty = 0;
        cartRewardItems.forEach(i => existingRewardQty += i.quantity);
        
        // Determine what to add and what to discount
        // We are entitled to 'freeQuantity' items.
        
        let itemsToDiscount = Math.min(existingRewardQty, freeQuantity);
        let itemsToAdd = freeQuantity - itemsToDiscount;

        // Calculate discount (value of free reward items currently in cart)
        // Use sellingPrice because that is what the customer WOULD have paid
        const rewardPrice = Number(rewardProduct.sellingPrice || 0);
        const discount = itemsToDiscount * rewardPrice;

        return {
            promotionId: promotion.id,
            promotionType: 'BUY_X_GET_Y',
            discount,
            freeItems: itemsToAdd > 0 ? [{
                productId: rewardProduct.id,
                productCode: rewardProduct.productCode,
                productName: rewardProduct.name,
                quantity: itemsToAdd,
                price: 0,
                isFree: true
            }] : [],
            message: itemsToAdd > 0 
                ? `Buy ${buyQty} Get ${getQty} - Adding ${itemsToAdd} FREE ${rewardProduct.name}`
                : `Buy ${buyQty} Get ${getQty} Applied`
        };
    }

    /**
     * Get all applicable promotions for cart items
     */
    async getApplicablePromotions(items, billTotal, customerId = null) {
        const now = new Date();
        
        // Get all active promotions
        const promotions = await Promotion.findAll({
            where: {
                isActive: true,
                isDeleted: false,
                startDate: { [Op.lte]: now },
                endDate: { [Op.gte]: now }
            },
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'productCode', 'costPrice'],
                    required: false
                }
            ]
        });

        const applicablePromotions = [];

        for (const promotion of promotions) {
            // Check usage limits
            if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
                continue;
            }

            // Check customer usage
            if (customerId && promotion.perCustomerLimit && db.CustomerPromotionUsage) {
                const usage = await db.CustomerPromotionUsage.findOne({
                    where: {
                        customerId,
                        promotionId: promotion.id
                    }
                });

                if (usage && usage.usageCount >= promotion.perCustomerLimit) {
                    continue;
                }
            }

            // Check if promotion applies
            let applies = false;
            switch (promotion.promotionType) {
                case 'PRODUCT':
                case 'BOGO':
                case 'BUY_X_GET_Y':
                    applies = items.some(item => 
                        item.productId === promotion.productId || 
                        item.productCode === promotion.productCode
                    );
                    break;
                case 'BILL':
                    applies = !promotion.minimumPurchaseAmount || 
                              billTotal >= promotion.minimumPurchaseAmount;
                    break;
            }

            if (applies) {
                applicablePromotions.push({
                    id: promotion.id,
                    title: promotion.title,
                    description: promotion.description,
                    promotionType: promotion.promotionType,
                    couponCode: promotion.couponCode,
                    discountPercentage: promotion.discountPercentage,
                    discountValue: promotion.discountValue
                });
            }
        }

        return applicablePromotions;
    }
}

module.exports = new PromotionService();

