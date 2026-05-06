// server/src/api/v1/middleware/antiDdos.js

const { Blocklist } = require('@/api/v1/models');
const rateLimit = require('express-rate-limit');

// In-memory tracking for temporary bans
const tempBans = new Map(); // { ip: { expiresAt, strikeCount } }
const strikeCounter = new Map(); // Track strikes before temp ban

// Attack detection
let serverLoad = { totalRequests: 0, lastReset: Date.now() };
let isUnderAttack = false;
let attackStartTime = null;

// Reset counter and check attack status every minute
setInterval(() => {
    const now = Date.now();
    
    // Auto-disable attack mode after 1 minute of normal traffic
    if (isUnderAttack && serverLoad.totalRequests < 800) {
        isUnderAttack = false;
        attackStartTime = null;
        console.log('🟢 [ANTI-DDOS] Attack mode disabled - traffic normalized');
    }
    
    // Reset counter
    serverLoad.totalRequests = 0;
    serverLoad.lastReset = now;
    
}, 60000);

const antiDdos = {
    // Detect attack mode based on total server traffic
    detectAttack: (req, res, next) => {
        const now = Date.now();
        
        // Reset counter if needed
        if (now - serverLoad.lastReset >= 60000) {
            serverLoad.totalRequests = 0;
            serverLoad.lastReset = now;
        }
        
        serverLoad.totalRequests++;
        
        // Detect attack: more than 800 requests in 1 minute from all IPs
        if (!isUnderAttack && serverLoad.totalRequests > 800) {
            isUnderAttack = true;
            attackStartTime = now;
            console.log(`🔴 [ANTI-DDOS] ATTACK DETECTED! Total requests: ${serverLoad.totalRequests}/min. Enabling strict mode.`);
        }
        
        next();
    },

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
                
                console.log(`⚠️ [ANTI-DDOS] Strike ${currentStrikes}/10 for ${clientIp} (${res.statusCode} error)`);
                
                // Temp ban after 10 strikes within window
                if (currentStrikes >= 10) {
                    const banDuration = 5 * 60 * 1000; // 5 minutes temp ban
                    tempBans.set(clientIp, {
                        expiresAt: Date.now() + banDuration,
                        strikeCount: currentStrikes
                    });
                    strikeCounter.delete(clientIp);
                    
                    console.log(`🚫 [ANTI-DDOS] IP TEMPORARILY BANNED for 5 minutes: ${clientIp}`);
                    
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
        max: (req) => {
            // During attack: strict limit (30 requests/min)
            // Normal mode: generous limit (300 requests/min)
            return isUnderAttack ? 30 : 300;
        },
        skip: (req) => {
            // Never skip - always apply limits
            return false;
        },
        skipSuccessfulRequests: true, // Don't count successful requests
        keyGenerator: (req) => {
            // Use forwarded IP if behind proxy
            return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        },
        message: { 
            success: false,
            message: "Too many requests. Please wait a moment before trying again." 
        },
        handler: async (req, res) => {
            const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            
            // Track rate limit violations
            const violations = (strikeCounter.get(`rate_${clientIp}`) || 0) + 1;
            strikeCounter.set(`rate_${clientIp}`, violations);
            
            // During attack: stricter punishment
            const banDuration = isUnderAttack ? 5 * 60 * 1000 : 2 * 60 * 1000; // 5 min during attack, 2 min normally
            const violationLimit = isUnderAttack ? 2 : 3; // 2 violations during attack, 3 normally
            
            // Temp ban after violation limit
            if (violations >= violationLimit) {
                tempBans.set(clientIp, {
                    expiresAt: Date.now() + banDuration,
                    reason: 'Rate limit exceeded multiple times'
                });
                strikeCounter.delete(`rate_${clientIp}`);
                
                console.log(`⏸️ [ANTI-DDOS] IP RATE-LIMITED for ${banDuration / 60000} minutes: ${clientIp} (Attack mode: ${isUnderAttack})`);
                
                return res.status(429).json({ 
                    success: false,
                    message: `Too many requests. You have been temporarily rate-limited for ${banDuration / 60000} minute(s).` 
                });
            }
            
            console.log(`⚠️ [ANTI-DDOS] Rate limit warning for ${clientIp} (violation ${violations}/${violationLimit})`);
            res.status(429).json({ 
                success: false,
                message: "Too many requests. Please wait a moment before trying again." 
            });
        }
    }),
    
    // Strict limiter for critical routes (login, register, etc.)
    strictLimiter: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // Max 10 attempts per 15 minutes
        skipSuccessfulRequests: true,
        keyGenerator: (req) => {
            // Rate limit by email + IP combination
            const email = req.body.email || 'unknown';
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            return `${email}_${ip}`;
        },
        message: { 
            success: false,
            message: "Too many login attempts. Please try again after 15 minutes." 
        },
        handler: (req, res) => {
            res.status(429).json({ 
                success: false,
                message: "Too many login attempts. Please try again after 15 minutes." 
            });
        }
    }),
    
    // Helper to manually unban IP
    unbanIp: async (ip) => {
        tempBans.delete(ip);
        strikeCounter.delete(ip);
        strikeCounter.delete(`rate_${ip}`);
        await Blocklist.deleteOne({ ip });
        console.log(`✅ [ANTI-DDOS] IP UNBANNED: ${ip}`);
    },
    
    // Helper to get current status
    getStatus: () => ({
        isUnderAttack,
        attackStartTime,
        attackDuration: attackStartTime ? Math.floor((Date.now() - attackStartTime) / 1000) + 's' : null,
        activeIPS: tempBans.size,
        serverLoadLastMinute: serverLoad.totalRequests
    })
};

module.exports = antiDdos;