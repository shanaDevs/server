const db = require('../../models');
const { Category } = db;
const { Op } = require('sequelize');

class CategoryService {
    async getAllCategories(filters, pagination, branchConfig) {
        const { search, isActive, parentId } = filters;
        const { limit, offset } = pagination;
        const { branchId, branchAccess } = branchConfig;

        const where = {};

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        // Filter by search
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        // Filter by is_active
        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        // Filter by parent_id
        if (parentId !== undefined) {
            where.parentId = parentId === 'null' ? null : parentId;
        }

        return await Category.findAndCountAll({
            where,
            limit,
            offset,
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: Category,
                    as: 'parent',
                    attributes: ['id', 'name']
                }
            ]
        });
    }

    async getCategoryById(id, branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await Category.findOne({
            where,
            include: [
                {
                    model: Category,
                    as: 'parent',
                    attributes: ['id', 'name', 'description']
                },
                {
                    model: Category,
                    as: 'subcategories',
                    attributes: ['id', 'name', 'description', 'isActive']
                }
            ]
        });
    }

    async createCategory(data, transaction) {
        return await Category.create(data, { transaction });
    }

    async updateCategory(id, data, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const category = await Category.findOne({ where, transaction });
        if (!category) return null;

        await category.update(data, { transaction });
        return category;
    }

    async deleteCategory(id, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const category = await Category.findOne({ where, transaction });
        if (!category) return null;

        // Check if category has subcategories
        const subcategoriesCount = await Category.count({
            where: { parentId: id },
            transaction
        });

        if (subcategoriesCount > 0) {
            throw new Error('Cannot delete category with subcategories');
        }

        // Soft delete
        await category.update({ isActive: false }, { transaction });
        await category.update({ isDeleted: true }, { transaction });


        return true;
    }

    async getCategoryTree(branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const where = { isActive: true };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        // Fetch all active categories
        const categories = await Category.findAll({
            where,
            attributes: ['id', 'name', 'description', 'parentId', 'isActive', 'categoryCode'],
            order: [['name', 'ASC']],
            raw: true
        });

        // Build the tree
        return this.buildTree(categories);
    }

    buildTree(categories, parentId = null) {
        const branch = [];

        // Find children of current parent
        const children = categories.filter(cat => cat.parentId === parentId);

        for (const child of children) {
            const subcategories = this.buildTree(categories, child.id);

            const node = {
                ...child,
                subcategories: subcategories.length > 0 ? subcategories : []
            };

            branch.push(node);
        }

        return branch;
    }
}

module.exports = new CategoryService();
