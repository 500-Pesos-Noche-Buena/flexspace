// middleware/antiDdos.js
const { Blocklist } = require('@/api/v1/models');
const { rateLimit } = require('express-rate-limit');

// In-memory tracking for temporary bans
const tempBans = new Map();
const strikeCounter = new Map();

// Attack detection
let serverLoad = { totalRequests: 0, lastReset: Date.now() };
let isUnderAttack = false;
let attackStartTime = null;

// Clean IP Extractor Helper
const extractIp = (req) => {
    const rawIp = req.headers['cf-connecting-ip'] 
        || req.headers['x-forwarded-for']?.split(',')[0].trim() 
        || req.ip 
        || req.socket?.remoteAddress 
        || '127.0.0.1';

    return String(rawIp);
};

// Helper to check if IP is localhost/development
const isLocalhost = (ip) => {
    if (!ip) return false;
    const safeIp = Array.isArray(ip) ? String(ip[0]) : String(ip);
    const localIps = ['::1', '127.0.0.1', '::ffff:127.0.0.1', 'localhost'];
    return localIps.includes(safeIp) || safeIp.startsWith('192.168.') || safeIp.startsWith('10.');
};

const isProduction = process.env.NODE_ENV === 'production';

// Reset counter and check attack status every minute
setInterval(() => {
    const now = Date.now();

    if (isUnderAttack && serverLoad.totalRequests < 400) {
        isUnderAttack = false;
        attackStartTime = null;
        console.log('🟢 [ANTI-DDOS] Attack mode disabled - traffic normalized');
    }

    serverLoad.totalRequests = 0;
    serverLoad.lastReset = now;
}, 60000);

const antiDdos = {
    detectAttack: (req, res, next) => {
        const now = Date.now();

        if (now - serverLoad.lastReset >= 60000) {
            serverLoad.totalRequests = 0;
            serverLoad.lastReset = now;
        }

        serverLoad.totalRequests++;

        if (!isUnderAttack && isProduction && serverLoad.totalRequests > 1200) {
            isUnderAttack = true;
            attackStartTime = now;
            console.log(`🔴 [ANTI-DDOS] ATTACK DETECTED! Total requests: ${serverLoad.totalRequests}/min. Enabling strict mode.`);
        }

        next();
    },

    gatekeeper: async (req, res, next) => {
        const clientIp = extractIp(req);

        if (!isProduction || isLocalhost(clientIp)) {
            return next();
        }

        const isPermanentlyBlocked = await Blocklist.findOne({ ip: clientIp });
        if (isPermanentlyBlocked) {
            return res.status(403).json({
                success: false,
                message: "This IP is permanently banned."
            });
        }

        const tempBan = tempBans.get(clientIp);
        if (tempBan && tempBan.expiresAt > Date.now()) {
            const minutesLeft = Math.ceil((tempBan.expiresAt - Date.now()) / 60000);
            return res.status(429).json({
                success: false,
                message: `Too many requests. Blocked for ${minutesLeft} minute(s).`
            });
        } else if (tempBan) {
            tempBans.delete(clientIp);
        }

        next();
    },

    responseMonitor: (req, res, next) => {
        const clientIp = extractIp(req);

        if (!isProduction || isLocalhost(clientIp)) {
            return next();
        }

        res.on('finish', async () => {
            const monitoredCodes = [500, 502, 503];

            if (monitoredCodes.includes(res.statusCode)) {
                const currentStrikes = (strikeCounter.get(clientIp) || 0) + 1;
                strikeCounter.set(clientIp, currentStrikes);

                console.log(`⚠️ [ANTI-DDOS] Strike ${currentStrikes}/30 for ${clientIp}`);

                if (currentStrikes >= 30) {
                    const banDuration = 5 * 60 * 1000;
                    tempBans.set(clientIp, {
                        expiresAt: Date.now() + banDuration,
                        strikeCount: currentStrikes
                    });
                    strikeCounter.delete(clientIp);

                    console.log(`🚫 [ANTI-DDOS] IP BANNED for 5 minutes: ${clientIp}`);
                }
            }
        });
        next();
    },

    globalLimiter: rateLimit({
        windowMs: 1 * 60 * 1000,
        max: (req) => {
            const clientIp = extractIp(req);
            if (!isProduction || isLocalhost(clientIp)) return 999999;
            return isUnderAttack ? 60 : 200;
        },
        skipSuccessfulRequests: true,
        keyGenerator: (req) => extractIp(req),
        message: {
            success: false,
            message: "Too many requests. Please wait."
        },
        handler: async (req, res, next) => {
            const clientIp = extractIp(req);

            if (!isProduction || isLocalhost(clientIp)) {
                return next();
            }

            const violations = (strikeCounter.get(`rate_${clientIp}`) || 0) + 1;
            strikeCounter.set(`rate_${clientIp}`, violations);

            const banDuration = isUnderAttack ? 2 * 60 * 1000 : 1 * 60 * 1000;
            const violationLimit = isUnderAttack ? 3 : 5;

            if (violations >= violationLimit) {
                tempBans.set(clientIp, {
                    expiresAt: Date.now() + banDuration,
                    reason: 'Rate limit exceeded'
                });
                strikeCounter.delete(`rate_${clientIp}`);

                return res.status(429).json({
                    success: false,
                    message: `Rate limited for ${banDuration / 60000} minute(s).`
                });
            }

            res.status(429).json({
                success: false,
                message: "Too many requests. Please wait."
            });
        }
    }),

    strictLimiter: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: (req) => {
            if (!isProduction) return 999999;
            return 10;
        },
        skipSuccessfulRequests: true,
        keyGenerator: (req) => {
            const email = req.body?.email || req.query?.email || 'unknown';
            const safeIp = extractIp(req);
            return `strict_${email}_${safeIp}`;
        },
        message: {
            success: false,
            message: "Too many attempts. Try again later."
        },
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                message: "Too many attempts. Please try again after 15 minutes."
            });
        }
    }),

    unbanIp: async (ip) => {
        tempBans.delete(ip);
        strikeCounter.delete(ip);
        strikeCounter.delete(`rate_${ip}`);
        await Blocklist.deleteOne({ ip });
        console.log(`✅ [ANTI-DDOS] IP UNBANNED: ${ip}`);
    },

    getStatus: () => ({
        isUnderAttack,
        attackDuration: attackStartTime ? Math.floor((Date.now() - attackStartTime) / 1000) + 's' : null,
        activeIPS: tempBans.size,
        serverLoadLastMinute: serverLoad.totalRequests,
        isProduction: isProduction
    })
};

module.exports = antiDdos;