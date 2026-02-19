/**
 * Branch Helper Utility
 * Provides consistent branch ID handling across all controllers
 */

/**
 * Get branch ID from request with fallback priority:
 * 1. req.currentBranchId (from branch middleware via x-branch-id header)
 * 2. req.body.branchId (from request body)
 * 3. req.query.branchId (from query params)
 * 4. req.user.defaultBranchId (user's default branch)
 * 
 * @param {Object} req - Express request object
 * @returns {number|null} - Branch ID or null
 */
const getBranchId = (req) => {
    return req.currentBranchId || 
           req.body?.branchId || 
           req.query?.branchId || 
           req.user?.defaultBranchId || 
           null;
};

/**
 * Get branch ID or throw error if not found
 * Use this in create/update operations that require a branch
 * 
 * @param {Object} req - Express request object
 * @throws {Error} - If branch ID is not found
 * @returns {number} - Branch ID
 */
const requireBranchId = (req) => {
    const branchId = getBranchId(req);
    
    if (!branchId) {
        const error = new Error('Branch ID is required. Please select a branch.');
        error.statusCode = 400;
        error.code = 'BRANCH_REQUIRED';
        throw error;
    }
    
    return branchId;
};

/**
 * Add branch filter to Sequelize where clause
 * 
 * @param {Object} where - Existing where clause
 * @param {Object} req - Express request object
 * @param {boolean} required - If true, throws error when branch ID not found
 * @returns {Object} - Updated where clause with branchId
 */
const addBranchFilter = (where = {}, req, required = false) => {
    const branchId = required ? requireBranchId(req) : getBranchId(req);
    
    if (branchId) {
        where.branchId = branchId;
    }
    
    return where;
};

/**
 * Add branch ID to data object for create/update operations
 * 
 * @param {Object} data - Data object to be saved
 * @param {Object} req - Express request object
 * @param {boolean} required - If true, throws error when branch ID not found
 * @returns {Object} - Updated data object with branchId
 */
const addBranchId = (data = {}, req, required = true) => {
    const branchId = required ? requireBranchId(req) : getBranchId(req);
    
    if (branchId) {
        data.branchId = branchId;
    }
    
    return data;
};

/**
 * Get branch filter for query operations with user access control
 * Returns filter based on user's branch access permissions
 * 
 * @param {Object} req - Express request object
 * @returns {Object} - Where clause for branch filtering
 */
const getBranchFilterForQuery = (req) => {
    const where = {};
    
    // If user can access all branches and has selected one, filter by it
    if (req.branchAccess?.canAccessAllBranches) {
        const selectedBranch = req.currentBranchId || req.query.branchId;
        if (selectedBranch) {
            where.branchId = selectedBranch;
        }
        // If no branch selected and can access all, return empty where (show all)
    } else if (req.branchAccess?.branches?.length > 0) {
        // Regular user - filter by accessible branches
        const selectedBranch = req.currentBranchId;
        if (selectedBranch && req.branchAccess.branches.includes(selectedBranch)) {
            where.branchId = selectedBranch;
        } else {
            // Filter by all accessible branches
            where.branchId = req.branchAccess.branches;
        }
    }
    
    return where;
};

/**
 * Validate that user has access to the specified branch
 * 
 * @param {number} branchId - Branch ID to validate
 * @param {Object} req - Express request object
 * @throws {Error} - If user doesn't have access
 * @returns {boolean} - True if valid
 */
const validateBranchAccess = (branchId, req) => {
    if (!branchId) {
        const error = new Error('Branch ID is required for validation');
        error.statusCode = 400;
        throw error;
    }
    
    // Super admin or users with all branch access
    if (req.branchAccess?.canAccessAllBranches) {
        return true;
    }
    
    // Check if branch is in user's accessible branches
    if (req.branchAccess?.branches && !req.branchAccess.branches.includes(branchId)) {
        const error = new Error('You do not have access to this branch');
        error.statusCode = 403;
        error.code = 'BRANCH_ACCESS_DENIED';
        throw error;
    }
    
    return true;
};

/**
 * Wrapper for async route handlers with automatic branch error handling
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function with error handling
 */
const withBranchHandling = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            if (error.code === 'BRANCH_REQUIRED' || error.code === 'BRANCH_ACCESS_DENIED') {
                return res.status(error.statusCode || 400).json({
                    success: false,
                    message: error.message,
                    error: error.code
                });
            }
            next(error);
        }
    };
};

const getBranchConfig = (req) => {
    return {
        branchId: getBranchId(req),
        branchAccess: req.branchAccess
    };
};

module.exports = {
    getBranchId,
    requireBranchId,
    addBranchFilter,
    addBranchId,
    getBranchConfig,
    getBranchFilterForQuery,
    validateBranchAccess,
    withBranchHandling
};
