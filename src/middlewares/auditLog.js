const { AuditLog } = require('../models');

// Middleware to log all requests and responses
exports.auditLogger = async (req, res, next) => {
    const startTime = Date.now();
    
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    
    // Override res.json to capture response
    res.json = function(data) {
        const duration = Date.now() - startTime;
        const status = res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'failed';
        
        // Extract user info from token (if authenticated)
        const user = req.user || {};
        
        // Prepare request body (exclude sensitive data)
        let requestBody = null;
        if (req.body && Object.keys(req.body).length > 0) {
            const sanitizedBody = { ...req.body };
            // Remove sensitive fields
            delete sanitizedBody.password;
            requestBody = JSON.stringify(sanitizedBody);
        }
        
        // Determine action from method and endpoint
        const action = determineAction(req.method, req.path);
        
        // Get client IP
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        // Get branch ID from request context
        const branchId = req.currentBranchId || req.body.branchId || req.query.branchId || null;
        
        // Log to database asynchronously (don't block response)
        AuditLog.create({
            userId: user.id || null,
            userPhone: user.phone || null,
            userRole: user.roleName || user.role || null,
            action: action,
            method: req.method,
            endpoint: req.originalUrl,
            requestBody: requestBody,
            responseStatus: res.statusCode,
            responseMessage: data.message || (data.success ? 'Success' : 'Failed'),
            status: status,
            ipAddress: ipAddress,
            userAgent: req.headers['user-agent'],
            duration: duration,
            branchId: branchId
        }).catch(err => {
            console.error('Error creating audit log:', err);
        });
        
        // Call original res.json
        return originalJson(data);
    };
    
    next();
};

// Determine action type from method and path
function determineAction(method, path) {
    const actions = {
        'POST': {
            '/register': 'REGISTER_USER',
            '/login': 'LOGIN',
            '/products': 'CREATE_PRODUCT',
            '/users': 'CREATE_USER'
        },
        'GET': {
            '/products': 'VIEW_PRODUCTS',
            '/users': 'VIEW_USERS',
        },
        'PUT': {
            '/products': 'UPDATE_PRODUCT',
            '/users': 'UPDATE_USER'
        },
        'PATCH': {
            '/toggle-status': 'TOGGLE_USER_STATUS'
        },
        'DELETE': {
            '/products': 'DELETE_PRODUCT',
            '/users': 'DELETE_USER'
        }
    };
    
    // Check for specific patterns
    if (path.includes('/products/') && method === 'GET') return 'VIEW_PRODUCT_DETAIL';
    if (path.includes('/users/') && method === 'GET') return 'VIEW_USER_DETAIL';
    if (path.includes('/products/') && method === 'PUT') return 'UPDATE_PRODUCT';
    if (path.includes('/users/') && method === 'PUT') return 'UPDATE_USER';
    if (path.includes('/products/') && method === 'DELETE') return 'DELETE_PRODUCT';
    if (path.includes('/users/') && method === 'DELETE') return 'DELETE_USER';
    if (path.includes('/toggle-status')) return 'TOGGLE_USER_STATUS';
    
    // Check for matches in actions object
    if (actions[method]) {
        for (const [pathPattern, action] of Object.entries(actions[method])) {
            if (path.includes(pathPattern)) {
                return action;
            }
        }
    }
    
    // Default action
    return `${method}_${path.replace(/\//g, '_').toUpperCase()}`;
}
