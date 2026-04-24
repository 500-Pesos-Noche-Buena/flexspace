const { Blocklist } = require('@/api/v1/models');

const rateLimit = require('express-rate-limit');

const strikeCounter = {}; 

const antiDdos = {
    gatekeeper: async (req, res, next) => {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const isBlocked = await Blocklist.findOne({ ip: clientIp });

        if (isBlocked) {
            return res.status(403).json({ 
                success: false, 
                message: "This IP is permanently banned from FlexSpace for malicious activity." 
            });
        }
        next();
    },

    responseMonitor: (req, res, next) => {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        res.on('finish', async () => {
            const badCodes = [400, 401, 403, 404, 500];
            
            if (badCodes.includes(res.statusCode)) {
                strikeCounter[clientIp] = (strikeCounter[clientIp] || 0) + 1;

                if (strikeCounter[clientIp] >= 20) {
                    await Blocklist.create({
                        ip: clientIp,
                        reason: `Suspicious activity: Excessive ${res.statusCode} responses.`,
                        attack_vector: 'ERROR_CODE_SPAM'
                    }).catch(() => {});
                    
                    delete strikeCounter[clientIp];
                    console.log(`🚫 IP PERMANENTLY BANNED: ${clientIp}`);
                }
            }
        });
        next();
    },

    globalLimiter: rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 100,
        handler: async (req, res) => {
            const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            
            await Blocklist.create({
                ip: clientIp,
                reason: "Request flooding (DDOS)",
                attack_vector: 'RATE_LIMIT_EXCEEDED'
            }).catch(() => {});

            res.status(429).json({ message: "DDOS detected. IP Permanently banned." });
        }
    })
};

module.exports = antiDdos;