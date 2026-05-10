const { ActivityLog } = require('@/api/v1/models');

const autoLogger = (req, res, next) => {
    // Capture user from req.user (set by auth middleware)
    let capturedUser = null;
    
    if (req.user) {
        capturedUser = {
            _id: req.user._id || req.user.id,
            name: req.user.name,
            email: req.user.email
        };
    }
    
    // For debugging
    console.log('🔍 [AutoLogger] Request:', {
        path: req.path,
        method: req.method,
        hasUser: !!req.user,
        userData: capturedUser
    });
    
    const originalEnd = res.end;
    const originalJson = res.json;
    
    let responseBody = null;
    
    res.json = function(body) {
        responseBody = body;
        return originalJson.call(this, body);
    };
    
    res.end = function(chunk, encoding) {
        const isLogin = req.path.includes('/login') && req.method === 'POST';
        const isRegister = req.path.includes('/register') && req.method === 'POST';
        const isLogout = req.path.includes('/logout') && req.method === 'POST';
        
        if (isLogin || isRegister || isLogout) {
            const success = responseBody?.success === true || res.statusCode === 200;
            
            let type = '';
            let description = '';
            let userId = null;
            let userName = null;
            let userEmail = null;
            
            if (isLogin) {
                type = 'user_login';
                // For login, get user from response or request
                if (responseBody?.user) {
                    userId = responseBody.user._id || responseBody.user.id;
                    userName = responseBody.user.name;
                    userEmail = responseBody.user.email;
                } else if (req.user) {
                    userId = req.user._id || req.user.id;
                    userName = req.user.name;
                    userEmail = req.user.email;
                }
                description = `${userName || userEmail || req.body?.email} logged in`;
            }
            else if (isRegister) {
                type = 'user_register';
                // For register, get user from response
                if (responseBody?.user) {
                    userId = responseBody.user._id || responseBody.user.id;
                    userName = responseBody.user.name;
                    userEmail = responseBody.user.email;
                } else {
                    userName = req.body?.name;
                    userEmail = req.body?.email;
                }
                description = `New user registered: ${userName || userEmail}`;
            }
            else if (isLogout) {
                type = 'user_logout';
                // For logout, use captured user from req.user (set by auth middleware)
                if (capturedUser) {
                    userId = capturedUser._id;
                    userName = capturedUser.name;
                    userEmail = capturedUser.email;
                } else if (req.user) {
                    userId = req.user._id || req.user.id;
                    userName = req.user.name;
                    userEmail = req.user.email;
                }
                description = `${userName || userEmail || 'User'} logged out`;
            }
            
            if (type) {
                console.log('📝 [AutoLogger] Creating log:', { 
                    type, 
                    description, 
                    userId, 
                    userName, 
                    userEmail 
                });
                
                ActivityLog.create({
                    type,
                    description,
                    status: success ? 'success' : 'failed',
                    userId: userId,
                    userName: userName,
                    userEmail: userEmail,
                    ipAddress: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress,
                    userAgent: req.headers['user-agent'],
                    details: success ? null : { error: responseBody?.message }
                }).catch(err => console.error('Failed to create log:', err));
            }
        }
        
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

module.exports = autoLogger;