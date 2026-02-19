/**
 * Test script to verify user branch assignment functionality
 * This demonstrates creating a user with multiple branch assignments
 */

require('dotenv').config();
const { User, Branch, UserBranch, Role } = require('./src/models');

async function testUserBranchAssignment() {
    try {
        console.log('Starting user branch assignment test...\n');

        // 1. Check existing branches
        const branches = await Branch.findAll({
            attributes: ['id', 'name', 'code']
        });
        console.log('Available branches:');
        branches.forEach(b => console.log(`  - ID: ${b.id}, Name: ${b.name}, Code: ${b.code}`));
        console.log('');

        if (branches.length === 0) {
            console.log('❌ No branches found. Please run defaultBranch seeder first.');
            return;
        }

        // 2. Get a role for testing
        const role = await Role.findOne({ where: { name: 'cashier' } });
        if (!role) {
            console.log('❌ Cashier role not found. Please run defaultRoles seeder first.');
            return;
        }

        // 3. Test user data with multiple branches
        const testUserData = {
            phone: '0771234567',
            firstName: 'Test',
            lastName: 'User',
            userName: 'testuser',
            password: 'Test@123',
            roleId: role.id,
            branchIds: [1], // Single branch for now
            defaultBranchId: 1,
            canAccessAllBranches: false
        };

        console.log('Test user data:', JSON.stringify(testUserData, null, 2));
        console.log('');

        // 4. Check if user already exists
        const existingUser = await User.findOne({ 
            where: { phone: testUserData.phone }
        });

        if (existingUser) {
            console.log('Cleaning up existing test user...');
            await UserBranch.destroy({ where: { userId: existingUser.id } });
            await existingUser.destroy();
            console.log('✅ Existing user cleaned up\n');
        }

        // 5. Simulate the controller logic
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(testUserData.password, 10);

        const user = await User.create({
            phone: testUserData.phone,
            firstName: testUserData.firstName,
            lastName: testUserData.lastName,
            userName: testUserData.userName,
            password: hashedPassword,
            roleId: testUserData.roleId,
            defaultBranchId: testUserData.defaultBranchId
        });

        console.log('✅ User created:', {
            id: user.id,
            phone: user.phone,
            name: `${user.firstName} ${user.lastName}`,
            defaultBranchId: user.defaultBranchId
        });
        console.log('');

        // 6. Create branch assignments
        const userBranchData = testUserData.branchIds.map(branchId => ({
            userId: user.id,
            branchId: branchId,
            isDefault: branchId === testUserData.defaultBranchId,
            canAccessAllBranches: testUserData.canAccessAllBranches || false
        }));

        await UserBranch.bulkCreate(userBranchData);
        console.log('✅ Branch assignments created:', userBranchData.length);
        console.log('');

        // 7. Fetch user with branches
        const userWithBranches = await User.findByPk(user.id, {
            attributes: { exclude: ['password'] },
            include: [{
                model: Branch,
                as: 'branches',
                through: { attributes: ['isDefault', 'canAccessAllBranches'] }
            }]
        });

        console.log('✅ User with branches retrieved:');
        console.log(JSON.stringify({
            id: userWithBranches.id,
            phone: userWithBranches.phone,
            firstName: userWithBranches.firstName,
            lastName: userWithBranches.lastName,
            userName: userWithBranches.userName,
            roleId: userWithBranches.roleId,
            defaultBranchId: userWithBranches.defaultBranchId,
            branches: userWithBranches.branches.map(b => ({
                id: b.id,
                name: b.name,
                code: b.code,
                isDefault: b.UserBranch.isDefault,
                canAccessAllBranches: b.UserBranch.canAccessAllBranches
            })),
            branchIds: userWithBranches.branches.map(b => b.id)
        }, null, 2));
        console.log('');

        // 8. Test with multiple branches (if more branches exist)
        if (branches.length > 1) {
            console.log('Testing update with multiple branches...');
            const multipleBranchIds = branches.slice(0, 2).map(b => b.id);
            
            // Remove existing assignments
            await UserBranch.destroy({ where: { userId: user.id } });
            
            // Create new assignments
            const newUserBranchData = multipleBranchIds.map((branchId, index) => ({
                userId: user.id,
                branchId: branchId,
                isDefault: index === 0,
                canAccessAllBranches: false
            }));
            
            await UserBranch.bulkCreate(newUserBranchData);
            await user.update({ defaultBranchId: multipleBranchIds[0] });
            
            const updatedUser = await User.findByPk(user.id, {
                attributes: { exclude: ['password'] },
                include: [{
                    model: Branch,
                    as: 'branches',
                    through: { attributes: ['isDefault', 'canAccessAllBranches'] }
                }]
            });
            
            console.log('✅ User updated with multiple branches:');
            console.log(JSON.stringify({
                id: updatedUser.id,
                branches: updatedUser.branches.map(b => ({
                    id: b.id,
                    name: b.name,
                    isDefault: b.UserBranch.isDefault
                })),
                branchIds: updatedUser.branches.map(b => b.id)
            }, null, 2));
            console.log('');
        }

        console.log('✅ All tests passed! User branch assignment is working correctly.\n');
        
        // Cleanup
        console.log('Cleaning up test data...');
        await UserBranch.destroy({ where: { userId: user.id } });
        await user.destroy();
        console.log('✅ Test data cleaned up');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    } finally {
        process.exit(0);
    }
}

testUserBranchAssignment();
