const { Brand } = require('../../models');
const { validationResult } = require('express-validator');
const { requireBranchId, addBranchFilter, addBranchId } = require('../../utils/branchHelper');
const cloudinary = require('../../config/cloudinary');


// Get all brands
exports.getAllBrands = async (req, res, next) => {
    try {
        const where = {};
        addBranchFilter(where, req);
        
        // Exclude soft-deleted brands
        where.isDeleted = false;
        
        const brands = await Brand.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: brands
        });
    } catch (error) {
        next(error);
    }
};



// Create new brand
exports.createBrand = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const brandData = { ...req.body };
        // Handle image upload (both file upload and base64)
        if (req.file && req.file.path) {
            // File uploaded via multer - use Cloudinary URL
            brandData.image = req.file.path;
        } else if (brandData.image && brandData.image.startsWith('data:')) {
            // Base64 image - upload to Cloudinary manually
            try {
                const uploadResult = await cloudinary.uploader.upload(brandData.image, {
                    folder: 'pos_system/brands',
                    public_id: `brand-new-${Date.now()}`,
                    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
                    transformation: [{ width: 500, height: 500, crop: 'limit' }]
                });
                brandData.image = uploadResult.secure_url;
            } catch (uploadError) {
                console.error('Error uploading base64 image to Cloudinary:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading image',
                    error: uploadError.message
                });
            }
        }
        addBranchId(brandData, req);
        
        const brand = await Brand.create(brandData);

        res.status(201).json({
            success: true,
            message: 'Brand created successfully',
            data: brand
        });
    } catch (error) {
        next(error);
    }
};

// Get single brand by ID
exports.getBrandById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const brand = await Brand.findByPk(id);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        res.json({
            success: true,
            data: brand
        });
    } catch (error) {
        next(error);
    }
};

// Update brand by ID
exports.updateBrand = async (req, res, next) => {
    try {
        const { id } = req.params;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const brand = await Brand.findByPk(id);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        const updateData = { ...req.body };
        // Handle image upload (both file upload and base64)
        if (req.file && req.file.path) {
            // File uploaded via multer - use Cloudinary URL
            updateData.image = req.file.path;
        } else if (updateData.image && updateData.image.startsWith('data:')) {
            // Base64 image - upload to Cloudinary manually
            try {
                const uploadResult = await cloudinary.uploader.upload(updateData.image, {
                    folder: 'pos_system/brands',
                    public_id: `brand-${id}-${Date.now()}`,
                    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
                    transformation: [{ width: 500, height: 500, crop: 'limit' }]
                });
                updateData.image = uploadResult.secure_url;
            } catch (uploadError) {
                console.error('Error uploading base64 image to Cloudinary:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading image',
                    error: uploadError.message
                });
            }
        }

        await brand.update(updateData);

        res.json({
            success: true,
            message: 'Brand updated successfully',
            data: brand
        });
    } catch (error) {
        next(error);
    }
};

// Delete brand by ID (soft delete)
exports.deleteBrand = async (req, res, next) => {
    try {
        const { id } = req.params;
        const brand = await Brand.findByPk(id);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }
        
        // Soft delete by setting isDeleted to true
        await brand.update({ isDeleted: true });
        
        res.json({
            success: true,
            message: 'Brand deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};