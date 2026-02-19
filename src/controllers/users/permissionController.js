const { Permission, UserPermission, User } = require('../../models');
const { validationResult } = require('express-validator');
const { autoGeneratePermissions } = require('../../seeders/autoPermissions');

// Get all permissions
exports.getAllPermissions = async (req, res, next) => {
    try {
        const { module, isActive } = req.query;
        const where = {};
        
        if (module) where.module = module;
        if (isActive !== undefined) where.isActive = isActive === 'true';
        
        const permissions = await Permission.findAll({
            where,
            order: [['module', 'ASC'], ['name', 'ASC']]
        });
        
        // Group by module
        const groupedPermissions = permissions.reduce((acc, perm) => {
            if (!acc[perm.module]) {
                acc[perm.module] = [];
            }
            acc[perm.module].push(perm);
            return acc;
        }, {});
        
        res.json({
            success: true,
            data: groupedPermissions
        });
    } catch (error) {
        next(error);
    }
};

// Create new permission (super_admin only)
exports.createPermission = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const permission = await Permission.create(req.body);
        
        res.status(201).json({
            success: true,
            message: 'Permission created successfully',
            data: permission
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'Permission name already exists'
            });
        }
        next(error);
    }
};

// Get user's permissions
exports.getUserPermissions = async (req, res, next) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findByPk(userId, {
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: ['grantedBy', 'grantedAt'] }
            }],
            attributes: { exclude: ['password'] }
        });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    phone: user.phone,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role
                },
                permissions: user.permissions
            }
        });
    } catch (error) {
        next(error);
    }
};

// Grant permissions to user
exports.grantPermissions = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { permissionIds } = req.body;
        const grantedBy = req.user.id; // Admin/super_admin granting the permission
        
        if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'permissionIds must be a non-empty array'
            });
        }
        
        // Check if user exists
        const user = await User.findByPk(userId);
        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Verify all permissions exist
        const permissions = await Permission.findAll({
            where: { id: permissionIds, isActive: true }
        });
        
        if (permissions.length !== permissionIds.length) {
            return res.status(400).json({
                success: false,
                message: 'One or more invalid permission IDs'
            });
        }
        
        // 🔹 AUTO-ADD DEPENDENT PERMISSIONS
        const finalPermissionIds = new Set(permissionIds);
        
        // Get all available permissions for dependency lookup
        const allPermissions = await Permission.findAll({
            where: { isActive: true }
        });
        
        // Create a map for quick lookup
        const permissionMap = new Map();
        allPermissions.forEach(p => {
            permissionMap.set(p.name, p.id);
        });
        
        // Define permission dependencies
        const permissionDependencies = {
            // If granted create/edit/delete, auto-add view for same module
            'create_products': ['view_products'],
            'edit_products': ['view_products'],
            'delete_products': ['view_products'],
            
            'create_sales': ['view_sales', 'view_products'], // Sales needs to view products
            'void_sales': ['view_sales'],
            'refund_sales': ['view_sales'],
            
            'create_customers': ['view_customers'],
            'edit_customers': ['view_customers'],
            'delete_customers': ['view_customers'],
            
            'create_users': ['view_users'],
            'edit_users': ['view_users'],
            'delete_users': ['view_users'],
            'manage_permissions': ['view_users'],
            
            'adjust_inventory': ['view_inventory', 'view_products'],
            'transfer_inventory': ['view_inventory', 'view_products'],
            
            'edit_settings': ['view_settings'],
            'export_reports': ['view_reports'],
            
            'create_purchase_orders': ['view_purchase_orders', 'view_products', 'view_suppliers'],
            'edit_purchase_orders': ['view_purchase_orders', 'view_products'],
            'delete_purchase_orders': ['view_purchase_orders'],
            
            'create_grn': ['view_grn', 'view_products', 'view_suppliers'],
            'edit_grn': ['view_grn', 'view_products'],
            'delete_grn': ['view_grn'],
            
            'create_suppliers': ['view_suppliers'],
            'edit_suppliers': ['view_suppliers'],
            'delete_suppliers': ['view_suppliers'],
        };
        
        // Add dependent permissions
        permissions.forEach(permission => {
            const dependencies = permissionDependencies[permission.name];
            if (dependencies) {
                dependencies.forEach(depName => {
                    const depId = permissionMap.get(depName);
                    if (depId) {
                        finalPermissionIds.add(depId);
                    }
                });
            }
        });
        
        // Grant permissions (including auto-added ones)
        const userPermissions = Array.from(finalPermissionIds).map(permId => ({
            userId: userId,
            permissionId: permId,
            grantedBy: grantedBy,
            grantedAt: new Date()
        }));
        
        await UserPermission.bulkCreate(userPermissions, {
            ignoreDuplicates: true // Skip if already granted
        });
        
        // Fetch updated permissions
        const updatedUser = await User.findByPk(userId, {
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: ['grantedBy', 'grantedAt'] }
            }]
        });
        
        const addedCount = finalPermissionIds.size - permissionIds.length;
        const message = addedCount > 0 
            ? `Permissions granted successfully (${addedCount} dependent permission(s) auto-added)`
            : 'Permissions granted successfully';
        
        res.json({
            success: true,
            message,
            data: updatedUser.permissions,
            autoAdded: addedCount
        });
    } catch (error) {
        next(error);
    }
};

