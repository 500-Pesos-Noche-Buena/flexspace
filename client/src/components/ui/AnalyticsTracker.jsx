// components/AnalyticsTracker.jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiPost } from '@/utils/Api';

const AnalyticsTracker = () => {
    const location = useLocation();
    
    useEffect(() => {
        const trackPageView = async () => {
            try {
                await apiPost('/analytics/track', { path: location.pathname });
                console.log('📊 Tracked:', location.pathname);
            } catch (err) {
                console.debug('Analytics track error:', err);
            }
        };
        
        trackPageView();
    }, [location]);
    
    return null;
};

export default AnalyticsTracker;