const { Role } = require('../../models');
const { validationResult } = require('express-validator');

// Get all roles
exports.getAllRoles = async (req, res, next) => {
    try {
        const roles = await Role.findAll({
            order: [['level', 'DESC']]
        });
        
        res.json({
            success: true,
            data: roles
        });
    } catch (error) {
        next(error);
    }
};

// Get role by ID
exports.getRoleById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const role = await Role.findByPk(id);
        
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }
        
        res.json({
            success: true,
            data: role
        });
    } catch (error) {
        next(error);
    }
};

// Create role
exports.createRole = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const { name, displayName, description, level, isActive } = req.body;
        
        const role = await Role.create({
            name,
            displayName,
            description,
            level,
            isActive
        });
        
        res.status(201).json({
            success: true,
            message: 'Role created successfully',
            data: role
        });
    } catch (error) {
        next(error);
    }
};

// Update role
exports.updateRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { displayName, description, level, isActive } = req.body;
        
        const role = await Role.findByPk(id);
        
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }
        
        await role.update({
            displayName,
            description,
            level,
            isActive
        });
        
        res.json({
            success: true,
            message: 'Role updated successfully',
            data: role
        });
    } catch (error) {
        next(error);
    }
};

// Delete role
exports.deleteRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const role = await Role.findByPk(id);
        
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }
        
        await role.destroy();
        
        res.json({
            success: true,
            message: 'Role deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
