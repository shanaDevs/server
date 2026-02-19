const { Location } = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Get all locations with pagination
exports.getAllLocations = async (req, res, next) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            type,
            isActive,
            branchId,
            parentLocationId
        } = req.query;
        
        const offset = (page - 1) * limit;
        const where = {};
        
        // Apply filters
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { code: { [Op.like]: `%${search}%` } }
            ];
        }
        
        if (type) where.type = type;
        if (isActive !== undefined) where.isActive = isActive === 'true';
        if (branchId) where.branchId = branchId;
        if (parentLocationId) where.parentLocationId = parentLocationId;
        
        // Get locations with associations
        const { count, rows: locations } = await Location.findAndCountAll({
            where,
            include: [
                {
                    model: Location,
                    as: 'parentLocation',
                    attributes: ['id', 'name', 'code', 'type']
                }
            ],
            order: [['name', 'ASC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        res.json({
            success: true,
            data: locations,
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        next(error);
    }
};

// Get location by ID
exports.getLocationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const location = await Location.findByPk(id, {
            include: [
                {
                    model: Location,
                    as: 'parentLocation',
                    attributes: ['id', 'name', 'code', 'type']
                },
                {
                    model: Location,
                    as: 'childLocations',
                    attributes: ['id', 'name', 'code', 'type', 'isActive']
                }
            ]
        });
        
        if (!location) {
            return res.status(404).json({
                success: false,
                message: 'Location not found'
            });
        }
        
        res.json({
            success: true,
            data: location
        });
    } catch (error) {
        next(error);
    }
};

// Create new location
exports.createLocation = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const location = await Location.create(req.body);
        
        // Fetch location with associations
        const createdLocation = await Location.findByPk(location.id, {
            include: [
                {
                    model: Location,
                    as: 'parentLocation',
                    attributes: ['id', 'name', 'code', 'type']
                }
            ]
        });
        
        res.status(201).json({
            success: true,
            message: 'Location created successfully',
            data: createdLocation
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'Location code already exists'
            });
        }
        next(error);
    }
};

// Update location
exports.updateLocation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const location = await Location.findByPk(id);
        
        if (!location) {
            return res.status(404).json({
                success: false,
                message: 'Location not found'
            });
        }
        
        await location.update(req.body);
        
        // Fetch updated location with associations
        const updatedLocation = await Location.findByPk(id, {
            include: [
                {
                    model: Location,
                    as: 'parentLocation',
                    attributes: ['id', 'name', 'code', 'type']
                }
            ]
        });
        
        res.json({
            success: true,
            message: 'Location updated successfully',
            data: updatedLocation
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'Location code already exists'
            });
        }
        next(error);
    }
};

// Delete location
exports.deleteLocation = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const location = await Location.findByPk(id);
        
        if (!location) {
            return res.status(404).json({
                success: false,
                message: 'Location not found'
            });
        }
        
        // Check if location has child locations
        const childCount = await Location.count({
            where: { parentLocationId: id }
        });
        
        if (childCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete location with child locations'
            });
        }
        
        await location.destroy();
        
        res.json({
            success: true,
            message: 'Location deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Get location types
exports.getLocationTypes = async (req, res, next) => {
    try {
        const types = ['warehouse', 'store', 'shelf', 'bin', 'other'];
        
        res.json({
            success: true,
            data: types
        });
    } catch (error) {
        next(error);
    }
};
