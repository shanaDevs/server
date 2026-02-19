const db = require('../../models');
const { Inventory, Product, InventoryLedger, ProductAuditLog, Location } = db;
const { Op } = require('sequelize');

class InventoryService {
    async getAllInventory(filters, pagination, branchConfig) {
        const { search, productId, lowStock } = filters;
        const { limit, offset } = pagination;
        const { branchId, branchAccess } = branchConfig;

        const where = {};
        
        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        if (productId) where.productId = productId;

        const productWhere = {};
        if (search) {
            productWhere[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { productCode: { [Op.like]: `%${search}%` } }
            ];
        }

        return await Inventory.findAndCountAll({
            where,
            include: [
                {
                    model: Product,
                    as: 'product',
                    where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
                    attributes: ['id', 'name', 'productCode', 'unitOfMeasure', 'minStockLevel']
                },
                {
                    model: Location,
                    as: 'location',
                    attributes: ['id', 'name']
                }
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });
    }

    async getInventoryByProduct(productId, branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const where = { productId, quantity: { [Op.gt]: 0 } };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await Inventory.findAll({
            where,
            include: [{ model: Product, as: 'product' }],
            order: [
                [db.sequelize.literal('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END'), 'ASC'],
                ['expiryDate', 'ASC'],
                ['createdAt', 'ASC']
            ]
        });
    }

    async getStockBalance(productId, branchId) {
        const where = { productId };
        if (branchId) {
            where.branchId = branchId;
        }

        const inventoryRecords = await Inventory.findAll({
            where,
            attributes: ['quantity']
        });

        return inventoryRecords.reduce((sum, record) => sum + record.quantity, 0);
    }

    async getLowStockProducts(branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const where = { isActive: true };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const products = await Product.findAll({ where });
        const lowStockProducts = [];

        for (const product of products) {
            const balance = await this.getStockBalance(product.id, branchId || branchAccess.branches[0]);
            if (balance <= product.reorderLevel) {
                lowStockProducts.push({
                    ...product.toJSON(),
                    currentBalance: balance,
                    reorderLevel: product.reorderLevel
                });
            }
        }

        return lowStockProducts;
    }

    async adjustStock(params, transaction) {
        const {
            productId, quantity, transactionType, referenceType,
            batchNumber, expiryDate, unitCost, sellingPrice, mrp,
            supplierId, supplierName, supplierPhone, grnId,
            remarks, userId, userName, ipAddress, userAgent, branchId, locationId
        } = params;

        // Calculate current balance
        const currentBalance = await this.getStockBalance(productId, branchId);

        // Calculate quantity change
        let quantityChange = parseInt(quantity);
        if (transactionType === 'out') {
            quantityChange = -quantityChange;
        }

        const newBalance = currentBalance + quantityChange;

        if (newBalance < 0) {
            throw new Error(`Insufficient stock. Current: ${currentBalance}, Requested: ${Math.abs(quantityChange)}`);
        }

        // Get product
        const product = await Product.findByPk(productId, { transaction });
        if (!product) {
            throw new Error('Product not found');
        }

        // Get last inventory record for defaults
        const lastRecordWhere = { productId };
        if (branchId) {
            lastRecordWhere.branchId = branchId;
        }

        const lastInventory = await Inventory.findOne({
            where: lastRecordWhere,
            order: [['createdAt', 'DESC']],
            transaction
        });

        // Validate expiry date
        let validExpiryDate = null;
        if (expiryDate && expiryDate !== 'null' && expiryDate !== 'undefined') {
            const parsedDate = new Date(expiryDate);
            if (!isNaN(parsedDate.getTime())) {
                validExpiryDate = expiryDate;
            }
        } else if (lastInventory?.expiryDate) {
            validExpiryDate = lastInventory.expiryDate;
        }

        // For direct adjustments, copy all data from the last inventory record
        // Only override with provided values if explicitly set
        const lastInventoryData = lastInventory ? lastInventory.toJSON() : {};

        // Create inventory entry - copy all fields from last record, override with provided values
        const inventoryEntry = await Inventory.create({
            productId,
            grnId: grnId && grnId !== 0 ? grnId : (lastInventoryData.grnId || null),
            supplierId: supplierId && supplierId !== 0 ? supplierId : (lastInventoryData.supplierId || null),
            supplierName: supplierName !== undefined ? supplierName : (lastInventoryData.supplierName || null),
            supplierPhone: supplierPhone !== undefined ? supplierPhone : (lastInventoryData.supplierPhone || null),
            referenceType: referenceType || 'adjustment',
            batchNumber: batchNumber !== undefined ? batchNumber : (lastInventoryData.batchNumber || null),
            expiryDate: validExpiryDate,
            quantity: quantityChange,
            unitCost: unitCost !== undefined ? unitCost : (lastInventoryData.unitCost || product.costPrice || 0),
            sellingPrice: sellingPrice !== undefined ? sellingPrice : (lastInventoryData.sellingPrice || product.sellingPrice || 0),
            mrp: mrp !== undefined ? mrp : (lastInventoryData.mrp || product.mrp || 0),
            performedBy: userName || 'System',
            remarks: remarks || `Direct adjustment`,
            branchId: branchId !== undefined ? branchId : (lastInventoryData.branchId || null),
            locationId: locationId !== undefined ? locationId : (lastInventoryData.locationId || null)
        }, { transaction });

        // Create audit log
        await ProductAuditLog.create({
            productId,
            action: 'stock_adjusted',
            field: 'stock_balance',
            oldValue: currentBalance.toString(),
            newValue: newBalance.toString(),
            changedBy: userId,
            branchId,
            ipAddress,
            userAgent,
            remarks
        }, { transaction });

        return { inventoryEntry, newBalance };
    }

    async getExpiringProducts(days, branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const where = {
            expiryDate: { [Op.lte]: futureDate, [Op.gte]: new Date() },
            quantity: { [Op.gt]: 0 }
        };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await Inventory.findAll({
            where,
            include: [{ model: Product, as: 'product' }],
            order: [['expiryDate', 'ASC']]
        });
    }
}

module.exports = new InventoryService();
