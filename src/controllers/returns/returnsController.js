const db = require('../../models');
const supplierReturnService = require('../../services/returns/supplierReturnService');
const customerReturnService = require('../../services/returns/customerReturnService');
const { requireBranchId, addBranchId, getBranchConfig } = require('../../utils/branchHelper');

// ==================== SUPPLIER RETURNS ====================

/**
 * Get all supplier returns
 * GET /api/returns/supplier
 */
exports.getAllSupplierReturns = async (req, res, next) => {
    try {
        const branchConfig = getBranchConfig(req);
        const filters = {
            search: req.query.search,
            status: req.query.status,
            supplierId: req.query.supplierId,
            returnReason: req.query.returnReason,
            paymentStatus: req.query.paymentStatus,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };
        const pagination = {
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0
        };

        const { count, rows } = await supplierReturnService.getAllReturns(filters, pagination, branchConfig);

        res.json({
            success: true,
            data: rows,
            total: count,
            page: Math.floor(pagination.offset / pagination.limit) + 1,
            limit: pagination.limit,
            totalPages: Math.ceil(count / pagination.limit)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get supplier return by ID
 * GET /api/returns/supplier/:id
 */
exports.getSupplierReturnById = async (req, res, next) => {
    try {
        const branchConfig = getBranchConfig(req);
        const supplierReturn = await supplierReturnService.getReturnById(req.params.id, branchConfig);

        if (!supplierReturn) {
            return res.status(404).json({ success: false, message: 'Supplier return not found' });
        }

        res.json({ success: true, data: supplierReturn });
    } catch (error) {
        next(error);
    }
};

/**
 * Create supplier return
 * POST /api/returns/supplier
 */
exports.createSupplierReturn = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const branchConfig = getBranchConfig(req);
        const data = { ...req.body };
        addBranchId(data, req);

        const supplierReturn = await supplierReturnService.createReturn(data, branchConfig, transaction, req.user);

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Supplier return created successfully',
            data: supplierReturn
        });
    } catch (error) {
        await transaction.rollback();
        if (error.message.includes('not found') || error.message.includes('Insufficient')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

/**
 * Approve supplier return
 * POST /api/returns/supplier/:id/approve
 */
exports.approveSupplierReturn = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const branchConfig = getBranchConfig(req);
        const userContext = { userId: req.user.id };

        const supplierReturn = await supplierReturnService.approveReturn(
            req.params.id, branchConfig, userContext, transaction
        );

        await transaction.commit();

        res.json({
            success: true,
            message: 'Supplier return approved successfully',
            data: supplierReturn
        });
    } catch (error) {
        await transaction.rollback();
        if (error.message.includes('not found') || error.message.includes('Only pending')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

/**
 * Record payment received from supplier for return
 * POST /api/returns/supplier/:id/payment
 */
exports.recordSupplierReturnPayment = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const branchConfig = getBranchConfig(req);
        const userContext = { userId: req.user.id };

        const result = await supplierReturnService.recordPayment(
            req.params.id, req.body, branchConfig, userContext, transaction
        );

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Payment recorded successfully',
            data: result
        });
    } catch (error) {
        await transaction.rollback();
        if (error.message.includes('not found') || error.message.includes('exceeds') || error.message.includes('already')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

/**
 * Get supplier return payment history
 * GET /api/returns/supplier/:id/payments
 */
exports.getSupplierReturnPayments = async (req, res, next) => {
    try {
        const branchConfig = getBranchConfig(req);
        const payments = await supplierReturnService.getPaymentHistory(req.params.id, branchConfig);

        res.json({ success: true, data: payments });
    } catch (error) {
        next(error);
    }
};

/**
 * Get supplier return summary
 * GET /api/returns/supplier/summary
 */
exports.getSupplierReturnSummary = async (req, res, next) => {
    try {
        const branchConfig = getBranchConfig(req);
        const filters = {
            supplierId: req.query.supplierId,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const summary = await supplierReturnService.getReturnSummary(filters, branchConfig);

        res.json({ success: true, data: summary });
    } catch (error) {
        next(error);
    }
};

/**
 * Get expired products for supplier return
 * GET /api/returns/supplier/expired-products
 */
exports.getExpiredProducts = async (req, res, next) => {
    try {
        const branchConfig = getBranchConfig(req);
        const daysBeforeExpiry = parseInt(req.query.daysBeforeExpiry) || 0;

        const products = await supplierReturnService.getExpiredProducts(branchConfig, daysBeforeExpiry);

        res.json({ success: true, data: products });
    } catch (error) {
        next(error);
    }
};

// ==================== CUSTOMER RETURNS ====================

/**
 * Get all customer returns
 * GET /api/returns/customer
 */
exports.getAllCustomerReturns = async (req, res, next) => {
    try {
        const branchConfig = getBranchConfig(req);
        const filters = {
            search: req.query.search,
            status: req.query.status,
            customerId: req.query.customerId,
            returnReason: req.query.returnReason,
            paymentStatus: req.query.paymentStatus,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };
        const pagination = {
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0
        };

        const { count, rows } = await customerReturnService.getAllReturns(filters, pagination, branchConfig);

        res.json({
            success: true,
            data: rows,
            total: count,
            page: Math.floor(pagination.offset / pagination.limit) + 1,
            limit: pagination.limit,
            totalPages: Math.ceil(count / pagination.limit)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get customer return by ID
 * GET /api/returns/customer/:id
 */
exports.getCustomerReturnById = async (req, res, next) => {
    try {
        const branchConfig = getBranchConfig(req);
        const customerReturn = await customerReturnService.getReturnById(req.params.id, branchConfig);

        if (!customerReturn) {
            return res.status(404).json({ success: false, message: 'Customer return not found' });
        }

        res.json({ success: true, data: customerReturn });
    } catch (error) {
        next(error);
    }
};

/**
 * Create customer return
 * POST /api/returns/customer
 */
exports.createCustomerReturn = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const branchConfig = getBranchConfig(req);
        const data = { ...req.body };
        addBranchId(data, req);

        const customerReturn = await customerReturnService.createReturn(data, branchConfig, transaction, req.user);

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Customer return created successfully',
            data: customerReturn
        });
    } catch (error) {
        await transaction.rollback();
        if (error.message.includes('not found') || error.message.includes('does not belong')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

/**
 * Approve customer return
 * POST /api/returns/customer/:id/approve
 */
exports.approveCustomerReturn = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const branchConfig = getBranchConfig(req);
        const userContext = { userId: req.user.id };

        const customerReturn = await customerReturnService.approveReturn(
            req.params.id, branchConfig, userContext, transaction
        );

        await transaction.commit();

        res.json({
            success: true,
            message: 'Customer return approved successfully',
            data: customerReturn
        });
    } catch (error) {
        await transaction.rollback();
        if (error.message.includes('not found') || error.message.includes('Only pending')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

/**
 * Process refund payment to customer
 * POST /api/returns/customer/:id/payment
 */
exports.processCustomerReturnPayment = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const branchConfig = getBranchConfig(req);
        const userContext = { userId: req.user.id };

        const result = await customerReturnService.processPayment(
            req.params.id, req.body, branchConfig, userContext, transaction
        );

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Refund payment processed successfully',
            data: result
        });
    } catch (error) {
        await transaction.rollback();
        if (error.message.includes('not found') || error.message.includes('exceeds') || error.message.includes('already')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

/**
 * Get customer return payment history
 * GET /api/returns/customer/:id/payments
 */
exports.getCustomerReturnPayments = async (req, res, next) => {
    try {
        const branchConfig = getBranchConfig(req);
        const payments = await customerReturnService.getPaymentHistory(req.params.id, branchConfig);

        res.json({ success: true, data: payments });
    } catch (error) {
        next(error);
    }
};

/**
 * Get customer return summary
 * GET /api/returns/customer/summary
 */
exports.getCustomerReturnSummary = async (req, res, next) => {
    try {
        const branchConfig = getBranchConfig(req);
        const filters = {
            customerId: req.query.customerId,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const summary = await customerReturnService.getReturnSummary(filters, branchConfig);

        res.json({ success: true, data: summary });
    } catch (error) {
        next(error);
    }
};

// ==================== COMBINED DASHBOARD ====================

/**
 * Get combined returns dashboard
 * GET /api/returns/dashboard
 */
exports.getReturnsDashboard = async (req, res, next) => {
    try {
        const branchConfig = getBranchConfig(req);
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const [supplierSummary, customerSummary] = await Promise.all([
            supplierReturnService.getReturnSummary(filters, branchConfig),
            customerReturnService.getReturnSummary(filters, branchConfig)
        ]);

        res.json({
            success: true,
            data: {
                supplierReturns: supplierSummary,
                customerReturns: customerSummary,
                totals: {
                    totalReturns: supplierSummary.totalReturns + customerSummary.totalReturns,
                    supplierReturnAmount: supplierSummary.totalAmount,
                    customerRefundAmount: customerSummary.totalAmount,
                    pendingFromSuppliers: supplierSummary.pendingAmount,
                    pendingToCustomers: customerSummary.pendingAmount
                }
            }
        });
    } catch (error) {
        next(error);
    }
};
