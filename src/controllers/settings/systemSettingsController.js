const db = require('../../models');
const { SystemSettings } = db;
const systemSettingsService = require('../../services/settings/systemSettingsService');
const { validationResult } = require('express-validator');

// Get system settings
exports.getSettings = async (req, res, next) => {
    try {
        const settings = await systemSettingsService.getSettings();

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        next(error);
    }
};

// Create or Update system settings
exports.upsertSettings = async (req, res, next) => {
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

        const updateData = { ...req.body };

        if (req.file) {
            updateData.shopLogo = req.file.path;
        }

        const settings = await systemSettingsService.updateSettings(updateData, null, transaction);

        await transaction.commit();

        res.json({
            success: true,
            message: 'System settings updated successfully',
            data: settings
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Reset system settings to defaults
exports.deleteSettings = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const settings = await SystemSettings.findOne({ transaction });

        if (!settings) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'System settings not found'
            });
        }

        // Reset to default values instead of deleting
        await settings.update({
            shopName: 'My POS Shop',
            shopAddress: '',
            shopPhone: '',
            shopEmail: '',
            taxRate: 0,
            taxType: 'percentage',
            taxName: 'VAT',
            currency: 'LKR',
            currencySymbol: 'Rs.',
            invoicePrefix: 'INV',
            enableTax: true,
            enableLoyalty: true,
            loyaltyPointsPerAmount: 100,
            loyaltyPointValue: 1
        }, { transaction });

        await transaction.commit();

        res.json({
            success: true,
            message: 'System settings reset to defaults successfully',
            data: settings
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};
