const supplierService = require('../../services/suppliers/supplierService');
const { validationResult } = require('express-validator');
const { requireBranchId, addBranchFilter, addBranchId } = require('../../utils/branchHelper');
const db = require('../../models');
const { Suppliers } = db;
const { Op } = require('sequelize');

// Get all suppliers with filters
exports.getAllSuppliers = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search, isDisabled } = req.query;
        
        const filters = { search, isDisabled };
        const pagination = {
            limit: parseInt(limit),
            offset: (page - 1) * parseInt(limit)
        };
        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        const { count, rows } = await supplierService.getAllSuppliers(filters, pagination, branchConfig);
        
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

// Get supplier by ID
exports.getSupplierById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };
        
        const supplier = await supplierService.getSupplierById(id, branchConfig);
        
        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }
        
        res.json({
            success: true,
            data: supplier
        });
    } catch (error) {
        next(error);
    }
};

// Create new supplier
exports.createSupplier = async (req, res, next) => {
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
        
        const { companyId, supplierCode, name, contactPerson, email, phone, address, taxNumber, paymentTerms, isActive } = req.body;
        
        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };
        
        const supplierData = { companyId, supplierCode, name, contactPerson, email, phone, address, taxNumber, paymentTerms, isActive };
        addBranchId(supplierData, req);
        
        // Check if supplier code already exists (only if provided)
        if (supplierCode) {
            const existingCode = await supplierService.checkSupplierCodeExists(supplierCode, branchConfig);
            
            if (existingCode) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Supplier code already exists'
                });
            }
        }
        
        const supplier = await supplierService.createSupplier(supplierData, transaction);
        
        await transaction.commit();
        
        res.status(201).json({
            success: true,
            message: 'Supplier created successfully',
            data: supplier
        });
    } catch (error) {
        await transaction.rollback();
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors.map(e => ({ field: e.path, message: e.message }))
            });
        }
        next(error);
    }
};

// Update supplier
exports.updateSupplier = async (req, res, next) => {
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
        
        const { id } = req.params;
        const { companyId, supplierCode, name, contactPerson, email, phone, address, taxNumber, paymentTerms, isActive } = req.body;
        
        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };
        
        // Check if supplier code already exists for another supplier
        if (supplierCode) {
            const existingCode = await supplierService.checkSupplierCodeExists(supplierCode, branchConfig, id);
            
            if (existingCode) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Supplier code already exists'
                });
            }
        }
        
        const updateData = { companyId, supplierCode, name, contactPerson, email, phone, address, taxNumber, paymentTerms, isActive };
        
        const supplier = await supplierService.updateSupplier(id, updateData, branchConfig, transaction);
        
        if (!supplier) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }
        
        await transaction.commit();
        
        res.json({
            success: true,
            message: 'Supplier updated successfully',
            data: supplier
        });
    } catch (error) {
        await transaction.rollback();
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors.map(e => ({ field: e.path, message: e.message }))
            });
        }
        next(error);
    }
};

// Delete supplier (soft delete by setting isActive to false)
exports.deleteSupplier = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        
        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };
        
        const result = await supplierService.deleteSupplier(id, branchConfig, transaction);
        
        if (!result) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }
        
        await transaction.commit();
        
        res.json({
            success: true,
            message: 'Supplier deleted successfully'
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Toggle supplier status (enable/disable)
exports.toggleSupplierStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const supplier = await Suppliers.findByPk(id);
        
        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }
        
        await supplier.update({
            isActive: !supplier.isActive
        });
        
        res.json({
            success: true,
            message: `Supplier ${supplier.isActive ? 'enabled' : 'disabled'} successfully`,
            data: supplier
        });
    } catch (error) {
        next(error);
    }
};