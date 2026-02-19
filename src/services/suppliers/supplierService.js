const db = require('../../models');
const { Suppliers } = db;
const { Op } = require('sequelize');

class SupplierService {
    async getAllSuppliers(filters, pagination, branchConfig) {
        const { search, isDisabled } = filters;
        const { limit, offset } = pagination;
        const { branchId, branchAccess } = branchConfig;

        const where = {};
        
        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { contactPerson: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { supplierCode: { [Op.like]: `%${search}%` } }
            ];
        }
        
        if (isDisabled !== undefined) {
            where.isActive = isDisabled === 'true' ? false : true;
        }

        return await Suppliers.findAndCountAll({
            where,
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });
    }

    async getSupplierById(id, branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await Suppliers.findOne({ where });
    }

    async checkSupplierCodeExists(code, branchConfig, excludeId = null) {
        const { branchId, branchAccess } = branchConfig;
        const where = { supplierCode: code };

        if (excludeId) {
            where.id = { [Op.ne]: excludeId };
        }

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await Suppliers.findOne({ where });
    }

    async createSupplier(data, transaction) {
        return await Suppliers.create(data, { transaction });
    }

    async updateSupplier(id, data, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const supplier = await Suppliers.findOne({ where, transaction });
        if (!supplier) return null;

        await supplier.update(data, { transaction });
        return supplier;
    }

    async deleteSupplier(id, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const supplier = await Suppliers.findOne({ where, transaction });
        if (!supplier) return null;

        // Soft delete
        await supplier.update({ isActive: false }, { transaction });
        return true;
    }
}

module.exports = new SupplierService();
