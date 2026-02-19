const { Inventory, Product, GRN, Suppliers, ProductAuditLog, Location } = require('../../models');
const db = require('../../models');
const inventoryService = require('../../services/inventory/inventoryService');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { requireBranchId, addBranchFilter, addBranchId, getBranchFilterForQuery } = require('../../utils/branchHelper');

// Get all inventory (ledger entries)
exports.getAllInventory = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const filters = req.query;
        const pagination = { limit: parseInt(limit), offset: (page - 1) * limit };
        const branchConfig = { branchId: req.branchId, branchAccess: req.user?.branchAccess };

        const { count, rows } = await inventoryService.getAllInventory(filters, pagination, branchConfig);

        res.json({ success: true, data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        next(error);
    }
};

// Get inventory by ID
exports.getInventoryById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const where = { id };
        addBranchFilter(where, req);

        const inventory = await Inventory.findOne({ 
            where, 
            include: [
                { model: Product, as: 'product' }, 
                { model: GRN, as: 'grn' }, 
                { model: Suppliers, as: 'supplier' },
                { model: Location, as: 'location', attributes: ['id', 'name', 'code', 'type'] }
            ] 
        });
        if (!inventory) return res.status(404).json({ success: false, message: 'Inventory record not found' });

        res.json({ success: true, data: inventory });
    } catch (error) {
        next(error);
    }
};

