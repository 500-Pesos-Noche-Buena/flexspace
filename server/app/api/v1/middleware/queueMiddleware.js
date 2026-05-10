const jwt = require('jsonwebtoken');
const config = require('@/config/config');

/**
 * Queue Dashboard Auth Middleware
 * Supports both Authorization header AND URL query parameter (?token=xxx)
 * This allows the Bull Dashboard's API calls to authenticate properly
 */
const queueAuthMiddleware = (req, res, next) => {
    try {
        let token = null;
        
        // Try to get token from Authorization header first
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        
        // If no header token, try query parameter (for Bull Board API calls)
        if (!token && req.query.token) {
            token = req.query.token;
            console.log('📊 Queue Dashboard: Using token from query parameter');
        }
        
        // If still no token, reject
        if (!token) {
            console.error('❌ Queue Dashboard: No token provided');
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized. Admin access required.' 
            });
        }

        // Verify JWT
        const decoded = jwt.verify(token, config.jwt.secret);
        
        // Check if user has admin role
        const userRole = decoded.role || decoded.userRole;
        const isAdmin = userRole === 'admin' || userRole === 'super_admin' || decoded.isAdmin === true;
        
        if (!isAdmin) {
            console.error(`❌ Queue Dashboard: Access denied for role: ${userRole}`);
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden. Admin access required.' 
            });
        }
        
        // Attach user info to request
        req.user = decoded;
        console.log(`✅ Queue Dashboard: Access granted for ${decoded.email || decoded.id} (${userRole})`);
        
        next();
    } catch (error) {
        console.error('❌ Queue Dashboard JWT Verification Failed:', error.message);
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
};

module.exports = queueAuthMiddleware;