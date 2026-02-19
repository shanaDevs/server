const bcrypt = require('bcrypt');
const { User, Role, Branch, UserBranch } = require('../models');

const seedDefaultSuperAdmin = async () => {
    try {
        // Get super_admin role
        const superAdminRole = await Role.findOne({
            where: { name: 'super_admin' }
        });

        if (!superAdminRole) {
            console.log('❌ Super Admin role not found. Please seed roles first.');
            return;
        }

        // Check if super_admin user already exists
        const existingSuperAdmin = await User.findOne({
            where: { roleId: superAdminRole.id }
        });

        if (existingSuperAdmin) {
            console.log('ℹ️  Super Admin user already exists. Skipping seed.');
            return;
        }

        // Create default super_admin user
        const hashedPassword = await bcrypt.hash('123456', 10);
        
        // Get head office first for defaultBranchId
        const headOffice = await Branch.findOne({
            where: { isHeadOffice: true }
        });

        if (!headOffice) {
            console.log('❌ Head Office branch not found. Please seed branches first.');
            return;
        }

        const superAdmin = await User.create({
            firstName: 'Super',
            lastName: 'Admin',
            userName: 'Super Admin',
            phone: '0743242403',
            password: hashedPassword,
            roleId: superAdminRole.id,
            defaultBranchId: headOffice.id,
            isDisabled: false,
            isDeleted: false
        });

        // Assign super admin to head office with access to all branches
        await UserBranch.create({
            userId: superAdmin.id,
            branchId: headOffice.id,
            isDefault: true,
            canAccessAllBranches: true
        });
        console.log('✅ Super Admin assigned to Head Office with access to all branches');

        console.log('✅ Default Super Admin user created successfully!');
        console.log('📱 Phone: 0743242403');
        console.log('🔑 Password: 123456');
        console.log('⚠️  Please change the default password after first login!');
        
        return superAdmin;
    } catch (error) {
        console.error('❌ Error creating default Super Admin:', error.message);
        throw error;
    }
};

module.exports = { seedDefaultSuperAdmin };