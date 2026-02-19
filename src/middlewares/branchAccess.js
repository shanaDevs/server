const { User, Branch, UserBranch, Role, Permission } = require('../models');

/**
 * Middleware to check branch access
 * Adds branch filtering capability to req object
 */
exports.checkBranchAccess = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Fetch user's branch access
        const userBranches = await UserBranch.findAll({
            where: { userId: req.user.id },
            include: [{
                model: Branch,
                as: 'branch',
                where: { isActive: true }
            }]
        });

        // Check if user can access all branches
        const canAccessAll = req.user.roleLevel >= 100 || userBranches.some(ub => ub.canAccessAllBranches === true);
        const branchIds = userBranches.map(ub => ub.branchId);
        const defaultBranch = userBranches.find(ub => ub.isDefault === true);
        
        // Determine current branch for operations
        let currentBranchId = null;
        
        // Priority: 1. Selected branch from request, 2. Default branch, 3. First branch
        if (req.user.selectedBranchId) {
            // Validate selected branch access
            if (canAccessAll || branchIds.includes(req.user.selectedBranchId)) {
                currentBranchId = req.user.selectedBranchId;
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to the selected branch.'
                });
            }
        } else if (req.user.defaultBranchId) {
            currentBranchId = req.user.defaultBranchId;
        } else if (defaultBranch) {
            currentBranchId = defaultBranch.branchId;
        } else if (branchIds.length > 0) {
            currentBranchId = branchIds[0];
        }

        // For super admin or users with all branches, require branch selection
        if (canAccessAll && !currentBranchId) {
            return res.status(400).json({
                success: false,
                message: 'Please select a branch. Use header "x-branch-id" or query parameter "branchId".',
                requiresBranchSelection: true
            });
        }

        // For regular users, must have at least one branch
        if (!canAccessAll && branchIds.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No branch access configured for this user. Please contact administrator.'
            });
        }

        req.branchAccess = {
            canAccessAllBranches: canAccessAll,
            branches: branchIds,
            defaultBranchId: defaultBranch ? defaultBranch.branchId : (branchIds[0] || null),
            currentBranchId: currentBranchId,
            requiresSelection: canAccessAll || branchIds.length > 1
        };

        // Store current branch ID in req for easy access
        req.currentBranchId = currentBranchId;
        req.branchId = currentBranchId; // Alias for compatibility

        next();
    } catch (error) {
        console.error('Branch access check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking branch access',
            error: error.message
        });
    }
};

/**
 * Middleware to enforce branch filtering
 * Adds branch filter to query based on user's access
 */
exports.applyBranchFilter = (req, res, next) => {
    if (!req.branchAccess) {
        return res.status(403).json({
            success: false,
            message: 'Branch access not verified'
        });
    }

    // If user can access all branches, no filter needed
    if (req.branchAccess.canAccessAllBranches) {
        req.branchFilter = {};
    } else {
        // Filter by user's accessible branches
        req.branchFilter = {
            branchId: req.branchAccess.branches
        };
    }

    next();
};

/**
 * Middleware to validate branch ID in request
 * Checks if user has access to the specified branch
 */
exports.validateBranchId = async (req, res, next) => {
    try {
        const branchId = req.body.branchId || req.params.branchId || req.query.branchId;

        if (!branchId) {
            // If no branch specified, use default branch
            if (req.branchAccess && req.branchAccess.defaultBranchId) {
                req.body.branchId = req.branchAccess.defaultBranchId;
            }
            return next();
        }

        // Super admin can access any branch
        if (req.branchAccess && req.branchAccess.canAccessAllBranches) {
            return next();
        }

        // Check if user has access to this branch
        if (!req.branchAccess || !req.branchAccess.branches.includes(parseInt(branchId))) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not have access to this branch.'
            });
        }

        next();
    } catch (error) {
        console.error('Branch ID validation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error validating branch access',
            error: error.message
        });
    }
};

/**
 * Middleware to require specific branch permission
 * Combines branch access with permission check
 */
exports.requireBranchPermission = (permission) => {
    return [
        exports.checkBranchAccess,
        exports.applyBranchFilter,
        async (req, res, next) => {
            try {
                // Check if user has the required permission
                const user = await User.findByPk(req.user.id, {
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        where: { name: permission, isActive: true },
                        required: false
                    }]
                });

                if (!user || user.permissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: `Access denied. Required permission: ${permission}`
                    });
                }

                next();
            } catch (error) {
                console.error('Permission check error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error checking permissions',
                    error: error.message
                });
            }
        }
    ];
};

/**
 * Middleware combination for branch-aware operations
 */
exports.requireBranchAccess = [
    exports.checkBranchAccess,
    exports.applyBranchFilter
];

/**
 * Get user's accessible branches
 */
exports.getUserBranches = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Super admin gets all branches
        if (req.user.roleLevel >= 100) {
            const allBranches = await Branch.findAll({
                where: { isActive: true },
                attributes: ['id', 'name', 'code', 'city', 'isHeadOffice']
            });

            return res.status(200).json({
                success: true,
                canAccessAllBranches: true,
                branches: allBranches
            });
        }

        // Get user's specific branches
        const userBranches = await UserBranch.findAll({
            where: { userId: req.user.id },
            include: [{
                model: Branch,
                as: 'branch',
                where: { isActive: true },
                attributes: ['id', 'name', 'code', 'city', 'isHeadOffice']
            }],
            attributes: ['isDefault', 'canAccessAllBranches']
        });

        const canAccessAll = userBranches.some(ub => ub.canAccessAllBranches === true);

        if (canAccessAll) {
            const allBranches = await Branch.findAll({
                where: { isActive: true },
                attributes: ['id', 'name', 'code', 'city', 'isHeadOffice']
            });

            return res.status(200).json({
                success: true,
                canAccessAllBranches: true,
                branches: allBranches
            });
        }

        return res.status(200).json({
            success: true,
            canAccessAllBranches: false,
            branches: userBranches.map(ub => ({
                ...ub.branch.toJSON(),
                isDefault: ub.isDefault
            }))
        });
    } catch (error) {
        console.error('Error fetching user branches:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching branches',
            error: error.message
        });
    }
};
