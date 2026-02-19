const db = require('../../models');
const { Companies } = db;
const { Op } = require('sequelize');

class CompanyService {
    async getAllCompanies(filters, pagination, branchConfig) {
        const { search, isDisabled } = filters;
        const { limit, offset } = pagination;
        const { branchId, branchAccess } = branchConfig;

        const where = { idDeleted: false };
        
        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { address: { [Op.like]: `%${search}%` } },
                { phoneNumber: { [Op.like]: `%${search}%` } }
            ];
        }
        
        if (isDisabled !== undefined) {
            where.isdisabled = isDisabled === 'true';
        }

        return await Companies.findAndCountAll({
            where,
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });
    }

    async getCompanyById(id, branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id, idDeleted: false };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await Companies.findOne({ where });
    }

    async checkEmailExists(email, branchConfig, excludeId = null) {
        const { branchId, branchAccess } = branchConfig;
        const where = { contactEmail: email, idDeleted: false };

        if (excludeId) {
            where.id = { [Op.ne]: excludeId };
        }

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await Companies.findOne({ where });
    }

    async createCompany(data, transaction) {
        return await Companies.create(data, { transaction });
    }

    async updateCompany(id, data, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id, idDeleted: false };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const company = await Companies.findOne({ where, transaction });
        if (!company) return null;

        await company.update(data, { transaction });
        return company;
    }

    async deleteCompany(id, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id, idDeleted: false };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const company = await Companies.findOne({ where, transaction });
        if (!company) return null;

        // Soft delete
        await company.update({ idDeleted: true, isdisabled: true }, { transaction });
        return true;
    }
}

module.exports = new CompanyService();
