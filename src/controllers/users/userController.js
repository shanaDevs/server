const { User, Role, Branch, UserBranch, Permission, UserPermission } = require('../../models');
const db = require('../../models');
const userService = require('../../services/users/userService');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { requireBranchId, addBranchFilter, addBranchId } = require('../../utils/branchHelper');

// Register new user
exports.register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { phone, firstName, lastName, userName, password, roleId, branchIds, defaultBranchId, canAccessAllBranches } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ where: { phone } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this phone number already exists'
            });
        }

        // If roleId not provided, get default 'user' role
        let userRoleId = roleId;
        if (!userRoleId) {
            const userRole = await Role.findOne({ where: { name: 'user' } });
            if (userRole) {
                userRoleId = userRole.id;
            }
        }

        // Validate branches if provided
        if (branchIds && branchIds.length > 0) {
            const branches = await Branch.findAll({
                where: { id: { [Op.in]: branchIds } }
            });
            if (branches.length !== branchIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more branch IDs are invalid'
                });
            }
        }

        // Validate defaultBranchId if provided
        let finalDefaultBranchId = defaultBranchId;
        if (defaultBranchId) {
            if (!branchIds || !branchIds.includes(defaultBranchId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Default branch must be one of the assigned branches'
                });
            }
        } else if (branchIds && branchIds.length > 0) {
            // Set first branch as default if not specified
            finalDefaultBranchId = branchIds[0];
        } else if (req.user && req.user.defaultBranchId) {
            // If no branches specified, use logged-in user's default branch
            finalDefaultBranchId = req.user.defaultBranchId;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            phone,
            firstName,
            lastName,
            userName,
            password: hashedPassword,
            roleId: userRoleId,
            defaultBranchId: finalDefaultBranchId,
            branchId: req.user?.defaultBranchId || req.user?.branchId || null
        });

        // Create branch assignments if provided or use logged-in user's branch
        if (branchIds && branchIds.length > 0) {
            const userBranchData = branchIds.map(branchId => ({
                userId: user.id,
                branchId: branchId,
                isDefault: branchId === finalDefaultBranchId,
                canAccessAllBranches: canAccessAllBranches || false
            }));
            await UserBranch.bulkCreate(userBranchData);
        } else if (finalDefaultBranchId) {
            // If no branches specified but we have a default branch, assign it
            await UserBranch.create({
                userId: user.id,
                branchId: finalDefaultBranchId,
                isDefault: true,
                canAccessAllBranches: canAccessAllBranches || false
            });
        }

        // 🔐 AUTO-GRANT DEFAULT PERMISSIONS BASED ON ROLE
        const userRole = await Role.findByPk(userRoleId);
        
        if (userRole) {
            let permissionsToGrant = [];
            
            // Super admin (level 100) gets ALL permissions
            if (userRole.level >= 100) {
                const allPermissions = await Permission.findAll({ 
                    where: { isActive: true } 
                });
                permissionsToGrant = allPermissions.map(p => p.id);
            } 
            // Admin (level 80) gets most permissions except super admin functions
            else if (userRole.level >= 80) {
                const adminPermissions = await Permission.findAll({
                    where: { 
                        isActive: true,
                        name: {
                            [Op.notLike]: '%super_admin%'
                        }
                    }
                });
                permissionsToGrant = adminPermissions.map(p => p.id);
            }
            // Manager and below get basic view permissions
            else {
                const basicPermissions = await Permission.findAll({
                    where: { 
                        isActive: true,
                        [Op.or]: [
                            { name: { [Op.like]: 'view_%' } },
                            { name: { [Op.like]: 'list_%' } },
                            { name: 'access_dashboard' }
                        ]
                    }
                });
                permissionsToGrant = basicPermissions.map(p => p.id);
            }

            // Grant permissions to the new user
            if (permissionsToGrant.length > 0) {
                const userPermissions = permissionsToGrant.map(permId => ({
                    userId: user.id,
                    permissionId: permId,
                    grantedBy: req.user?.id || null,
                    grantedAt: new Date()
                }));
                
                await UserPermission.bulkCreate(userPermissions, {
                    ignoreDuplicates: true
                });
            }
        }



        // Fetch user with branch information and permissions
        const userWithBranches = await User.findByPk(user.id, {
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: Branch,
                    as: 'branches',
                    through: { attributes: ['isDefault', 'canAccessAllBranches'] }
                },
                {
                    model: Permission,
                    as: 'permissions',
                    through: { attributes: ['grantedBy', 'grantedAt'] }
                }
            ]
        });


        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: userWithBranches
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'Phone number already exists'
            });
        }
        next(error);
    }
};

