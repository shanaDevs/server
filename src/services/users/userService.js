const db = require('../../models');
const { User, Branch } = db;
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

class UserService {
    async getAllUsers(filters, pagination, branchConfig) {
        const { search, role, isActive } = filters;
        const { limit, offset } = pagination;
        const { branchId, branchAccess } = branchConfig;

        const where = {};
        if (branchId) where.defaultBranchId = branchId; // Users associated with branch ?
        // Usually users are global or multi-branch. Filtering users by branch might be trickier.
        // Assuming user model has defaultBranchId or similar.

        if (search) {
            where[Op.or] = [
                { userName: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } }
            ];
        }
        
        if (role) where.role = role;
        if (isActive !== undefined) where.isActive = isActive === 'true';

        return await User.findAndCountAll({
            where,
            include: [{ model: Branch, as: 'defaultBranch' }],
            attributes: { exclude: ['password'] },
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });
    }

    async getUserById(id) {
        return await User.findByPk(id, {
            include: [{ model: Branch, as: 'defaultBranch' }],
            attributes: { exclude: ['password'] }
        });
    }

    async createUser(data, transaction) {
        if (data.password) {
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        }
        return await User.create(data, { transaction });
    }

    async updateUser(id, data, transaction) {
        const user = await User.findByPk(id, { transaction });
        if (!user) return null;

        if (data.password) {
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        }

        await user.update(data, { transaction });
        return user;
    }

    async deleteUser(id, transaction) {
        const user = await User.findByPk(id, { transaction });
        if (!user) return null;
        
        // Soft delete or hard delete? Assuming soft delete pattern
        await user.update({ isActive: false }, { transaction });
        return true;
    }
    
    async verifyPassword(user, password) {
        return await bcrypt.compare(password, user.password);
    }
}

module.exports = new UserService();
