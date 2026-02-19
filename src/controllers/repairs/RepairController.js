const { validationResult } = require('express-validator');
const db = require('../../models');
const repairsService = require('../../services/repairs/repairsService');

exports.createRepair = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const repairData = {
            ...req.body,
            createdBy: req.user?.id,
            branchId: req.currentBranchId || req.body.branchId || null
        };

        const repair = await repairsService.create(repairData, transaction);
        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Repair created successfully',
            data: repair
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

exports.getAllRepairs = async (req, res, next) => {
    try {
        const repairs = await repairsService.findAll();

        res.json({
            success: true,
            data: repairs
        });
    } catch (error) {
        next(error);
    }
};

exports.getRepairById = async (req, res, next) => {
    try {
        const repair = await repairsService.findById(req.params.id);

        if (!repair) {
            return res.status(404).json({
                success: false,
                message: 'Repair not found'
            });
        }

        res.json({
            success: true,
            data: repair
        });
    } catch (error) {
        next(error);
    }
};

exports.updateRepair = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const repair = await repairsService.update(
            req.params.id,
            req.body,
            transaction
        );

        if (!repair) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Repair not found'
            });
        }

        await transaction.commit();
        res.json({
            success: true,
            message: 'Repair updated successfully',
            data: repair
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

exports.deleteRepair = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const deleted = await repairsService.delete(req.params.id, transaction);

        if (!deleted) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Repair not found'
            });
        }

        await transaction.commit();
        res.json({
            success: true,
            message: 'Repair deleted successfully'
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};
