// components/ui/TokenExpiryChecker.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const TokenExpiryChecker = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    
    useEffect(() => {
        const checkTokenExpiry = () => {
            const token = localStorage.getItem('authToken');
            
            if (!token) return;
            
            try {
                // Decode JWT token
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expiryTime = payload.exp * 1000;
                const currentTime = Date.now();
                
                // If token expired
                if (currentTime >= expiryTime) {
                    console.log('🔐 Token expired - logging out');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                    logout();
                    navigate('/login', { replace: true });
                }
            } catch (error) {
                console.error('Token decode error:', error);
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                logout();
                navigate('/login', { replace: true });
            }
        };
        
        // Check immediately
        checkTokenExpiry();
        
        // Check every 30 seconds
        const interval = setInterval(checkTokenExpiry, 30000);
        
        // Check when page becomes visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkTokenExpiry();
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [navigate, logout]);
    
    return null;
};

export default TokenExpiryChecker;