const db = require('../../models');
const { Product, ProductAuditLog, Inventory, Brand, Category, SaleItem, Promotion } = db;
const { Op, Sequelize } = require('sequelize');
const { generateBarcode, generateBulkBarcodes, generateBarcodeBase64, generateQRCode } = require('../../utils/barcodeGenerator');

class ProductService {
    async getAllProducts(filters, pagination, branchConfig) {
        const { category, isActive } = filters;
        const { limit, offset } = pagination;
        const { branchId, branchAccess } = branchConfig;

        const where = {};
        if (branchId) where.branchId = branchId;
        else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        if (category) where.category = category;
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const queryOptions = {
            where,
            order: [['createdAt', 'DESC']]
        };
        
        // Only apply limit/offset if they are provided (not null)
        if (limit !== null) queryOptions.limit = limit;
        if (offset !== null) queryOptions.offset = offset;

        return await Product.findAndCountAll(queryOptions);
    }

    async getProductInventoryDetails(products, branchConfig) {
        // Fetch active promotions once to avoid N+1
        const now = new Date();
        const activePromotions = await Promotion.findAll({
            where: {
                isActive: true,
                isDeleted: false,
                startDate: { [Op.lte]: now },
                endDate: { [Op.gte]: now }
            }
        });

        return await Promise.all(products.map(async (product) => {
            const productData = product.toJSON ? product.toJSON() : product;

            const inventoryWhere = { 
                productId: product.id,
                quantity: { [Op.gt]: 0 }
            };
            
            const { branchId, branchAccess } = branchConfig;
            if (branchId) inventoryWhere.branchId = branchId;
            else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
                inventoryWhere.branchId = branchAccess.branches;
            }
            
            const batches = await Inventory.findAll({
                where: inventoryWhere,
                attributes: ['batchNumber', 'expiryDate', 'quantity', 'sellingPrice', 'mrp', 'unitCost'],
                order: [
                    [db.sequelize.literal('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END'), 'ASC'],
                    ['expiryDate', 'ASC'],
                    ['createdAt', 'ASC']
                ]
            });

            const currentBalance = batches.reduce((sum, batch) => sum + parseFloat(batch.quantity), 0);
            const latestInventory = batches.length > 0 ? batches[batches.length - 1] : null;

            const batchMap = {};
            batches.forEach(batch => {
                const batchNum = batch.batchNumber || 'NO-BATCH';
                if (!batchMap[batchNum]) {
                    batchMap[batchNum] = {
                        batchNumber: batch.batchNumber,
                        expiryDate: batch.expiryDate,
                        quantity: 0
                    };
                }
                batchMap[batchNum].quantity += parseFloat(batch.quantity);
            });

            // Match promotions for this product
            const applicablePromotions = activePromotions.filter(p => 
                (p.productId === product.id) || 
                (product.productCode && p.productCode === product.productCode)
            ).map(p => ({
                id: p.id,
                code: p.couponCode || p.promoCode,
                title: p.title,
                type: p.promotionType,
                buyQuantity: p.buyQuantity,
                getQuantity: p.getQuantity,
                discountValue: p.discountValue,
                discountPercentage: p.discountPercentage
            }));

            return {
                ...productData,
                currentBalance: currentBalance,
                latestSellingPrice: latestInventory ? parseFloat(latestInventory.sellingPrice).toFixed(2) : "0.00",
                latestMrp: latestInventory ? parseFloat(latestInventory.mrp).toFixed(2) : "0.00",
                latestUnitCost: latestInventory ? parseFloat(latestInventory.unitCost).toFixed(2) : "0.00",
                batches: Object.values(batchMap),
                applicablePromotions // New Data
            };
        }));
    }

    async getProductById(id) {
        return await Product.findByPk(id);
    }

    async createProduct(data, transaction) {
        const product = await Product.create(data, { transaction });
        
        await ProductAuditLog.create({
            productId: product.id,
            action: 'created',
            field: 'all',
            oldValue: null,
            newValue: JSON.stringify(product),
            changedBy: data.performedBy,
            branchId: data.branchId,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            remarks: 'Product created'
        }, { transaction });

        return product;
    }

    async updateProduct(id, data, userContext, transaction) {
        const product = await Product.findByPk(id, { transaction });
        if (!product) return null;

        const oldValues = { ...product.toJSON() };
        await product.update(data, { transaction });

        // Audit Logs
        const fieldsToTrack = ['name', 'sku', 'description', 'category', 'costPrice', 'sellingPrice', 'reorderLevel', 'unit', 'barcode'];
        for (const field of fieldsToTrack) {
            if (data[field] !== undefined && oldValues[field] !== data[field]) {
                const action = (field === 'costPrice' || field === 'sellingPrice') ? 'price_changed' : 'updated';
                
                await ProductAuditLog.create({
                    productId: product.id,
                    action,
                    field,
                    oldValue: oldValues[field]?.toString() || '',
                    newValue: data[field]?.toString() || '',
                    changedBy: userContext.userId,
                    branchId: userContext.branchId || product.branchId,
                    ipAddress: userContext.ipAddress,
                    userAgent: userContext.userAgent,
                    remarks: `Field ${field} updated`
                }, { transaction });
            }
        }

        return product;
    }

    async deleteProduct(id, userContext, transaction) {
        const product = await Product.findByPk(id, { transaction });
        if (!product) return null;

        await product.update({ isActive: false }, { transaction });

        await ProductAuditLog.create({
            productId: product.id,
            action: 'deactivated',
            field: 'isActive',
            oldValue: 'true',
            newValue: 'false',
            changedBy: userContext.userId,
            branchId: userContext.branchId || product.branchId,
            ipAddress: userContext.ipAddress,
            userAgent: userContext.userAgent,
            remarks: 'Product soft deleted'
        }, { transaction });

        return true;
    }

    async generateBarcode(type, value, options) {
        if (options.format === 'base64') {
            return await generateBarcodeBase64(value, options);
        } else {
            return await generateBarcode(value, options);
        }
    }

    async generateBulkBarcodes(items, options) {
        return await generateBulkBarcodes(items, options);
    }
    
    async generateQRCode(data, options, format) {
        const qrData = JSON.stringify(data);
        if (format === 'base64') {
             return await generateQRCode(qrData, options);
        }
        return await generateQRCode(qrData, options);
    }

    async filterProducts(filters = {}, branchConfig = {}) {
    const { categoryId, brandId, batchId, isActive } = filters;
    const { branchId, branchAccess } = branchConfig;

    const where = {};
    const include = [];

    /* 🔹 Branch filter */
    if (branchId) {
        where.branchId = branchId;
    } else if (
        branchAccess &&
        !branchAccess.canAccessAllBranches &&
        branchAccess.branches?.length > 0
    ) {
        where.branchId = branchAccess.branches;
    }

    /* 🔹 Category filter */
    if (categoryId) {
        where.categoryId = categoryId;
    }

    /* 🔹 Brand filter */
    if (brandId) {
        where.brandId = brandId;
    }

    /* 🔹 Active filter */
    if (isActive !== undefined && isActive !== null) {
        where.isActive = isActive === true || isActive === 'true';
    }

    /* 🔹 Batch filter (Inventory) */
    if (batchId) {
        include.push({
            model: Inventory,
            as: 'inventories',
            where: {
                batchId: batchId
            },
            required: true
        });
    } else {
        include.push({
            model: Inventory,
            as: 'inventories',
            required: false
        });
    }

    return await Product.findAndCountAll({
        where,
        include,
        distinct: true, // ⭐ avoid duplicate count
        order: [['createdAt', 'DESC']]
    });
}

    /**
     * Get products with inventory details filtered by categoryId and brandId
     * Joins Product and Inventory tables
     * Returns products with all their inventory batches
     */