// Get current stock balance by product
exports.getStockByProduct = async (req, res, next) => {
    try {
        const { productId } = req.params;

        const branchConfig = { branchId: req.branchId, branchAccess: req.user?.branchAccess };

        const product = await Product.findByPk(productId, { attributes: ['id', 'name', 'productCode', 'minStockLevel', 'costPrice'] });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        
        // Calculate current balance by summing all quantity movements
        const inventoryWhere = { productId };
        addBranchFilter(inventoryWhere, req);
        
        const inventoryRecords = await Inventory.findAll({
            where: inventoryWhere,
            attributes: ['quantity', 'batchNumber', 'expiryDate', 'referenceType', 'createdAt', 'sellingPrice', 'mrp', 'unitCost'],
            order: [['createdAt', 'ASC']]
        });
        
        // Get the latest inventory record for pricing info
        const latestInventoryRecord = inventoryRecords.length > 0 
            ? inventoryRecords[inventoryRecords.length - 1] 
            : null;
        
        // Calculate total balance
        const totalBalance = inventoryRecords.reduce((sum, record) => sum + record.quantity, 0);
        
        // Group by batch if batch numbers exist
        const batchMap = {};
        inventoryRecords.forEach(record => {
            const batch = record.batchNumber || 'NO_BATCH';
            if (!batchMap[batch]) {
                batchMap[batch] = {
                    batchNumber: record.batchNumber,
                    expiryDate: record.expiryDate,
                    quantity: 0
                };
            }
            batchMap[batch].quantity += record.quantity;
        });
        
        const batches = Object.values(batchMap).filter(b => b.quantity > 0);
        
        res.json({
            success: true,
            data: {
                product: product,
                currentBalance: totalBalance,
                latestSellingPrice: latestInventoryRecord?.sellingPrice || 0,
                latestMrp: latestInventoryRecord?.mrp || 0,
                latestUnitCost: latestInventoryRecord?.unitCost || product.costPrice || 0,
                batches: batches,
                movements: inventoryRecords.length,
                lowStock: product.minStockLevel && totalBalance < product.minStockLevel,
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get low stock items
exports.getLowStock = async (req, res, next) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        
        const productWhere = {
                minStockLevel: { [Op.ne]: null },
                isActive: true
        };
        addBranchFilter(productWhere, req);

        // Get all products with minStockLevel set
        const products = await Product.findAll({
            where: productWhere,
            attributes: ['id', 'name', 'productCode', 'minStockLevel']
        });
        
        const lowStockItems = [];
        
        // Calculate balance for each product
        for (const product of products) {
            const inventoryWhere = { productId: product.id };
            addBranchFilter(inventoryWhere, req);

            const inventoryRecords = await Inventory.findAll({
                where: inventoryWhere,
                attributes: ['quantity']
            });
            
            const currentBalance = inventoryRecords.reduce((sum, record) => sum + record.quantity, 0);
            
            if (currentBalance < product.minStockLevel) {
                lowStockItems.push({
                    product: product,
                    currentBalance: currentBalance,
                    minStockLevel: product.minStockLevel,
                    deficit: product.minStockLevel - currentBalance
                });
            }
        }
        
        // Sort by deficit (most critical first)
        lowStockItems.sort((a, b) => b.deficit - a.deficit);
        
        // Paginate results
        const offset = (page - 1) * limit;
        const paginatedItems = lowStockItems.slice(offset, offset + parseInt(limit));
        
        res.json({
            success: true,
            data: paginatedItems,
            total: lowStockItems.length,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        next(error);
    }
};

// Get expiring soon items
exports.getExpiringSoon = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, days = 30 } = req.query;
        const offset = (page - 1) * limit;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(days));
        
        const where = {
            expiryDate: {
                [Op.ne]: null,
                [Op.lte]: expiryDate
            }
        };
        addBranchFilter(where, req);

        const { count, rows } = await Inventory.findAndCountAll({
            where,
            include: [
                { model: Product, as: 'product', attributes: ['id', 'name', 'productCode'] },
                { model: Location, as: 'location', attributes: ['id', 'name', 'code', 'type'] }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['expiryDate', 'ASC']]
        });
        
        res.json({
            success: true,
            data: rows,
            total: count,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        next(error);
    }
};

// Adjust stock (creates new ledger entry)
exports.adjustStock = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const params = {
            productId: req.body.productId,
            quantity: req.body.quantity,
            transactionType: req.body.transactionType,
            referenceType: req.body.referenceType,
            batchNumber: req.body.batchNumber,
            expiryDate: req.body.expiryDate,
            unitCost: req.body.unitCost,
            sellingPrice: req.body.sellingPrice,
            mrp: req.body.mrp,
            grnId: req.body.grnId,
            supplierId: req.body.supplierId,
            remarks: req.body.remarks,
            performedBy: req.user?.userName || req.user?.phone || 'System',
            userId: req.user?.id,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || '',
            branchId: req.branchId
        };

        const result = await inventoryService.adjustStock(params, transaction);

        await transaction.commit();
        res.json({ success: true, message: 'Stock adjusted successfully - new ledger entry created', data: result.inventoryEntry });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Delete inventory record
exports.deleteInventory = async (req, res, next) => {
    const transaction = await require('../../models').sequelize.transaction();
    
    try {
        const { id } = req.params;
        
        const where = { id };
        addBranchFilter(where, req);
        
        const inventory = await Inventory.findOne({
            where,
            include: [{ model: Product, as: 'product' }],
            transaction
        });
        
        if (!inventory) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Inventory record not found'
            });
        }
        
        // Create ProductAuditLog before deletion
        await ProductAuditLog.create({
            productId: inventory.productId,
            action: 'inventory_deleted',
            field: 'inventory_record',
            oldValue: JSON.stringify({
                id: inventory.id,
                quantity: inventory.quantity,
                referenceType: inventory.referenceType,
                batchNumber: inventory.batchNumber
            }),
            newValue: 'deleted',
            changedBy: req.user?.id,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || '',
            notes: `Inventory movement entry #${id} deleted. Product: ${inventory.product?.name || inventory.productId}. Quantity was: ${inventory.quantity}`
        }, { transaction });
        
        await inventory.destroy({ transaction });
        
        await transaction.commit();
        
        res.json({
            success: true,
            message: 'Inventory record deleted successfully'
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Update inventory location
exports.updateLocation = async (req, res, next) => {
    const transaction = await require('../../models').sequelize.transaction();
    try {
        const { id } = req.params;
        const { locationId } = req.body;

        const where = { id };
        addBranchFilter(where, req);

        const inventory = await Inventory.findOne({
            where,
            include: [{ model: Location, as: 'location' }],
            transaction
        });

        if (!inventory) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Inventory record not found' });
        }

        // Verify new location exists
        const location = await Location.findByPk(locationId, { transaction });
        if (!location) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Target location not found' });
        }

        const oldLocationName = inventory.location ? inventory.location.name : 'Unassigned';

        // Update location
        await inventory.update({ locationId }, { transaction });

        // Create audit log
        await ProductAuditLog.create({
            productId: inventory.productId,
            action: 'location_updated',
            field: 'location',
            oldValue: oldLocationName,
            newValue: location.name,
            changedBy: req.user?.id,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || '',
            notes: `Inventory #${id} moved from ${oldLocationName} to ${location.name}`,
            branchId: req.branchId
        }, { transaction });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Inventory location updated successfully',
            data: {
                ...inventory.toJSON(),
                location
            }
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Relocate inventory (move quantity)
exports.relocateInventory = async (req, res, next) => {
    const transaction = await require('../../models').sequelize.transaction();
    try {
        const { id } = req.params;
        const { targetLocationId, quantity } = req.body;
        const moveQty = parseFloat(quantity);

        if (isNaN(moveQty) || moveQty <= 0) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Invalid quantity' });
        }

        const where = { id };
        addBranchFilter(where, req);

        // 1. Find source inventory
        const sourceInventory = await Inventory.findOne({
            where,
            include: [
                { model: Location, as: 'location' },
                { model: Product, as: 'product' }
            ],
            transaction
        });

        if (!sourceInventory) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Source inventory record not found' });
        }

        if (sourceInventory.quantity < moveQty) {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient quantity. Available: ${sourceInventory.quantity}, Requested: ${moveQty}` 
            });
        }

        // 2. Verify target location
        const targetLocation = await Location.findByPk(targetLocationId, { transaction });
        if (!targetLocation) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Target location not found' });
        }

        if (sourceInventory.locationId === parseInt(targetLocationId)) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Source and target locations are the same' });
        }

        // 3. Update source quantity
        const remainingQty = sourceInventory.quantity - moveQty;
        
        let targetInventory;

        // Check if there's already an inventory record for this product/batch at the target location
        // to properly merge if desired, OR just create a new record. 
        // For best traceability, we usually create a new record unless we want to merge piles.
        // Let's create a new record but if one exists with EXACT same properties (exp, batch, etc), merge it?
        // To keep it simple and traceable, creating a new entry is safer for "ledger" style.
        // BUT, if we keep creating new entries, we might have 10 entries for same product in same bin.
        // Let's try to find an existing match to merge.
        
        const existingMatch = await Inventory.findOne({
            where: {
                productId: sourceInventory.productId,
                locationId: targetLocationId,
                branchId: sourceInventory.branchId,
                batchNumber: sourceInventory.batchNumber || null,
                expiryDate: sourceInventory.expiryDate || null,
                unitCost: sourceInventory.unitCost,
                mrp: sourceInventory.mrp,
                sellingPrice: sourceInventory.sellingPrice
            },
            transaction
        });

        if (existingMatch) {
            // Merge
            await existingMatch.update({
                quantity: parseFloat(existingMatch.quantity) + moveQty
            }, { transaction });
            targetInventory = existingMatch;
        } else {
            // Create new
            targetInventory = await Inventory.create({
                productId: sourceInventory.productId,
                grnId: sourceInventory.grnId,
                supplierId: sourceInventory.supplierId,
                supplierName: sourceInventory.supplierName,
                supplierPhone: sourceInventory.supplierPhone,
                referenceType: 'transfer',
                batchNumber: sourceInventory.batchNumber,
                expiryDate: sourceInventory.expiryDate,
                quantity: moveQty,
                unitCost: sourceInventory.unitCost,
                sellingPrice: sourceInventory.sellingPrice,
                mrp: sourceInventory.mrp,
                performedBy: req.user?.userName || 'System',
                remarks: `Relocated from ${sourceInventory.location?.name || 'Unassigned'}`,
                branchId: sourceInventory.branchId,
                locationId: targetLocationId
            }, { transaction });
        }

        // Use update for source inventory to keep history, or destroy if 0?
        // Keeping 0 qty records might clutter, but good for history. 
        // Logic: if 0, maybe delete? Or keep for ledger.
        // Let's keep it but user can delete empty records if they want, or we can auto-delete.
        // Auto-delete is cleaner.
        if (remainingQty <= 0.0001) { // Float safety
             await sourceInventory.destroy({ transaction });
        } else {
             await sourceInventory.update({ quantity: remainingQty }, { transaction });
        }

        // 4. Audit Log
        await ProductAuditLog.create({
            productId: sourceInventory.productId,
            action: 'stock_relocated',
            field: 'location',
            oldValue: `${sourceInventory.location?.name || 'Unassigned'} (${moveQty})`,
            newValue: `${targetLocation.name} (${moveQty})`,
            changedBy: req.user?.id,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || '',
            notes: `Relocated ${moveQty} units from ${sourceInventory.location?.name || 'Unassigned'} to ${targetLocation.name}`,
            branchId: req.branchId
        }, { transaction });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Inventory relocated successfully',
            data: {
                source: remainingQty > 0 ? sourceInventory : null,
                target: targetInventory
            }
        });

    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};
