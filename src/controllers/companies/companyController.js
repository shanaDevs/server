const companyService = require('../../services/companies/companyService');
const { validationResult } = require('express-validator');
const { requireBranchId, addBranchFilter, addBranchId } = require('../../utils/branchHelper');
const db = require('../../models');
const { Companies } = db;

// Get all companies with filters
exports.getAllCompanies = async (req, res, next) => {
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

        const { count, rows } = await companyService.getAllCompanies(filters, pagination, branchConfig);
        
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

// Get company by ID
exports.getCompanyById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };
        
        const company = await companyService.getCompanyById(id, branchConfig);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }
        
        res.json({
            success: true,
            data: company
        });
    } catch (error) {
        next(error);
    }
};

// Create new company
exports.createCompany = async (req, res, next) => {
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
        
        const { name, address, contactEmail, phoneNumber, taxid } = req.body;
        
        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };
        
        // Check if email already exists
        if (contactEmail) {
            const emailExists = await companyService.checkEmailExists(contactEmail, branchConfig);
            
            if (emailExists) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Company with this email already exists'
                });
            }
        }
        
        const companyData = {
            name,
            address,
            contactEmail,
            phoneNumber,
            taxid
        };
        addBranchId(companyData, req);

        const company = await companyService.createCompany(companyData, transaction);
        
        await transaction.commit();
        
        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            data: company
        });
    } catch (error) {
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

// Update company
exports.updateCompany = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const { id } = req.params;
        const { name, address, contactEmail, phoneNumber, taxid } = req.body;
        
        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };
        
        const updateData = { name, address, contactEmail, phoneNumber, taxid };
        
        const company = await companyService.updateCompany(id, updateData, branchConfig, transaction);
        
        if (!company) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }
        
        await transaction.commit();
        
        res.json({
            success: true,
            message: 'Company updated successfully',
            data: company
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

// Delete company (soft delete)
exports.deleteCompany = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        
        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };
        
        const result = await companyService.deleteCompany(id, branchConfig, transaction);
        
        if (!result) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }
        
        await transaction.commit();
        
        res.json({
            success: true,
            message: 'Company deleted successfully'
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Toggle company status (enable/disable)
exports.toggleCompanyStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const where = { id, idDeleted: false };
        addBranchFilter(where, req);
        
        const company = await Companies.findOne({
            where
        });
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }
        
        await company.update({
            isdisabled: !company.isdisabled
        });
        
        res.json({
            success: true,
            message: `Company ${company.isdisabled ? 'disabled' : 'enabled'} successfully`,
            data: company
        });
    } catch (error) {
        next(error);
    }
};