// Revoke permissions from user
exports.revokePermissions = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { permissionIds } = req.body;
        
        if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'permissionIds must be a non-empty array'
            });
        }
        
        const deleted = await UserPermission.destroy({
            where: {
                userId: userId,
                permissionId: permissionIds
            }
        });
        
        res.json({
            success: true,
            message: `${deleted} permission(s) revoked successfully`
        });
    } catch (error) {
        next(error);
    }
};

// Sync user permissions (replace all)
exports.syncUserPermissions = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { permissionIds } = req.body;
        const grantedBy = req.user.id;
        
        if (!Array.isArray(permissionIds)) {
            return res.status(400).json({
                success: false,
                message: 'permissionIds must be an array'
            });
        }
        
        // Check if user exists
        const user = await User.findByPk(userId);
        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // 🔹 AUTO-ADD DEPENDENT PERMISSIONS
        const finalPermissionIds = new Set(permissionIds);
        
        if (permissionIds.length > 0) {
            // Get all available permissions for dependency lookup
            const allPermissions = await Permission.findAll({
                where: { isActive: true }
            });
            
            // Get the actual permission objects for the requested IDs
            const requestedPermissions = await Permission.findAll({
                where: { id: permissionIds, isActive: true }
            });
            
            // Create a map for quick lookup
            const permissionMap = new Map();
            allPermissions.forEach(p => {
                permissionMap.set(p.name, p.id);
            });
            
            // Define permission dependencies (same as grantPermissions)
            const permissionDependencies = {
                'create_products': ['view_products'],
                'edit_products': ['view_products'],
                'delete_products': ['view_products'],
                
                'create_sales': ['view_sales', 'view_products'],
                'void_sales': ['view_sales'],
                'refund_sales': ['view_sales'],
                
                'create_customers': ['view_customers'],
                'edit_customers': ['view_customers'],
                'delete_customers': ['view_customers'],
                
                'create_users': ['view_users'],
                'edit_users': ['view_users'],
                'delete_users': ['view_users'],
                'manage_permissions': ['view_users'],
                
                'adjust_inventory': ['view_inventory', 'view_products'],
                'transfer_inventory': ['view_inventory', 'view_products'],
                
                'edit_settings': ['view_settings'],
                'export_reports': ['view_reports'],
                
                'create_purchase_orders': ['view_purchase_orders', 'view_products', 'view_suppliers'],
                'edit_purchase_orders': ['view_purchase_orders', 'view_products'],
                'delete_purchase_orders': ['view_purchase_orders'],
                
                'create_grn': ['view_grn', 'view_products', 'view_suppliers'],
                'edit_grn': ['view_grn', 'view_products'],
                'delete_grn': ['view_grn'],
                
                'create_suppliers': ['view_suppliers'],
                'edit_suppliers': ['view_suppliers'],
                'delete_suppliers': ['view_suppliers'],
            };
            
            // Add dependent permissions
            requestedPermissions.forEach(permission => {
                const dependencies = permissionDependencies[permission.name];
                if (dependencies) {
                    dependencies.forEach(depName => {
                        const depId = permissionMap.get(depName);
                        if (depId) {
                            finalPermissionIds.add(depId);
                        }
                    });
                }
            });
        }
        
        // Remove all existing permissions
        await UserPermission.destroy({ where: { userId } });
        
        // Add new permissions if any (including auto-added ones)
        if (finalPermissionIds.size > 0) {
            const userPermissions = Array.from(finalPermissionIds).map(permId => ({
                userId: userId,
                permissionId: permId,
                grantedBy: grantedBy,
                grantedAt: new Date()
            }));
            
            await UserPermission.bulkCreate(userPermissions);
        }
        
        // Fetch updated permissions
        const updatedUser = await User.findByPk(userId, {
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: ['grantedBy', 'grantedAt'] }
            }]
        });
        
        const addedCount = finalPermissionIds.size - permissionIds.length;
        const message = addedCount > 0 
            ? `User permissions synchronized successfully (${addedCount} dependent permission(s) auto-added)`
            : 'User permissions synchronized successfully';
        
        res.json({
            success: true,
            message,
            data: updatedUser.permissions,
            autoAdded: addedCount
        });
    } catch (error) {
        next(error);
    }
};