// Login user
exports.login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { phone, password } = req.body;

        // Find user by phone with role and branches
        const user = await User.findOne({ 
            where: { phone },
            include: [
                {
                    model: Role,
                    as: 'role',
                    attributes: ['id', 'name', 'displayName', 'level']
                },
                {
                    model: Branch,
                    as: 'branches',
                    through: { attributes: ['isDefault', 'canAccessAllBranches'] }
                }
            ]
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is disabled
        if (user.isDisabled) {
            return res.status(403).json({
                success: false,
                message: 'Account is disabled. Please contact administrator.'
            });
        }

        // Check if user is deleted
        if (user.isDeleted) {
            return res.status(403).json({
                success: false,
                message: 'Account has been deleted.'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                phone: user.phone, 
                roleId: user.roleId,
                roleName: user.role.name,
                roleLevel: user.role.level
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d'}
        );

        // Generate refresh token
        const refreshToken = jwt.sign(
            { 
                id: user.id,
                phone: user.phone,
                roleId: user.roleId
            },
            process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        );

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.password;

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

// Refresh access token
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key');
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        // Verify user still exists and is active
        const user = await User.findOne({ 
            where: { 
                id: decoded.id,
                isDeleted: false,
                isDisabled: false
            },
            include: [{
                model: Role,
                as: 'role',
                attributes: ['id', 'name', 'displayName', 'level']
            }]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found or account disabled'
            });
        }

        // Generate new access token
        const newToken = jwt.sign(
            { 
                id: user.id, 
                phone: user.phone, 
                roleId: user.roleId,
                roleName: user.role.name,
                roleLevel: user.role.level
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token: newToken,
                refreshToken: refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

// Logout user (stateless - client should discard tokens)
exports.logout = async (req, res, next) => {
    try {
        res.json({
            success: true,
            message: 'Logged out successfully. Please discard your tokens.'
        });
    } catch (error) {
        next(error);
    }
};

// Get all users
exports.getAllUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, role, isDisabled } = req.query;
        const filters = { role, isDisabled };
        const pagination = { limit: parseInt(limit), offset: (page - 1) * limit };
        const branchConfig = { branchId: req.branchId, branchAccess: req.user?.branchAccess };

        const { count, rows } = await userService.getAllUsers(filters, pagination, branchConfig);

        res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) } });
    } catch (error) {
        next(error);
    }
};

// Get user by ID
exports.getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const branchConfig = { branchId: req.branchId, branchAccess: req.user?.branchAccess };

        const user = await userService.getUserById(id, branchConfig);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// Update user
exports.updateUser = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const where = { id };
        addBranchFilter(where, req);
        
        const user = await userService.getUserById(id, { branchId: req.branchId, branchAccess: req.user?.branchAccess });
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const { branchIds, defaultBranchId, canAccessAllBranches, ...otherUpdates } = req.body;

        // Validate branches if provided
        if (branchIds && branchIds.length > 0) {
            const branches = await Branch.findAll({
                where: { id: { [Op.in]: branchIds } }
            });
            if (branches.length !== branchIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more branch IDs are invalid'
                });
            }
        }

        // Validate defaultBranchId if provided
        if (defaultBranchId) {
            if (branchIds && !branchIds.includes(defaultBranchId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Default branch must be one of the assigned branches'
                });
            }
            otherUpdates.defaultBranchId = defaultBranchId;
        } else if (branchIds && branchIds.length > 0) {
            // Set first branch as default if not specified
            otherUpdates.defaultBranchId = branchIds[0];
        }

        // If password is being updated, hash it
        if (otherUpdates.password) {
            otherUpdates.password = await bcrypt.hash(otherUpdates.password, 10);
        }

        const updatedUser = await userService.updateUser(id, otherUpdates, transaction);
        if (!updatedUser) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update branch assignments if provided - keep existing behavior in controller
        if (branchIds) {
            await UserBranch.destroy({ where: { userId: id } });
            if (branchIds.length > 0) {
                const userBranchData = branchIds.map(branchId => ({ userId: id, branchId, isDefault: branchId === (defaultBranchId || branchIds[0]), canAccessAllBranches: canAccessAllBranches || false }));
                await UserBranch.bulkCreate(userBranchData);
            }
        }

        const resultUser = await userService.getUserById(id);

        await transaction.commit();

        res.json({ success: true, message: 'User updated successfully', data: resultUser });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Soft delete user
exports.deleteUser = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const deleted = await userService.deleteUser(id, transaction);
        if (!deleted) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        await transaction.commit();
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Toggle user disabled status
exports.toggleUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const where = { id };
        addBranchFilter(where, req);
        
        const user = await User.findOne({ where });

        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await user.update({ isDisabled: !user.isDisabled });

        res.json({
            success: true,
            message: `User ${user.isDisabled ? 'disabled' : 'enabled'} successfully`,
            data: {
                id: user.id,
                isDisabled: user.isDisabled
            }
        });
    } catch (error) {
        next(error);
    }
};
