const { Op } = require('sequelize');

/**
 * Apply branch filter to Sequelize where clause
 * @param {Object} branchAccess - Branch access object from middleware (req.branchAccess)
 * @param {Object} whereClause - Existing where clause to extend
 * @returns {Object} Updated where clause with branch filter
 */
exports.applyBranchFilter = (branchAccess, whereClause = {}) => {
    if (!branchAccess) {
        throw new Error('Branch access information is required');
    }

    // Super admin or users with access to all branches - no filter needed
    if (branchAccess.canAccessAllBranches) {
        return whereClause;
    }

    // Add branch filter
    return {
        ...whereClause,
        branchId: {
            [Op.in]: branchAccess.branches
        }
    };
};

/**
 * Get branch ID for create operations
 * @param {Object} req - Express request object
 * @returns {Number|null} Branch ID to use for new records
 */
exports.getBranchIdForCreate = (req) => {
    // Priority 1: Use current branch ID set by middleware
    if (req.currentBranchId) {
        return req.currentBranchId;
    }

    // Priority 2: Check if branch ID is explicitly provided in request body
    const providedBranchId = req.body.branchId;

    if (providedBranchId) {
        // Validate if user has access to this branch
        if (!req.branchAccess.canAccessAllBranches && 
            !req.branchAccess.branches.includes(parseInt(providedBranchId))) {
            throw new Error('Access denied to specified branch');
        }
        return parseInt(providedBranchId);
    }

    // Priority 3: Use branch access info
    if (req.branchAccess) {
        return req.branchAccess.currentBranchId || req.branchAccess.defaultBranchId;
    }

    throw new Error('Branch ID is required. Please select a branch.');
};

/**
 * Validate branch access for a specific record
 * @param {Object} record - Database record with branchId
 * @param {Object} branchAccess - Branch access object from middleware
 * @returns {Boolean} True if user has access, throws error otherwise
 */
exports.validateRecordBranchAccess = (record, branchAccess) => {
    if (!record) {
        throw new Error('Record not found');
    }

    // Super admin or users with access to all branches
    if (branchAccess.canAccessAllBranches) {
        return true;
    }

    // Check if record's branch is in user's accessible branches
    if (record.branchId && !branchAccess.branches.includes(record.branchId)) {
        throw new Error('Access denied. This record belongs to a branch you do not have access to.');
    }

    return true;
};

/**
 * Get branch filter for reporting/aggregation queries
 * @param {Object} branchAccess - Branch access object from middleware
 * @param {Number|Array} specificBranches - Optional specific branch IDs to filter
 * @returns {Object} Branch filter for queries
 */
exports.getBranchFilterForReports = (branchAccess, specificBranches = null) => {
    if (branchAccess.canAccessAllBranches) {
        // If specific branches requested, use those
        if (specificBranches) {
            const branchIds = Array.isArray(specificBranches) ? specificBranches : [specificBranches];
            return { branchId: { [Op.in]: branchIds } };
        }
        // Otherwise, no filter (all branches)
        return {};
    }

    // For non-super users, filter by their accessible branches
    let branches = branchAccess.branches;
    
    // If specific branches requested, intersect with user's accessible branches
    if (specificBranches) {
        const requestedBranches = Array.isArray(specificBranches) ? specificBranches : [specificBranches];
        branches = branches.filter(b => requestedBranches.includes(b));
    }

    return { branchId: { [Op.in]: branches } };
};

/**
 * Middleware wrapper to automatically apply branch filtering to controller
 * @param {Function} controllerFn - Controller function to wrap
 * @returns {Function} Wrapped controller with automatic branch filtering
 */
exports.withBranchFilter = (controllerFn) => {
    return async (req, res, next) => {
        try {
            // Ensure branch access is set
            if (!req.branchAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Branch access not configured. Please contact administrator.'
                });
            }

            // Call original controller
            await controllerFn(req, res, next);
        } catch (error) {
            next(error);
        }
    };
};