// Seed default permissions
exports.seedPermissions = async (req, res, next) => {
    try {
        const defaultPermissions = [
            // Products
            { name: 'view_products', action: 'GET', description: 'View product list and details', module: 'products' },
            { name: 'create_products', action: 'POST', description: 'Add new products', module: 'products' },
            { name: 'edit_products', action: 'PUT', description: 'Modify existing products', module: 'products' },
            { name: 'delete_products', action: 'DELETE', description: 'Remove products', module: 'products' },
            
            // Sales
            { name: 'view_sales', action: 'GET', description: 'View sales transactions', module: 'sales' },
            { name: 'create_sales', action: 'POST', description: 'Process new sales', module: 'sales' },
            { name: 'void_sales', action: 'DELETE', description: 'Cancel/void sales transactions', module: 'sales' },
            { name: 'refund_sales', action: 'POST', description: 'Process refunds', module: 'sales' },
            
            // Inventory
            { name: 'view_inventory', action: 'GET', description: 'View inventory levels', module: 'inventory' },
            { name: 'adjust_inventory', action: 'PUT', description: 'Modify inventory quantities', module: 'inventory' },
            { name: 'transfer_inventory', action: 'POST', description: 'Transfer stock between locations', module: 'inventory' },
            
            // Users
            { name: 'view_users', action: 'GET', description: 'View user list and details', module: 'users' },
            { name: 'create_users', action: 'POST', description: 'Add new users', module: 'users' },
            { name: 'edit_users', action: 'PUT', description: 'Modify user details', module: 'users' },
            { name: 'delete_users', action: 'DELETE', description: 'Remove users', module: 'users' },
            { name: 'manage_permissions', action: 'POST', description: 'Grant/revoke user permissions', module: 'users' },
            
            // Reports
            { name: 'view_reports', action: 'GET', description: 'Access reports and analytics', module: 'reports' },
            { name: 'export_reports', action: 'GET', description: 'Download/export reports', module: 'reports' },
            
            // Settings
            { name: 'view_settings', action: 'GET', description: 'View system settings', module: 'settings' },
            { name: 'edit_settings', action: 'PUT', description: 'Modify system settings', module: 'settings' },
            
            // Customers
            { name: 'view_customers', action: 'GET', description: 'View customer information', module: 'customers' },
            { name: 'create_customers', action: 'POST', description: 'Add new customers', module: 'customers' },
            { name: 'edit_customers', action: 'PUT', description: 'Modify customer details', module: 'customers' },
            { name: 'delete_customers', action: 'DELETE', description: 'Remove customers', module: 'customers' }
        ];
        
        await Permission.bulkCreate(defaultPermissions, {
            ignoreDuplicates: true
        });
        
        const allPermissions = await Permission.findAll({
            order: [['module', 'ASC'], ['displayName', 'ASC']]
        });
        
        res.json({
            success: true,
            message: `${defaultPermissions.length} default permissions seeded`,
            data: allPermissions
        });
    } catch (error) {
        next(error);
    }
};

// Auto-generate permissions from route files
exports.autoGenerate = async (req, res, next) => {
    try {
        const result = await autoGeneratePermissions();
        
        const allPermissions = await Permission.findAll({
            order: [['module', 'ASC'], ['displayName', 'ASC']]
        });
        
        // Group by module for easier display
        const groupedPermissions = allPermissions.reduce((acc, perm) => {
            if (!acc[perm.module]) {
                acc[perm.module] = [];
            }
            acc[perm.module].push(perm);
            return acc;
        }, {});
        
        res.json({
            success: true,
            message: `Auto-generated ${result.count} permissions from ${result.modules} modules`,
            data: groupedPermissions
        });
    } catch (error) {
        next(error);
    }
};

