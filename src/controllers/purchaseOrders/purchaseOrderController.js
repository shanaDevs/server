const { PurchaseOrder, PurchaseOrderItem, Suppliers, Product, User, GRN, GRNItem } = require('../../models');
const db = require('../../models');
const purchaseOrderService = require('../../services/purchaseOrders/purchaseOrderService');
const grnService = require('../../services/grns/grnService');

const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { generatePurchaseOrder } = require('../../utils/pdfGenerator');
const { requireBranchId, addBranchFilter, addBranchId } = require('../../utils/branchHelper');

// Get all purchase orders
exports.getAllPurchaseOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const filters = req.query;
        const pagination = { limit: parseInt(limit), offset: (page - 1) * limit };
        const branchConfig = { branchId: req.branchId, branchAccess: req.user?.branchAccess };

        const { count, rows } = await purchaseOrderService.getAllPurchaseOrders(filters, pagination, branchConfig);
        res.json({ success: true, data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        next(error);
    }
};

// Get purchase order by ID
exports.getPurchaseOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const branchConfig = { branchId: req.branchId, branchAccess: req.user?.branchAccess };

        const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(id, branchConfig);
        if (!purchaseOrder) return res.status(404).json({ success: false, message: 'Purchase order not found' });

        res.json({ success: true, data: purchaseOrder });
    } catch (error) {
        next(error);
    }
};

// Create purchase order
exports.createPurchaseOrder = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { companyId, supplierId, expectedDeliveryDate, notes, items } = req.body;
        const poData = { companyId, supplierId, expectedDeliveryDate, notes, createdBy: req.user?.id };
        addBranchId(poData, req);
        const branchConfig = { branchId: req.branchId, branchAccess: req.user?.branchAccess };

        const po = await purchaseOrderService.createPurchaseOrder(poData, items, transaction);
        await transaction.commit();

        res.status(201).json({ success: true, message: 'Purchase order created successfully', data: po });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Update purchase order
exports.updatePurchaseOrder = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { expectedDeliveryDate, status, notes, items } = req.body;
        const branchConfig = { branchId: req.branchId, branchAccess: req.user?.branchAccess };

        // Pass userId to service for GRN createdBy
        const updatedPo = await purchaseOrderService.updatePurchaseOrder(
            id,
            { expectedDeliveryDate, status, notes },
            items,
            branchConfig,
            transaction,
            req.user?.id
        );

        if (!updatedPo) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Purchase order not found' });
        }

        await transaction.commit();
        res.json({ success: true, message: 'Purchase order updated successfully', data: updatedPo });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};


// Delete purchase order
exports.deletePurchaseOrder = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const branchConfig = { branchId: req.branchId, branchAccess: req.user?.branchAccess };

        const deleted = await purchaseOrderService.deletePurchaseOrder(id, branchConfig, transaction);
        if (!deleted) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Purchase order not found' });
        }

        await transaction.commit();
        res.json({ success: true, message: 'Purchase order deleted successfully' });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Generate Purchase Order PDF
exports.generatePurchaseOrderPDF = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const purchaseOrder = await PurchaseOrder.findByPk(id, {
            include: [
                {
                    model: Suppliers,
                    as: 'supplier',
                    attributes: ['name', 'address', 'phone', 'email']
                },
                {
                    model: PurchaseOrderItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['name', 'productCode']
                        }
                    ]
                }
            ]
        });
        
        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }
        
        const pdfBuffer = await generatePurchaseOrder(purchaseOrder);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=purchase-order-${purchaseOrder.poNumber}.pdf`);
        res.send(pdfBuffer);
        
    } catch (error) {
        next(error);
    }
};

