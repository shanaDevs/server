const { Branch } = require('../models');

/**
 * Create default branch (Head Office)
 */
const createDefaultBranch = async () => {
    try {
        console.log('🏢 Creating default branch...');

        // Check if any branches exist
        const existingBranches = await Branch.count();
        
        if (existingBranches > 0) {
            console.log('✅ Branches already exist. Skipping default branch creation.');
            return { success: true, message: 'Branches already exist' };
        }

        // Create head office branch
        const headOffice = await Branch.create({
            name: 'Head Office',
            code: 'HQ001',
            address: 'Main Street, Colombo',
            city: 'Colombo',
            state: 'Western Province',
            zipCode: '00100',
            country: 'Sri Lanka',
            phone: '+94112345678',
            email: 'headoffice@company.com',
            managerName: 'System Administrator',
            isHeadOffice: true,
            isActive: true
        });

        console.log(`✅ Default branch created: ${headOffice.name} (${headOffice.code})`);

        return { success: true, branch: headOffice };
    } catch (error) {
        console.error('❌ Error creating default branch:', error);
        throw error;
    }
};

module.exports = { createDefaultBranch };
