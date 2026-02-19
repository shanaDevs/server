const { Repairs, Branch, User } = require('../../models');

class RepairsService {

    async create(data, transaction) {
        return await Repairs.create(data, { transaction });
    }

    async findAll(filters = {}) {
        return await Repairs.findAll({
            where: filters,
            include: [
                { model: Branch, as: 'branch' },
                { model: User, as: 'createdUser', attributes: ['id', 'firstName', 'lastName'] }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    async findById(id) {
        return await Repairs.findByPk(id, {
            include: [
                { model: Branch, as: 'branch' },
                { model: User, as: 'createdUser', attributes: ['id', 'firstName', 'lastName'] }
            ]
        });
    }

    async update(id, data, transaction) {
        const repair = await Repairs.findByPk(id);
        if (!repair) return null;

        await repair.update(data, { transaction });
        return repair;
    }

    async delete(id, transaction) {
        const repair = await Repairs.findByPk(id);
        if (!repair) return null;

        await repair.destroy({ transaction });
        return true;
    }
}

module.exports = new RepairsService();
