const db = require('../../models');
const { SystemSettings } = db;

class SystemSettingsService {
    async getSettings(branchId) {
        const where = branchId ? { branchId } : {};
        
        let settings = await SystemSettings.findOne({ where });
        
        // Return default settings if none exist
        if (!settings) {
            return {
                shopName: 'My POS Shop',
                shopAddress: '',
                shopPhone: '',
                shopEmail: '',
                shopLogo: '',
                taxRate: 0,
                currency: 'LKR',
                currencySymbol: 'Rs.',
                invoicePrefix: 'INV',
                invoiceFooter: '',
                enableTax: true,
                enableLoyalty: true,
                loyaltyPointsPerAmount: 100,
                loyaltyPointValue: 1,
                notificationChannel: 'EMAIL_ONLY',
                enableEmailNotifications: true,
                enableSMSNotifications: false
            };
        }
        
        return settings;
    }

    async updateSettings(data, branchId, transaction) {
        const where = branchId ? { branchId } : {};
        
        let settings = await SystemSettings.findOne({ where, transaction });
        
        if (settings) {
            await settings.update(data, { transaction });
        } else {
            settings = await SystemSettings.create({
                ...data,
                branchId
            }, { transaction });
        }
        
        return settings;
    }

    async getSettingByKey(key, branchId) {
        const settings = await this.getSettings(branchId);
        return settings[key];
    }

    async updateSettingByKey(key, value, branchId, transaction) {
        const where = branchId ? { branchId } : {};
        
        let settings = await SystemSettings.findOne({ where, transaction });
        
        if (settings) {
            await settings.update({ [key]: value }, { transaction });
        } else {
            settings = await SystemSettings.create({
                [key]: value,
                branchId
            }, { transaction });
        }
        
        return settings;
    }
}

module.exports = new SystemSettingsService();
