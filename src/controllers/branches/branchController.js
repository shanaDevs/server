const branchService = require('../../services/branches/branchService');
const db = require('../../models');
const { Branch, UserBranch, User } = db;

// Create a new branch
exports.createBranch = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { name, code, address, city, state, zipCode, country, phone, email, managerName, isHeadOffice } = req.body;

        // Validate required fields
        if (!name || !code) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Branch name and code are required'
            });
        }

        // Check if code already exists
        const existingBranch = await branchService.getBranchByCode(code);
        if (existingBranch) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Branch code already exists'
            });
        }

        const branch = await branchService.createBranch({
            name,
            code,
            address,
            city,
            state,
            zipCode,
            country: country || 'Sri Lanka',
            phone,
            email,
            managerName,
            isHeadOffice: isHeadOffice || false,
            isActive: true
        }, transaction);

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Branch created successfully',
            data: branch
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating branch:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating branch',
            error: error.message
        });
    }
};

// Get all branches
exports.getAllBranches = async (req, res) => {
    try {
        const { isActive, search, page = 1, limit = 10 } = req.query;

        const filters = { isActive, search };
        const pagination = {
            limit: parseInt(limit),
            offset: (page - 1) * parseInt(limit)
        };

        const { count, rows } = await branchService.getAllBranches(filters, pagination);

        res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching branches',
            error: error.message
        });
    }
};

// Get branch by ID
exports.getBranchById = async (req, res) => {
    try {
        const { id } = req.params;

        const branch = await branchService.getBranchById(id);

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }

        res.status(200).json({
            success: true,
            data: branch
        });
    } catch (error) {
        console.error('Error fetching branch:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching branch',
            error: error.message
        });
    }
};

// Update branch
exports.updateBranch = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { name, code, address, city, state, zipCode, country, phone, email, managerName, isHeadOffice, isActive } = req.body;

        const branch = await branchService.getBranchById(id);

        if (!branch) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }

        // Check if code is being changed and if it's unique
        if (code && code !== branch.code) {
            const existingBranch = await branchService.getBranchByCode(code);
            if (existingBranch) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Branch code already exists'
                });
            }
        }

        const updateData = {
            name: name || branch.name,
            code: code || branch.code,
            address: address !== undefined ? address : branch.address,
            city: city !== undefined ? city : branch.city,
            state: state !== undefined ? state : branch.state,
            zipCode: zipCode !== undefined ? zipCode : branch.zipCode,
            country: country !== undefined ? country : branch.country,
            phone: phone !== undefined ? phone : branch.phone,
            email: email !== undefined ? email : branch.email,
            managerName: managerName !== undefined ? managerName : branch.managerName,
            isHeadOffice: isHeadOffice !== undefined ? isHeadOffice : branch.isHeadOffice,
            isActive: isActive !== undefined ? isActive : branch.isActive
        };

        const updatedBranch = await branchService.updateBranch(id, updateData, transaction);

        await transaction.commit();

        res.status(200).json({
            success: true,
            message: 'Branch updated successfully',
            data: updatedBranch
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating branch:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating branch',
            error: error.message
        });
    }
};

// Delete branch (soft delete)
exports.deleteBranch = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;

        const result = await branchService.deleteBranch(id, transaction);

        if (!result) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }

        await transaction.commit();

        res.status(200).json({
            success: true,
            message: 'Branch deactivated successfully'
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting branch:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error deleting branch',
            error: error.message
        });
    }
};

// Assign user to branch
exports.assignUserToBranch = async (req, res) => {
    try {
        const { userId, branchId, isDefault, canAccessAllBranches } = req.body;

        if (!userId || !branchId) {
            return res.status(400).json({
                success: false,
                message: 'User ID and Branch ID are required'
            });
        }

        // Check if user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if branch exists
        const branch = await Branch.findByPk(branchId);
        if (!branch) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }

        // Check if assignment already exists
        const existingAssignment = await UserBranch.findOne({
            where: { userId, branchId }
        });

        if (existingAssignment) {
            // Update existing assignment
            await existingAssignment.update({
                isDefault: isDefault || existingAssignment.isDefault,
                canAccessAllBranches: canAccessAllBranches !== undefined ? canAccessAllBranches : existingAssignment.canAccessAllBranches
            });

            return res.status(200).json({
                success: true,
                message: 'User branch assignment updated',
                data: existingAssignment
            });
        }

        // If setting as default, unset other default branches for this user
        if (isDefault) {
            await UserBranch.update(
                { isDefault: false },
                { where: { userId } }
            );
        }

        const userBranch = await UserBranch.create({
            userId,
            branchId,
            isDefault: isDefault || false,
            canAccessAllBranches: canAccessAllBranches || false
        });

        res.status(201).json({
            success: true,
            message: 'User assigned to branch successfully',
            data: userBranch
        });
    } catch (error) {
        console.error('Error assigning user to branch:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning user to branch',
            error: error.message
        });
    }
};

