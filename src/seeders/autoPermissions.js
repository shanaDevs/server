const { Permission, Role, User } = require('../models');
const fs = require('fs');
const path = require('path');

/**
 * Scan route files and extract API endpoints
 */
const scanRouteFiles = (dir, basePath = '') => {
    const routes = [];
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Recursively scan subdirectories
            routes.push(...scanRouteFiles(filePath, basePath));
        } else if (file.endsWith('Routes.js') || file.endsWith('Router.js') || file.endsWith('Route.js') || file === 'index.js') {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const routeInfo = extractRoutesFromFile(content, file);
                routes.push(...routeInfo);
            } catch (error) {
                console.error(`Error reading file ${filePath}:`, error.message);
            }
        }
    });

    return routes;
};

/**
 * Extract route information from file content
 */
const extractRoutesFromFile = (content, filename) => {
    const routes = [];
    
    // Extract module name from filename
    const moduleName = filename
        .replace('Routes.js', '')
        .replace('Router.js', '')
        .replace('Route.js', '')
        .replace('index.js', '')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
        .replace(/_+/g, '_')  // Replace multiple underscores with single
        .replace(/_$/, '');    // Remove trailing underscore

    // Regex patterns to match route definitions
    const routePatterns = [
        /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\.(get|post|put|delete|patch)/g
    ];

    routePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const method = match[1] || match[2];
            const endpoint = match[2] || match[1];
            
            // Skip generic endpoints
            if (endpoint === '/' || endpoint === '') continue;

            const action = determineAction(method, endpoint);
            
            routes.push({
                module: moduleName,
                method: method.toUpperCase(),
                endpoint: endpoint,
                action: action
            });
        }
    });

    return routes;
};

/**
 * Determine action based on HTTP method and endpoint
 */
const determineAction = (method, endpoint) => {
    method = method.toLowerCase();
    
    // Special endpoints mapping
    if (endpoint.includes('/approve')) return 'approve';
    if (endpoint.includes('/cancel')) return 'cancel';
    if (endpoint.includes('/export')) return 'export';
    if (endpoint.includes('/import')) return 'import';
    if (endpoint.includes('/bulk')) return 'bulk_operation';
    if (endpoint.includes('/search')) return 'search';
    if (endpoint.includes('/stats') || endpoint.includes('/statistics')) return 'view_stats';
    if (endpoint.includes('/report')) return 'view_reports';
    if (endpoint.includes('/restore')) return 'restore';
    
    // Standard CRUD mapping
    switch (method) {
        case 'get':
            return endpoint.includes('/:id') || endpoint.includes('/:') ? 'view' : 'list';
        case 'post':
            return 'create';
        case 'put':
        case 'patch':
            return 'update';
        case 'delete':
            return 'delete';
        default:
            return 'access';
    }
};

/**
 * Auto-generate permissions from route files
 */
const autoGeneratePermissions = async () => {
    try {
        console.log('🔐 Auto-generating permissions from route files...');

        const routesDir = path.join(__dirname, '../routes');
        const scannedRoutes = scanRouteFiles(routesDir);

        // Group routes by module
        const moduleMap = new Map();
        
        scannedRoutes.forEach(route => {
            if (!moduleMap.has(route.module)) {
                moduleMap.set(route.module, new Set());
            }
            moduleMap.get(route.module).add(route.action);
        });

        const permissions = [];

        // Map actions to HTTP methods
        const actionToMethod = {
            'list': 'GET',
            'view': 'GET',
            'view_stats': 'GET',
            'view_reports': 'GET',
            'search': 'GET',
            'create': 'POST',
            'update': 'PUT',
            'delete': 'DELETE',
            'approve': 'POST',
            'cancel': 'POST',
            'export': 'GET',
            'import': 'POST',
            'bulk_operation': 'POST',
            'restore': 'POST',
            'access': 'GET'
        };

        // Generate permissions for each module and action
        moduleMap.forEach((actions, moduleName) => {
            actions.forEach(action => {
                const permName = `${action}_${moduleName}`;
                const httpMethod = actionToMethod[action] || 'GET';
                const displayName = moduleName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                
                permissions.push({
                    name: permName,
                    action: httpMethod,
                    description: `Permission to ${action.replace(/_/g, ' ')} ${displayName.toLowerCase()}`,
                    module: moduleName,
                    isActive: true
                });
            });
        });

        // Add additional custom permissions not captured by routes
        const customPermissions = [
            { name: 'access_dashboard', action: 'GET', description: 'Permission to access dashboard', module: 'dashboard', isActive: true },
            { name: 'manage_system_settings', action: 'PUT', description: 'Permission to manage system settings', module: 'system', isActive: true },
            { name: 'view_all_reports', action: 'GET', description: 'Permission to view all reports', module: 'reports', isActive: true },
            { name: 'access_all_branches', action: 'GET', description: 'Permission to access data from all branches', module: 'branches', isActive: true },
            { name: 'manage_branches', action: 'POST', description: 'Permission to create, update, and delete branches', module: 'branches', isActive: true },
            { name: 'assign_user_branches', action: 'POST', description: 'Permission to assign users to branches', module: 'branches', isActive: true },
            { name: 'view_branch_reports', action: 'GET', description: 'Permission to view branch-specific reports', module: 'branches', isActive: true }
        ];

        permissions.push(...customPermissions);

        // Bulk create or update permissions
        let createdCount = 0;
        let updatedCount = 0;

        for (const perm of permissions) {
            const [permission, created] = await Permission.findOrCreate({
                where: { name: perm.name },
                defaults: perm
            });

            if (created) {
                createdCount++;
            } else {
                // Update existing permission
                await permission.update({
                    action: perm.action,
                    description: perm.description,
                    module: perm.module,
                    isActive: perm.isActive
                });
                updatedCount++;
            }
        }

        console.log(`✅ Permissions: ${createdCount} created, ${updatedCount} updated (Total: ${permissions.length})`);
        console.log(`📊 Modules scanned: ${moduleMap.size}`);

        // Assign ALL permissions to super_admin role users
        const superAdminRole = await Role.findOne({ where: { name: 'super_admin' } });
        
        if (superAdminRole) {
            const superAdmins = await User.findAll({ where: { roleId: superAdminRole.id } });
            const allPermissions = await Permission.findAll({ where: { isActive: true } });
            const permissionIds = allPermissions.map(p => p.id);
            
            for (const admin of superAdmins) {
                // Clear existing permissions and assign all
                await admin.setPermissions(permissionIds);
            }
            
            console.log(`✅ Assigned all ${permissionIds.length} permissions to ${superAdmins.length} super admin(s)`);
        }

        return { success: true, count: permissions.length, modules: moduleMap.size };
    } catch (error) {
        console.error('❌ Error auto-generating permissions:', error);
        throw error;
    }
};

module.exports = { autoGeneratePermissions };
