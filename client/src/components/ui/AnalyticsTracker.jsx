// components/AnalyticsTracker.jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiPost } from '@/utils/Api';

const AnalyticsTracker = () => {
    const location = useLocation();
    
    useEffect(() => {
        const trackPageView = async () => {
            try {
                const ua = navigator.userAgent;
                
                // 1. Detect Device Type
                let deviceType = 'Desktop';
                if (/tablet|ipad/i.test(ua)) deviceType = 'Tablet';
                else if (/mobile|iphone|android/i.test(ua)) deviceType = 'Mobile';
                
                // 2. Detect Browser
                let browser = 'Other';
                if (/edg/i.test(ua)) browser = 'Edge';
                else if (/chrome/i.test(ua)) browser = 'Chrome';
                else if (/safari/i.test(ua)) browser = 'Safari';
                else if (/firefox/i.test(ua)) browser = 'Firefox';
                
                // 3. Detect OS (Order matters: check mobile OS before desktop Linux)
                let os = 'Other';
                if (/android/i.test(ua)) os = 'Android';
                else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
                else if (/windows/i.test(ua)) os = 'Windows';
                else if (/mac/i.test(ua)) os = 'macOS';
                else if (/linux/i.test(ua)) os = 'GNU/Linux';
                
                await apiPost('/analytics/track', { 
                    path: location.pathname,
                    deviceType,
                    browser,
                    os
                });
            } catch (err) {
                console.debug('Analytics sync skipped:', err.message);
            }
        };
        
        trackPageView();
    }, [location]);
    
    return null;
};

export default AnalyticsTracker;