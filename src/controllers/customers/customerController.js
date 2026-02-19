const customerService = require('../../services/customers/customerService');
const { validationResult } = require('express-validator');
const db = require('../../models');
const { requireBranchId, addBranchId, getBranchId } = require('../../utils/branchHelper');

// Helper to extract branch config from request
const getBranchConfig = (req) => ({
    branchId: getBranchId(req),
    branchAccess: req.branchAccess
});

// Get all customers with filters
exports.getAllCustomers = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search, customerType, isActive } = req.query;
        const offset = (page - 1) * limit;
        
        const result = await customerService.getAllCustomers(
            { search, customerType, isActive },
            { limit: parseInt(limit), offset: parseInt(offset) },
            getBranchConfig(req)
        );
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: result.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(result.count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get single customer by ID
exports.getCustomerById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const customer = await customerService.getCustomerById(id, getBranchConfig(req));

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.json({
            success: true,
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

// Create new customer
exports.createCustomer = async (req, res, next) => {
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

        const customerData = {
            ...req.body,
            sale_platforms: req.body.sale_platforms || 'pos',
            createdBy: req.user?.id
        };
        addBranchId(customerData, req);

        const customer = await customerService.createCustomer(customerData, transaction);

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            data: customer
        });
    } catch (error) {
        await transaction.rollback();
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'Customer code already exists'
            });
        }
        
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: error.errors[0].message
            });
        }
        
        // Handle custom validation errors (duplicate phone/email)
        if (error.message && (
            error.message.includes('phone number already exists') ||
            error.message.includes('email already exists')
        )) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        next(error);
    }
};

// Update customer
exports.updateCustomer = async (req, res, next) => {
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

        // We check existence via service implicitly or explicitly? 
        // Service update returns null if not found
        const customer = await customerService.updateCustomer(id, req.body, getBranchConfig(req), transaction);

        if (!customer) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Customer updated successfully',
            data: customer
        });
    } catch (error) {
        await transaction.rollback();
        
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: error.errors[0].message
            });
        }
        
        // Handle custom validation errors (duplicate phone/email)
        if (error.message && (
            error.message.includes('phone number already exists') ||
            error.message.includes('email already exists')
        )) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        next(error);
    }
};

// Delete customer
exports.deleteCustomer = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    
    try {
        const { id } = req.params;
        const result = await customerService.deleteCustomer(id, getBranchConfig(req), transaction);

        if (!result) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Customer deleted successfully'
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Toggle customer status
exports.toggleCustomerStatus = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    
    try {
        const { id } = req.params;
        const customer = await customerService.toggleStatus(id, getBranchConfig(req), transaction);

        if (!customer) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        await transaction.commit();

        res.json({
            success: true,
            message: `Customer ${customer.isActive ? 'activated' : 'deactivated'} successfully`,
            data: customer
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Get customer purchase history
exports.getCustomerPurchaseHistory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        const result = await customerService.getPurchaseHistory(
            id,
            { limit: parseInt(limit), offset: (page - 1) * limit },
            getBranchConfig(req)
        );

        if (!result) {
             return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: result.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(result.count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get customer loyalty points
exports.getCustomerLoyaltyPoints = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        const result = await customerService.getLoyaltyDetails(
            id,
            { limit: parseInt(limit), offset: (page - 1) * limit },
            getBranchConfig(req)
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.json({
            success: true,
            data: {
                customer: {
                    id: result.customer.id,
                    customerCode: result.customer.customerCode,
                    customerName: result.customer.customerName,
                    totalPoints: result.customer.loyaltyPoints
                },
                transactions: result.transactions.rows
            },
            pagination: {
                total: result.transactions.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(result.transactions.count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Add loyalty points
exports.addLoyaltyPoints = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { id } = req.params;
        const { points } = req.body;

        if (!points || points <= 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Points must be greater than 0'
            });
        }

        const data = {
            ...req.body,
            performedBy: req.user?.id
        };
        addBranchId(data, req);

        const result = await customerService.addLoyaltyPoints(id, data, getBranchConfig(req), transaction);

        await transaction.commit();

        res.json({
            success: true,
            message: 'Loyalty points added successfully',
            data: result
        });
    } catch (error) {
        await transaction.rollback();
        if (error.message === 'Customer not found') {
            return res.status(404).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// Redeem loyalty points
exports.redeemLoyaltyPoints = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { id } = req.params;
        const { points } = req.body;

        if (!points || points <= 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Points must be greater than 0'
            });
        }

        const data = {
            ...req.body,
            performedBy: req.user?.id
        };
        addBranchId(data, req);

        const result = await customerService.redeemLoyaltyPoints(id, data, getBranchConfig(req), transaction);

        await transaction.commit();

        res.json({
            success: true,
            message: 'Loyalty points redeemed successfully',
            data: result
        });
    } catch (error) {
        await transaction.rollback();
        if (error.message === 'Customer not found') {
            return res.status(404).json({ success: false, message: error.message });
        }
        if (error.message === 'Insufficient loyalty points') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// Get customer credit history
exports.getCustomerCreditHistory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, status } = req.query;

        const result = await customerService.getCreditHistory(
            id,
            { limit: parseInt(limit), offset: (page - 1) * limit },
            { status },
            getBranchConfig(req)
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.json({
            success: true,
            data: {
                customer: {
                    id: result.customer.id,
                    customerCode: result.customer.customerCode,
                    customerName: result.customer.customerName,
                    creditLimit: result.customer.creditLimit,
                    currentCredit: result.customer.currentCredit,
                    availableCredit: parseFloat(result.customer.creditLimit) - parseFloat(result.customer.currentCredit)
                },
                creditSummary: result.creditSummary,
                transactions: result.transactions.rows
            },
            pagination: {
                total: result.transactions.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(result.transactions.count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Issue credit to customer
exports.issueCredit = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { id } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        const data = {
            ...req.body,
            performedBy: req.user?.id
        };
        addBranchId(data, req);

        const result = await customerService.issueCredit(id, data, getBranchConfig(req), transaction);

        await transaction.commit();

        res.json({
            success: true,
            message: 'Credit issued successfully',
            data: result
        });
    } catch (error) {
        await transaction.rollback();
        if (error.message === 'Customer not found') {
            return res.status(404).json({ success: false, message: error.message });
        }
        if (error.message.includes('Credit limit exceeded')) {
             return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// Receive payment from customer
exports.receivePayment = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();

    try {
        const { id } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        const data = {
            ...req.body,
            performedBy: req.user?.id
        };
        addBranchId(data, req);

        const result = await customerService.receivePayment(id, data, getBranchConfig(req), transaction);

        await transaction.commit();

        res.json({
            success: true,
            message: 'Payment received successfully',
            data: result
        });
    } catch (error) {
        await transaction.rollback();
        if (error.message === 'Customer not found') {
            return res.status(404).json({ success: false, message: error.message });
        }
        if (error.message === 'No outstanding credit to pay') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// Get customer statistics
exports.getCustomerStatistics = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await customerService.getStatistics(id, getBranchConfig(req));

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.json({
            success: true,
            data: {
                customer: result.customer,
                ...result.stats
            }
        });
    } catch (error) {
        next(error);
    }
};
