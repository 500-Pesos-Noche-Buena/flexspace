const express = require('express');
const authRoutes = require('./authRoutes'); 
const adminRoutes = require('./adminRoutes'); 
const spaceRoutes = require('./spaceRoutes'); 
const landingRoutes = require('./landingRoutes');
const userRoutes = require('./userRoutes');
const { Analytics } = require('@/api/v1/models');

class ApiRouter {
    constructor() {
        this.router = express.Router();
        this.mountRoutes();
    }

    mountRoutes() {
        console.log('--- 🚀 Mounting API v1 Routes ---');
        
        this.router.post('/analytics/track', async (req, res) => {
            try {
                const { path } = req.body;
                const period = '7d';
                const today = new Date().toISOString().split('T')[0];
                
                let analytics = await Analytics.findOne({ period });
                
                if (!analytics) {
                    // Create new analytics record
                    analytics = new Analytics({
                        period,
                        visitors: 1,
                        pageViews: 1,
                        bounceRate: 0,
                        avgSessionDuration: 0,
                        topPages: [{ path, views: 1, visitors: 1 }],
                        trafficSources: [],
                        countries: [],
                        devices: [],
                        browsers: [],
                        os: [],
                        dailyStats: [{ date: today, visitors: 1, pageViews: 1 }],
                        updatedAt: new Date()
                    });
                } else {
                    // Update existing analytics
                    analytics.pageViews = (analytics.pageViews || 0) + 1;
                    
                    // Update unique visitors (simple logic - every 5th page view counts as new visitor)
                    if (analytics.pageViews % 5 === 0) {
                        analytics.visitors = (analytics.visitors || 0) + 1;
                    }
                    
                    // Update top pages
                    const existingPage = analytics.topPages?.find(p => p.path === path);
                    if (existingPage) {
                        existingPage.views = (existingPage.views || 0) + 1;
                        existingPage.visitors = (existingPage.visitors || 0) + 1;
                    } else {
                        if (!analytics.topPages) analytics.topPages = [];
                        analytics.topPages.push({ path, views: 1, visitors: 1 });
                    }
                    
                    // Sort and keep top 10
                    analytics.topPages.sort((a, b) => b.views - a.views);
                    analytics.topPages = analytics.topPages.slice(0, 10);
                    
                    // Update daily stats
                    const existingDay = analytics.dailyStats?.find(d => d.date === today);
                    if (existingDay) {
                        existingDay.pageViews = (existingDay.pageViews || 0) + 1;
                        // Update daily visitors every 5th view
                        if (analytics.pageViews % 5 === 0) {
                            existingDay.visitors = (existingDay.visitors || 0) + 1;
                        }
                    } else {
                        if (!analytics.dailyStats) analytics.dailyStats = [];
                        analytics.dailyStats.push({ date: today, visitors: analytics.pageViews % 5 === 0 ? 1 : 0, pageViews: 1 });
                    }
                    
                    // Keep only last 30 days
                    analytics.dailyStats = analytics.dailyStats.slice(-30);
                    analytics.updatedAt = new Date();
                }
                
                await analytics.save();
                
                console.log(`📊 Tracked: ${path} | Page Views: ${analytics.pageViews} | Visitors: ${analytics.visitors}`);
                res.json({ success: true, pageViews: analytics.pageViews, visitors: analytics.visitors });
            } catch (error) {
                console.error('Analytics track error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        this.router.use('/auth', authRoutes);
        this.router.use('/landing', landingRoutes);
        this.router.use('/admin', adminRoutes);
        this.router.use('/space', spaceRoutes);
        this.router.use('/user', userRoutes);
    }
    
    getRouter() {
        return this.router;
    }
}

module.exports = new ApiRouter().getRouter();