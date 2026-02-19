const db = require('../../models');
const { Branch, UserBranch, User } = db;
const { Op } = require('sequelize');

class BranchService {
    async getAllBranches(filters, pagination) {
        const { search, isActive } = filters;
        const { limit, offset } = pagination;

        const where = {};
        
        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { code: { [Op.like]: `%${search}%` } },
                { city: { [Op.like]: `%${search}%` } }
            ];
        }

        return await Branch.findAndCountAll({
            where,
            limit,
            offset,
            order: [['isHeadOffice', 'DESC'], ['name', 'ASC']]
        });
    }

    async getBranchById(id) {
        return await Branch.findByPk(id);
    }

    async getBranchByCode(code) {
        return await Branch.findOne({ where: { code } });
    }

    async createBranch(data, transaction) {
        // If setting as head office, unset other head offices
        if (data.isHeadOffice) {
            await Branch.update(
                { isHeadOffice: false },
                { where: { isHeadOffice: true }, transaction }
            );
        }

        return await Branch.create(data, { transaction });
    }

    async updateBranch(id, data, transaction) {
        const branch = await Branch.findByPk(id, { transaction });
        if (!branch) return null;

        // If setting as head office, unset other head offices
        if (data.isHeadOffice && !branch.isHeadOffice) {
            await Branch.update(
                { isHeadOffice: false },
                { where: { isHeadOffice: true, id: { [Op.ne]: id } }, transaction }
            );
        }

        await branch.update(data, { transaction });
        return branch;
    }

    async deleteBranch(id, transaction) {
        const branch = await Branch.findByPk(id, { transaction });
        if (!branch) return null;

        // Check if head office
        if (branch.isHeadOffice) {
            throw new Error('Cannot delete head office branch');
        }

        // Soft delete
        await branch.update({ isActive: false }, { transaction });
        return true;
    }

    async getUserBranches(userId) {
        return await UserBranch.findAll({
            where: { userId },
            include: [{ model: Branch, as: 'branch' }]
        });
    }

    async assignUserToBranch(userId, branchId, transaction) {
        const existing = await UserBranch.findOne({
            where: { userId, branchId },
            transaction
        });

        if (existing) {
            throw new Error('User already assigned to this branch');
        }

        return await UserBranch.create({ userId, branchId }, { transaction });
    }

    async removeUserFromBranch(userId, branchId, transaction) {
        const userBranch = await UserBranch.findOne({
            where: { userId, branchId },
            transaction
        });

        if (!userBranch) return null;
        
        await userBranch.destroy({ transaction });
        return true;
    }
}

module.exports = new BranchService();
