const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * TSOA Authentication Handler
 * This function is called by TSOA for routes that require authentication
 * @param {string} securityName - The name of the security scheme (e.g., 'bearerAuth')
 * @param {string[]} scopes - Required scopes/permissions
 * @param {import('express').Request} request - Express request object
 */
async function expressAuthentication(request, securityName, scopes) {
    if (securityName === 'bearerAuth') {
        const token = request.headers.authorization?.split(' ')[1];

        if (!token) {
            return Promise.reject(new Error('No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Fetch user from database
            const user = await User.findByPk(decoded.userId, {
                attributes: { exclude: ['password'] }
            });

            if (!user) {
                return Promise.reject(new Error('User not found'));
            }

            // Attach user to request for use in controllers
            request.user = {
                userId: user.userId,
                username: user.username,
                email: user.email,
                roleId: user.roleId,
                branchId: user.branchId,
                companyId: user.companyId
            };

            // Check scopes/permissions if required
            if (scopes && scopes.length > 0) {
                // TODO: Implement permission checking logic here
                // For now, we'll allow all authenticated users
                console.log('Required scopes:', scopes);
            }

            return Promise.resolve(request.user);
        } catch (error) {
            return Promise.reject(new Error('Invalid or expired token'));
        }
    }

    return Promise.reject(new Error('Unknown security scheme'));
}

module.exports = { expressAuthentication };
