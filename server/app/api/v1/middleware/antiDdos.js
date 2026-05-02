const { Blocklist } = require('@/api/v1/models');
const rateLimit = require('express-rate-limit');

// In-memory tracking for temporary bans
const tempBans = new Map(); // { ip: { expiresAt, strikeCount } }
const strikeCounter = new Map(); // Track strikes before temp ban

const antiDdos = {
    gatekeeper: async (req, res, next) => {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        // Check permanent ban
        const isPermanentlyBlocked = await Blocklist.findOne({ ip: clientIp });
        if (isPermanentlyBlocked) {
            return res.status(403).json({ 
                success: false, 
                message: "This IP is permanently banned from FlexSpace. Contact support." 
            });
        }
        
        // Check temporary ban
        const tempBan = tempBans.get(clientIp);
        if (tempBan && tempBan.expiresAt > Date.now()) {
            const minutesLeft = Math.ceil((tempBan.expiresAt - Date.now()) / 60000);
            return res.status(429).json({ 
                success: false, 
                message: `Too many requests. You are temporarily blocked for ${minutesLeft} minute(s). Please slow down.` 
            });
        } else if (tempBan) {
            tempBans.delete(clientIp); // Clean up expired ban
        }
        
        next();
    },

    responseMonitor: (req, res, next) => {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        res.on('finish', async () => {
            // Only monitor server errors (500) not client errors (400, 404)
            const monitoredCodes = [500, 502, 503];
            
            if (monitoredCodes.includes(res.statusCode)) {
                const currentStrikes = (strikeCounter.get(clientIp) || 0) + 1;
                strikeCounter.set(clientIp, currentStrikes);
                
                console.log(`⚠️ Strike ${currentStrikes}/10 for ${clientIp} (${res.statusCode} error)`);
                
                // Temp ban after 10 strikes within window
                if (currentStrikes >= 10) {
                    const banDuration = 5 * 60 * 1000; // 5 minutes temp ban
                    tempBans.set(clientIp, {
                        expiresAt: Date.now() + banDuration,
                        strikeCount: currentStrikes
                    });
                    strikeCounter.delete(clientIp);
                    
                    console.log(`🚫 IP TEMPORARILY BANNED for 5 minutes: ${clientIp}`);
                    
                    // Optional: Log to database for monitoring
                    await Blocklist.create({
                        ip: clientIp,
                        reason: `Temporary ban: Excessive server errors (${currentStrikes} strikes)`,
                        attack_vector: 'ERROR_SPAM',
                        blocked_at: new Date(),
                        expires_at: new Date(Date.now() + banDuration)
                    }).catch(() => {});
                }
            }
        });
        next();
    },

    globalLimiter: rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 150, // Increased from 100 to 150
        message: { message: "Too many requests. Please wait a moment before trying again." },
        skipSuccessfulRequests: true, // Don't count successful requests
        handler: async (req, res) => {
            const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            
            // Track rate limit violations
            const violations = (strikeCounter.get(`rate_${clientIp}`) || 0) + 1;
            strikeCounter.set(`rate_${clientIp}`, violations);
            
            // Temp ban after 3 rate limit violations
            if (violations >= 3) {
                const banDuration = 2 * 60 * 1000; // 2 minutes temp ban
                tempBans.set(clientIp, {
                    expiresAt: Date.now() + banDuration,
                    reason: 'Rate limit exceeded multiple times'
                });
                strikeCounter.delete(`rate_${clientIp}`);
                
                console.log(`⏸️ IP TEMPORARILY RATE-LIMITED for 2 minutes: ${clientIp}`);
                
                return res.status(429).json({ 
                    message: `Too many requests. You have been temporarily rate-limited for 2 minutes.` 
                });
            }
            
            console.log(`⚠️ Rate limit warning for ${clientIp} (violation ${violations}/3)`);
            res.status(429).json({ 
                message: "Too many requests. Please wait a moment before trying again." 
            });
        }
    }),
    
    // Helper to manually unban IP
    unbanIp: async (ip) => {
        tempBans.delete(ip);
        strikeCounter.delete(ip);
        strikeCounter.delete(`rate_${ip}`);
        await Blocklist.deleteOne({ ip });
        console.log(`✅ IP UNBANNED: ${ip}`);
    }
};

module.exports = antiDdos;