async getProductsWithInventory(filters, pagination, branchConfig) {
    const { categoryId, brandId, isActive, batchNumber } = filters;
    const { limit, offset } = pagination;
    const { branchId, branchAccess } = branchConfig;

    /* =============================
       PRODUCT WHERE
    ============================== */
    const productWhere = {};

    if (branchId) {
        productWhere.branchId = branchId;
    } else if (
        branchAccess &&
        !branchAccess.canAccessAllBranches &&
        branchAccess.branches?.length > 0
    ) {
        productWhere.branchId = branchAccess.branches;
    }

    if (categoryId) productWhere.categoryId = categoryId;
    if (brandId) productWhere.brandId = brandId;

    if (isActive !== undefined) {
        productWhere.isActive = isActive === 'true' || isActive === true;
    }

    /* =============================
       INVENTORY WHERE
    ============================== */
    const inventoryWhere = {};

    if (branchId) {
        inventoryWhere.branchId = branchId;
    } else if (
        branchAccess &&
        !branchAccess.canAccessAllBranches &&
        branchAccess.branches?.length > 0
    ) {
        inventoryWhere.branchId = branchAccess.branches;
    }

    if (batchNumber) {
        inventoryWhere.batchNumber = { [Op.like]: `%${batchNumber}%` };
    }

    /* =============================
       PRODUCT LIST
    ============================== */
    const result = await Product.findAndCountAll({
        where: productWhere,
        include: [
            {
                model: Inventory,
                as: 'inventories',
                where: inventoryWhere,
                required: false
            },
            {
                model: Brand,
                as: 'brand',
                attributes: ['id', 'name']
            },
            {
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
            }
        ],
        limit,
        offset,
        distinct: true,
        order: [['createdAt', 'DESC']]
    });

    /* =============================
       FETCH ACTIVE PROMOTIONS (BOGO & BUY_X_GET_Y)
    ============================== */
    const now = new Date();
    const activePromotions = await Promotion.findAll({
        where: {
            isActive: true,
            isDeleted: false,
            promotionType: {
                [Op.in]: ['BOGO', 'BUY_X_GET_Y']
            },
            startDate: { [Op.lte]: now },
            endDate: { [Op.gte]: now }
        },
        attributes: [
            'id',
            'couponCode',
            'promoCode',
            'title',
            'promotionType',
            'productId',
            'productCode',
            'buyQuantity',
            'getQuantity',
            'rewardProductId',
            'rewardProductCode',
            'discountValue',
            'discountPercentage'
        ],
        // ✅ NEW: Include free product details for buy_x_get_y
        include: [
            {
                model: Product,
                as: 'rewardProduct',
                attributes: ['id', 'name', 'productCode', 'unitOfMeasure'],
                required: false
            }
        ]
    });

    /* =============================
       ATTACH PROMOTIONS TO PRODUCTS
    ============================== */
    const productsWithPromotions = result.rows.map(product => {
        const productData = product.toJSON();
        
        // Filter promotions that apply to this product
        productData.applicablePromotions = activePromotions
            .filter(promo => {
                // Match by productId or productCode
                return (
                    (promo.productId && promo.productId === product.id) ||
                    (promo.productCode && product.productCode && promo.productCode === product.productCode)
                );
            })
            .map(promo => {
                const promoData = promo.toJSON ? promo.toJSON() : promo;
                
                return {
                    id: promoData.id,
                    code: promoData.couponCode || promoData.promoCode,
                    type: promoData.promotionType,
                    title: promoData.title,
                    buyQuantity: promoData.buyQuantity || 1,
                    getQuantity: promoData.getQuantity || 1,
                    // For buy_x_get_y promotions - include free product details
                    freeProductId: promoData.rewardProductId || null,
                    freeProductName: promoData.rewardProduct?.name || null,
                    freeProductCode: promoData.rewardProduct?.productCode || promoData.rewardProductCode || null,
                    freeProductUnit: promoData.rewardProduct?.unitOfMeasure || null,
                    // Legacy fields for backward compatibility
                    rewardProductId: promoData.rewardProductId,
                    rewardProductCode: promoData.rewardProductCode,
                    discountValue: promoData.discountValue,
                    discountPercentage: promoData.discountPercentage
                };
            });
        
        return productData;
    });

    /* =============================
       MOST SELLING BRAND
    ============================== */
    const saleWhere = {};

    if (branchId) {
        saleWhere.branchId = branchId;
    } else if (
        branchAccess &&
        !branchAccess.canAccessAllBranches &&
        branchAccess.branches?.length > 0
    ) {
        saleWhere.branchId = branchAccess.branches;
    }

    const topBrand = await SaleItem.findOne({
        attributes: [
            [Sequelize.col('product.brand_id'), 'brandId'],
            [Sequelize.fn('SUM', Sequelize.col('SaleItem.quantity')), 'totalSold']
        ],
        include: [
            {
                model: Product,
                as: 'product',
                attributes: []
            }
        ],
        where: saleWhere,
        group: ['product.brand_id'],
        order: [[Sequelize.literal('totalSold'), 'DESC']],
        raw: true
    });

    let mostSelling = null;

    if (topBrand) {
        const brand = await Brand.findByPk(topBrand.brandId, {
            attributes: ['id', 'name']
        });

        const products = await SaleItem.findAll({
            attributes: [
                'productId',
                [Sequelize.fn('SUM', Sequelize.col('SaleItem.quantity')), 'totalSold']
            ],
            include: [
                {
                    model: Product,
                    as: 'product',
                    where: { brandId: topBrand.brandId },
                    attributes: ['id', 'name', 'productCode']
                }
            ],
            where: saleWhere,
            group: ['productId', 'product.id'],
            order: [[Sequelize.literal('totalSold'), 'DESC']],
            limit: 5,
            raw: true,
            nest: true
        });

        mostSelling = {
            brand: {
                id: brand.id,
                name: brand.name,
                totalSold: parseFloat(topBrand.totalSold)
            },
            products
        };
    }

    return {
        count: result.count,
        rows: productsWithPromotions,  // 🔹 UPDATED: Now includes promotions
        mostSelling        // 🔹 ADDED DATA
    };
}



}

module.exports = new ProductService();
