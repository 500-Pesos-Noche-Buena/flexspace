#!/usr/bin/env node

const http = require('http');

const BLOG_API_KEY = process.env.BLOG_API_KEY || 'flexspace-secret-key';
const PORT = process.env.PORT || 5000;

async function generateBlogs() {
    console.log(`[${new Date().toISOString()}] 🔄 Running weekly blog generation...`);

    const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/api/v1/blogs/generate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': BLOG_API_KEY
        },
        timeout: 120000
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                if (result.success) {
                    console.log(`[${new Date().toISOString()}] ✅ Blog generation completed: ${result.count || 0} blogs generated`);
                } else {
                    console.log(`[${new Date().toISOString()}] ⚠️ Blog generation: ${result.message}`);
                }
            } catch (e) {
                console.log(`[${new Date().toISOString()}] 📝 Blog generation response received`);
            }
        });
    });

    req.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] ❌ Blog generation failed:`, error.message);
    });

    req.on('timeout', () => {
        console.error(`[${new Date().toISOString()}] ⏰ Blog generation timeout`);
        req.destroy();
    });

    req.end();
}

// Run once on startup (after 15 seconds)
setTimeout(() => {
    console.log('[CRON] Running initial blog generation...');
    generateBlogs();
}, 15000);

console.log('[CRON] Blog generator cron job started');
console.log('[CRON] Schedule: Every Monday at 9:00 AM Manila time');