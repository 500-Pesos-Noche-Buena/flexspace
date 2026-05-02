const express = require('express');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const spaceRoutes = require('./spaceRoutes');
const landingRoutes = require('./landingRoutes');
const userRoutes = require('./userRoutes');
const { Analytics } = require('@/api/v1/models');
const emailController = require('@/api/v1/controllers/emailController');
const chatController = require('@/api/v1/controllers/chatController');

class ApiRouter {
    constructor() {
        this.router = express.Router();
        this.mountRoutes();
    }

    mountRoutes() {
        console.log('--- 🚀 Mounting API v1 Routes ---');

        this.router.post('/analytics/track', async (req, res) => {
            try {
                const { path, deviceType, browser, os } = req.body;
                const period = '7d';
                const today = new Date().toISOString().split('T')[0];

                let analytics = await Analytics.findOne({ period });

                const updateMetric = (array, keyName, keyValue) => {
                    if (!keyValue) return;
                    const item = array.find(i => i[keyName] === keyValue);
                    if (item) {
                        item.visitors = (item.visitors || 0) + 1;
                    } else {
                        const newItem = { visitors: 1, percentage: 0 };
                        newItem[keyName] = keyValue;
                        array.push(newItem);
                    }
                };

                if (!analytics) {
                    analytics = new Analytics({
                        period,
                        visitors: 1,
                        pageViews: 1,
                        topPages: [{ path, views: 1, visitors: 1 }],
                        devices: [{ type: deviceType, visitors: 1, percentage: 100 }],
                        browsers: [{ name: browser, visitors: 1, percentage: 100 }],
                        os: [{ name: os, visitors: 1, percentage: 100 }],
                        dailyStats: [{ date: today, visitors: 1, pageViews: 1 }]
                    });
                } else {
                    analytics.pageViews += 1;
                    if (analytics.pageViews % 10 === 0) analytics.visitors += 1;

                    updateMetric(analytics.devices, 'type', deviceType);
                    updateMetric(analytics.browsers, 'name', browser);
                    updateMetric(analytics.os, 'name', os);

                    const totalVisitors = analytics.visitors || 1;
                    analytics.devices.forEach(d => d.percentage = Math.round((d.visitors / totalVisitors) * 100));
                    analytics.browsers.forEach(b => b.percentage = Math.round((b.visitors / totalVisitors) * 100));
                    analytics.os.forEach(o => o.percentage = Math.round((o.visitors / totalVisitors) * 100));

                    const page = analytics.topPages.find(p => p.path === path);
                    if (page) {
                        page.views += 1;
                    } else {
                        analytics.topPages.push({ path, views: 1, visitors: 1 });
                    }
                    analytics.topPages.sort((a, b) => b.views - a.views);
                    analytics.topPages = analytics.topPages.slice(0, 10);

                    const day = analytics.dailyStats.find(d => d.date === today);
                    if (day) {
                        day.pageViews += 1;
                        if (analytics.pageViews % 10 === 0) day.visitors += 1;
                    } else {
                        analytics.dailyStats.push({ date: today, visitors: 1, pageViews: 1 });
                    }
                    analytics.dailyStats = analytics.dailyStats.slice(-30); // Keep last 30 days

                    analytics.updatedAt = new Date();
                }

                await analytics.save();
                res.json({ success: true });
            } catch (error) {
                console.error('Track Error:', error);
                res.status(500).json({ success: false });
            }
        });

        this.router.use('/auth', authRoutes);
        this.router.use('/landing', landingRoutes);
        this.router.use('/admin', adminRoutes);
        this.router.use('/space', spaceRoutes);
        this.router.use('/user', userRoutes);
        
        this.router.post('/chat/support', chatController.chatSupport);
        
        this.router.post('/email/welcome', emailController.sendWelcome);
        this.router.post('/email/booking-confirmation', emailController.sendBookingConfirmation);
        this.router.post('/email/voucher', emailController.sendVoucher);
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new ApiRouter().getRouter();