const categoryService = require('../../services/categories/categoryService');
const { validationResult } = require('express-validator');
const { requireBranchId, addBranchFilter, addBranchId } = require('../../utils/branchHelper');
const db = require('../../models');
const { Category } = db;
const cloudinary = require('../../config/cloudinary');

// Get all categories with pagination and filtering
exports.getAllCategories = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, is_active, parent_id } = req.query;

        const filters = {
            search,
            isActive: is_active,
            parentId: parent_id
        };

        const pagination = {
            limit: parseInt(limit),
            offset: (page - 1) * parseInt(limit)
        };

        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        const { count, rows } = await categoryService.getAllCategories(filters, pagination, branchConfig);

        res.json({
            success: true,
            data: rows,
            total: count,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error in getAllCategories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
};

// Get category by ID with subcategories
exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        const category = await categoryService.getCategoryById(id, branchConfig);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error('Error in getCategoryById:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching category',
            error: error.message
        });
    }
};

// Create new category
exports.createCategory = async (req, res) => {
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

        const { name, description, parent_id, is_active } = req.body;
        
        // Handle image upload (both file upload and base64)
        let imageUrl = null;
        if (req.file && req.file.path) {
            // File uploaded via multer - use Cloudinary URL
            imageUrl = req.file.path;
        } else if (req.body.image && req.body.image.startsWith('data:')) {
            // Base64 image - upload to Cloudinary manually
            try {
                const uploadResult = await cloudinary.uploader.upload(req.body.image, {
                    folder: 'pos_system/categories',
                    public_id: `cat-new-${Date.now()}`,
                    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
                    transformation: [{ width: 500, height: 500, crop: 'limit' }]
                });
                imageUrl = uploadResult.secure_url;
            } catch (uploadError) {
                console.error('Error uploading base64 image to Cloudinary:', uploadError);
                await transaction.rollback();
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading image',
                    error: uploadError.message
                });
            }
        } else if (req.body.image && !req.body.image.startsWith('data:')) {
            // Existing URL (for updates without new file)
            imageUrl = req.body.image;
        }

        const categoryData = {
            name,
            description,
            image: imageUrl,
            parentId: parent_id || null,
            isActive: is_active !== undefined ? is_active : true
        };
        addBranchId(categoryData, req);

        const category = await categoryService.createCategory(categoryData, transaction);

        await transaction.commit();

        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        // Fetch the created category with relations
        const createdCategory = await categoryService.getCategoryById(category.id, branchConfig);

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: createdCategory
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in createCategory:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating category',
            error: error.message,
            details: error.errors ? error.errors.map(e => e.message) : undefined
        });
    }
};

// Update category
exports.updateCategory = async (req, res) => {
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
        const { name, description, parent_id, is_active } = req.body;
        
        // Handle image upload (both file upload and base64)
        let imageUrl = undefined; // undefined means don't update image field
        if (req.file && req.file.path) {
            // File uploaded via multer - use Cloudinary URL
            imageUrl = req.file.path;
        } else if (req.body.image && req.body.image.startsWith('data:')) {
            // Base64 image - upload to Cloudinary manually
            try {
                const uploadResult = await cloudinary.uploader.upload(req.body.image, {
                    folder: 'pos_system/categories',
                    public_id: `cat-${id}-${Date.now()}`,
                    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
                    transformation: [{ width: 500, height: 500, crop: 'limit' }]
                });
                imageUrl = uploadResult.secure_url;
            } catch (uploadError) {
                console.error('Error uploading base64 image to Cloudinary:', uploadError);
                await transaction.rollback();
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading image',
                    error: uploadError.message
                });
            }
        } else if (req.body.image && !req.body.image.startsWith('data:')) {
            // Existing URL (for updates without new file)
            imageUrl = req.body.image;
        }

        const updateData = {
            name,
            description,
            image: imageUrl,
            parentId: parent_id,
            isActive: is_active
        };

        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        const updatedCategory = await categoryService.updateCategory(id, updateData, branchConfig, transaction);

        if (!updatedCategory) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Category updated successfully',
            data: updatedCategory
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in updateCategory:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating category',
            error: error.message,
            details: error.errors ? error.errors.map(e => e.message) : undefined
        });
    }
};

// Delete category (soft delete by setting is_active to false)
exports.deleteCategory = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;

        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        const deleted = await categoryService.deleteCategory(id, branchConfig, transaction);

        if (!deleted) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Category not found or has active subcategories'
            });
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in deleteCategory:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting category',
            error: error.message
        });
    }
};

// Toggle category active/inactive status
exports.toggleCategoryStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findByPk(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Toggle is_active status
        await category.update({ isActive: !category.isActive });

        res.json({
            success: true,
            message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
            data: {
                id: category.id,
                name: category.name,
                isActive: category.isActive
            }
        });
    } catch (error) {
        console.error('Error in toggleCategoryStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling category status',
            error: error.message
        });
    }
};

// Get category tree (hierarchical structure)
exports.getCategoryTree = async (req, res) => {
    try {
        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        const tree = await categoryService.getCategoryTree(branchConfig);

        res.json({
            success: true,
            data: tree
        });
    } catch (error) {
        console.error('Error in getCategoryTree:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching category tree',
            error: error.message
        });
    }
};
