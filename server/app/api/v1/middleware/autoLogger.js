const { ActivityLog } = require('@/api/v1/models');

const extractIp = (req) => {
    return String(
        req.headers['cf-connecting-ip'] || 
        req.headers['x-forwarded-for']?.split(',')[0].trim() || 
        req.ip || 
        req.socket?.remoteAddress || 
        '127.0.0.1'
    );
};

const autoLogger = (req, res, next) => {
    let capturedUser = null;
    
    if (req.user) {
        capturedUser = {
            _id: req.user._id || req.user.id,
            name: req.user.name,
            email: req.user.email
        };
    }
    
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
                ActivityLog.create({
                    type,
                    description,
                    status: success ? 'success' : 'failed',
                    userId: userId,
                    userName: userName,
                    userEmail: userEmail,
                    ipAddress: extractIp(req),
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