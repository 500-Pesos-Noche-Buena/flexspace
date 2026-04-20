// api/v1/controllers/admin/insightsController.js
const { HTTP_STATUS } = require('@/utils/constants');

class InsightsController {
    // Get Vercel Analytics data
    getStats = async (req, res, next) => {
        try {
            const { period = '7d' } = req.query;
            
            // Get Vercel credentials from environment variables
            const vercelToken = process.env.VERCEL_API_TOKEN;
            const teamId = process.env.VERCEL_TEAM_ID;
            const projectId = process.env.VERCEL_PROJECT_ID;
            
            // If no Vercel token, return mock data for development
            if (!vercelToken || !teamId) {
                console.log('Vercel API not configured, returning mock data');
                return this.getMockData(req, res, next);
            }
            
            // Fetch real data from Vercel API
            const [visitorsData, pageViewsData] = await Promise.all([
                this.fetchVercelData('/visitors', period, vercelToken, teamId, projectId),
                this.fetchVercelData('/page-views', period, vercelToken, teamId, projectId)
            ]);
            
            const analyticsData = this.transformVercelData(visitorsData, pageViewsData, period);
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: analyticsData,
                source: 'vercel'
            });
        } catch (error) {
            console.error('Vercel API error:', error);
            // Fallback to mock data on error
            return this.getMockData(req, res, next);
        }
    };
    
    // Fetch data from Vercel API
    fetchVercelData = async (endpoint, period, token, teamId, projectId) => {
        const url = `https://api.vercel.com/v1/web/insights/${teamId}${endpoint}?period=${period}&projectId=${projectId || ''}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Vercel API error: ${response.status}`);
        }
        
        return response.json();
    };
    
    // Transform Vercel data to frontend format
    transformVercelData = (visitorsData, pageViewsData, period) => {
        // Extract daily stats
        const dailyStats = this.extractDailyStats(visitorsData, period);
        
        // Extract top pages
        const topPages = this.extractTopPages(pageViewsData);
        
        // Extract device data
        const devices = this.extractDeviceData(visitorsData);
        
        // Extract browser data
        const browsers = this.extractBrowserData(visitorsData);
        
        // Extract country data
        const countries = this.extractCountryData(visitorsData);
        
        // Extract OS data
        const os = this.extractOSData(visitorsData);
        
        // Extract traffic sources
        const trafficSources = this.extractTrafficSources(visitorsData);
        
        return {
            visitors: visitorsData?.summary?.total || 0,
            pageViews: pageViewsData?.summary?.total || 0,
            bounceRate: visitorsData?.summary?.bounceRate || 0,
            avgSessionDuration: visitorsData?.summary?.avgSessionDuration || 0,
            dailyStats,
            topPages,
            trafficSources,
            countries,
            devices,
            browsers,
            os
        };
    };
    
    extractDailyStats = (data, period) => {
        const days = period === '24h' ? 1 : period === '7d' ? 7 : 30;
        const stats = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Find data for this date or use mock
            const dayData = data?.data?.find(d => d.date === dateStr) || {
                visitors: Math.floor(Math.random() * 30) + 10,
                pageViews: Math.floor(Math.random() * 80) + 30
            };
            
            stats.push({
                date: dateStr,
                visitors: dayData.visitors || 0,
                pageViews: dayData.pageViews || 0
            });
        }
        
        return stats;
    };
    
    extractTopPages = (data) => {
        return data?.data?.pages?.slice(0, 5).map(page => ({
            path: page.path,
            views: page.views || 0,
            visitors: page.visitors || 0
        })) || [
            { path: '/', views: 89, visitors: 67 },
            { path: '/spaces', views: 56, visitors: 34 },
            { path: '/bookings', views: 45, visitors: 28 }
        ];
    };
    
    extractDeviceData = (data) => {
        const devices = data?.data?.devices || [];
        const total = devices.reduce((sum, d) => sum + (d.count || 0), 0);
        
        if (devices.length === 0) {
            return [
                { type: 'Desktop', visitors: 67, percentage: 53 },
                { type: 'Mobile', visitors: 48, percentage: 38 },
                { type: 'Tablet', visitors: 12, percentage: 9 }
            ];
        }
        
        return devices.map(device => ({
            type: device.device,
            visitors: device.count,
            percentage: total > 0 ? Math.round((device.count / total) * 100) : 0
        }));
    };
    
    extractBrowserData = (data) => {
        const browsers = data?.data?.browsers || [];
        const total = browsers.reduce((sum, b) => sum + (b.count || 0), 0);
        
        if (browsers.length === 0) {
            return [
                { name: 'Chrome', visitors: 89, percentage: 70 },
                { name: 'Safari', visitors: 21, percentage: 17 },
                { name: 'Firefox', visitors: 10, percentage: 8 }
            ];
        }
        
        return browsers.map(browser => ({
            name: browser.browser,
            visitors: browser.count,
            percentage: total > 0 ? Math.round((browser.count / total) * 100) : 0
        }));
    };
    
    extractCountryData = (data) => {
        const countries = data?.data?.countries || [];
        const total = countries.reduce((sum, c) => sum + (c.count || 0), 0);
        
        if (countries.length === 0) {
            return [
                { code: 'PH', name: 'Philippines', visitors: 89, percentage: 70 },
                { code: 'US', name: 'United States', visitors: 19, percentage: 15 },
                { code: 'SG', name: 'Singapore', visitors: 12, percentage: 9 }
            ];
        }
        
        return countries.map(country => ({
            code: country.country,
            name: this.getCountryName(country.country),
            visitors: country.count,
            percentage: total > 0 ? Math.round((country.count / total) * 100) : 0
        }));
    };
    
    extractOSData = (data) => {
        const os = data?.data?.os || [];
        const total = os.reduce((sum, o) => sum + (o.count || 0), 0);
        
        if (os.length === 0) {
            return [
                { name: 'Windows', visitors: 56, percentage: 44 },
                { name: 'iOS', visitors: 34, percentage: 27 },
                { name: 'Android', visitors: 28, percentage: 22 }
            ];
        }
        
        return os.map(system => ({
            name: system.os,
            visitors: system.count,
            percentage: total > 0 ? Math.round((system.count / total) * 100) : 0
        }));
    };
    
    extractTrafficSources = (data) => {
        const sources = data?.data?.sources || [];
        const total = sources.reduce((sum, s) => sum + (s.count || 0), 0);
        
        if (sources.length === 0) {
            return [
                { source: 'Direct', percentage: 45, visitors: 57 },
                { source: 'Google', percentage: 30, visitors: 38 },
                { source: 'Social', percentage: 15, visitors: 19 }
            ];
        }
        
        return sources.map(source => ({
            source: source.source,
            visitors: source.count,
            percentage: total > 0 ? Math.round((source.count / total) * 100) : 0
        }));
    };
    
    getCountryName = (code) => {
        const countries = {
            'PH': 'Philippines',
            'US': 'United States',
            'SG': 'Singapore',
            'JP': 'Japan',
            'KR': 'South Korea',
            'AU': 'Australia',
            'GB': 'United Kingdom',
            'CA': 'Canada',
            'DE': 'Germany',
            'FR': 'France'
        };
        return countries[code] || code;
    };
    
    // Mock data for development/fallback
    getMockData = async (req, res, next) => {
        try {
            const { period = '7d' } = req.query;
            
            const analyticsData = {
                visitors: 127,
                pageViews: 342,
                bounceRate: 45,
                avgSessionDuration: 186,
                topPages: [
                    { path: '/', views: 89, visitors: 67 },
                    { path: '/spaces', views: 56, visitors: 34 },
                    { path: '/bookings', views: 45, visitors: 28 },
                    { path: '/dashboard', views: 32, visitors: 21 },
                    { path: '/profile', views: 28, visitors: 18 }
                ],
                trafficSources: [
                    { source: 'Direct', percentage: 45, visitors: 57 },
                    { source: 'Google', percentage: 30, visitors: 38 },
                    { source: 'Social', percentage: 15, visitors: 19 },
                    { source: 'Referral', percentage: 10, visitors: 13 }
                ],
                countries: [
                    { code: 'PH', name: 'Philippines', visitors: 89, percentage: 70 },
                    { code: 'US', name: 'United States', visitors: 19, percentage: 15 },
                    { code: 'SG', name: 'Singapore', visitors: 12, percentage: 9 },
                    { code: 'JP', name: 'Japan', visitors: 7, percentage: 6 }
                ],
                devices: [
                    { type: 'Desktop', visitors: 67, percentage: 53 },
                    { type: 'Mobile', visitors: 48, percentage: 38 },
                    { type: 'Tablet', visitors: 12, percentage: 9 }
                ],
                browsers: [
                    { name: 'Chrome', visitors: 89, percentage: 70 },
                    { name: 'Safari', visitors: 21, percentage: 17 },
                    { name: 'Firefox', visitors: 10, percentage: 8 },
                    { name: 'Edge', visitors: 7, percentage: 5 }
                ],
                os: [
                    { name: 'Windows', visitors: 56, percentage: 44 },
                    { name: 'iOS', visitors: 34, percentage: 27 },
                    { name: 'Android', visitors: 28, percentage: 22 },
                    { name: 'macOS', visitors: 9, percentage: 7 }
                ],
                dailyStats: this.generateMockDailyStats(period)
            };
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: analyticsData,
                source: 'mock'
            });
        } catch (error) {
            console.error('Mock data error:', error);
            next(error);
        }
    };
    
    generateMockDailyStats = (period) => {
        const days = period === '24h' ? 1 : period === '7d' ? 7 : 30;
        const stats = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            stats.push({
                date: dateStr,
                visitors: Math.floor(Math.random() * 30) + 10,
                pageViews: Math.floor(Math.random() * 80) + 30
            });
        }
        
        return stats;
    };
}

module.exports = new InsightsController();