// Remove user from branch
exports.removeUserFromBranch = async (req, res) => {
    try {
        const { userId, branchId } = req.params;

        const userBranch = await UserBranch.findOne({
            where: { userId, branchId }
        });

        if (!userBranch) {
            return res.status(404).json({
                success: false,
                message: 'User branch assignment not found'
            });
        }

        await userBranch.destroy();

        res.status(200).json({
            success: true,
            message: 'User removed from branch successfully'
        });
    } catch (error) {
        console.error('Error removing user from branch:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing user from branch',
            error: error.message
        });
    }
};

// Get users assigned to a branch
exports.getBranchUsers = async (req, res) => {
    try {
        const { id } = req.params;

        const branch = await Branch.findByPk(id);
        if (!branch) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }

        const userBranches = await UserBranch.findAll({
            where: { branchId: id },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName', 'userName', 'phone', 'roleId']
            }]
        });

        res.status(200).json({
            success: true,
            data: userBranches
        });
    } catch (error) {
        console.error('Error fetching branch users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching branch users',
            error: error.message
        });
    }
};

// Get user's assigned branches
exports.getUserBranches = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userBranches = await UserBranch.findAll({
            where: { userId: id },
            include: [{
                model: Branch,
                as: 'branch',
                where: { isActive: true }
            }]
        });

        res.status(200).json({
            success: true,
            data: userBranches
        });
    } catch (error) {
        console.error('Error fetching user branches:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user branches',
            error: error.message
        });
    }
};

// Update user's branch access (including canAccessAllBranches flag)
exports.updateUserBranchAccess = async (req, res) => {
    try {
        const { userId } = req.params;
        const { branches, canAccessAllBranches } = req.body;

        // Validate input
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // If canAccessAllBranches is true, create a single UserBranch entry with that flag
        if (canAccessAllBranches === true) {
            // Get all active branches
            const allBranches = await Branch.findAll({
                where: { isActive: true }
            });

            if (allBranches.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No active branches found'
                });
            }

            // Remove existing assignments
            await UserBranch.destroy({ where: { userId } });

            // Create assignment with canAccessAllBranches flag
            const headOffice = allBranches.find(b => b.isHeadOffice) || allBranches[0];
            
            await UserBranch.create({
                userId,
                branchId: headOffice.id,
                isDefault: true,
                canAccessAllBranches: true
            });

            return res.status(200).json({
                success: true,
                message: 'User granted access to all branches',
                data: { canAccessAllBranches: true }
            });
        }

        // Otherwise, assign specific branches
        if (!branches || !Array.isArray(branches) || branches.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Branches array is required and must not be empty'
            });
        }

        // Remove existing assignments
        await UserBranch.destroy({ where: { userId } });

        // Create new assignments
        const userBranches = await Promise.all(
            branches.map((branch, index) =>
                UserBranch.create({
                    userId,
                    branchId: branch.branchId,
                    isDefault: branch.isDefault || (index === 0),
                    canAccessAllBranches: false
                })
            )
        );

        res.status(200).json({
            success: true,
            message: 'User branch access updated successfully',
            data: userBranches
        });
    } catch (error) {
        console.error('Error updating user branch access:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user branch access',
            error: error.message
        });
    }
};

// Get current user's branch context
exports.getMyBranchContext = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch user's branch assignments
        const userBranches = await UserBranch.findAll({
            where: { userId },
            include: [{
                model: Branch,
                as: 'branch',
                where: { isActive: true },
                attributes: ['id', 'name', 'code', 'city', 'isHeadOffice']
            }],
            attributes: ['isDefault', 'canAccessAllBranches']
        });

        // Check if user has access to all branches
        const canAccessAll = req.user.roleLevel >= 100 || userBranches.some(ub => ub.canAccessAllBranches === true);
        
        let availableBranches = [];
        
        if (canAccessAll) {
            // Get all active branches
            availableBranches = await Branch.findAll({
                where: { isActive: true },
                attributes: ['id', 'name', 'code', 'city', 'isHeadOffice'],
                order: [['isHeadOffice', 'DESC'], ['name', 'ASC']]
            });
        } else {
            // Get only assigned branches
            availableBranches = userBranches.map(ub => ({
                ...ub.branch.toJSON(),
                isDefault: ub.isDefault
            }));
        }

        // Get current branch ID
        const currentBranchId = req.currentBranchId || req.user.defaultBranchId || 
                               (availableBranches.length > 0 ? availableBranches[0].id : null);

        const currentBranch = availableBranches.find(b => b.id === currentBranchId);

        res.status(200).json({
            success: true,
            data: {
                canAccessAllBranches: canAccessAll,
                requiresBranchSelection: canAccessAll || availableBranches.length > 1,
                currentBranch: currentBranch || null,
                availableBranches: availableBranches,
                totalBranches: availableBranches.length
            }
        });
    } catch (error) {
        console.error('Error fetching branch context:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching branch context',
            error: error.message
        });
    }
};
