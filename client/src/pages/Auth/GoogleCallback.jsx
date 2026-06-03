import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { showToast } from '@/components/ui/SweetAlert2';
import { cn } from '@/utils/cn';

const GoogleCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const { themeColor } = useTheme();
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const encodedUser = searchParams.get('user');

    // Get dynamic color for loader
    const getLoaderColor = () => {
        const colors = {
            indigo: 'text-indigo-500',
            emerald: 'text-emerald-500',
            purple: 'text-purple-500',
            blue: 'text-blue-500',
            rose: 'text-rose-500',
            amber: 'text-amber-500',
        };
        return colors[themeColor] || colors.indigo;
    };

    useEffect(() => {
        console.log('🔍 GoogleCallback - Token:', token ? 'Received' : 'No token');
        console.log('🔍 GoogleCallback - Error:', error);
        console.log('🔍 GoogleCallback - Encoded User:', encodedUser ? 'Yes' : 'No');

        if (error) {
            showToast({ icon: 'error', title: 'Google Sign In Failed', message: error });
            navigate('/login');
            return;
        }

        if (token && encodedUser) {
            try {
                // Decode user data from base64
                const userData = JSON.parse(atob(encodedUser));
                console.log('🔍 Decoded user data:', userData);
                
                // Store token and user
                localStorage.setItem('authToken', token);
                localStorage.setItem('user', JSON.stringify(userData));
                
                // Call login from AuthContext
                login(userData, token);
                
                // Show welcome toast with user's name
                showToast({ 
                    icon: 'success', 
                    title: `Welcome back, ${userData.name}!` 
                });
                
                // Redirect after a short delay
                setTimeout(() => {
                    const roleRedirects = {
                        admin: '/admin/dashboard',
                        space: '/space/dashboard',
                        staff: '/space/dashboard',
                        user: '/dashboard'
                    };
                    const redirectPath = roleRedirects[userData.role] || '/dashboard';
                    console.log('🔍 Redirecting to:', redirectPath);
                    window.location.href = redirectPath;
                }, 1000);
                
            } catch (err) {
                console.error('❌ Error decoding user data:', err);
                showToast({ icon: 'error', title: 'Login failed', message: 'Invalid user data' });
                navigate('/login');
            }
        } else if (token && !encodedUser) {
            // Fallback: decode from JWT if no user data in URL
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(atob(base64));
                
                console.log('🔍 Fallback - JWT payload:', payload);
                
                const userName = payload.name || payload.email?.split('@')[0] || 'User';
                const userData = {
                    id: payload.id || payload.sub,
                    name: userName,
                    email: payload.email,
                    role: payload.role || 'user',
                    avatar: payload.avatar || null,
                };
                
                localStorage.setItem('authToken', token);
                localStorage.setItem('user', JSON.stringify(userData));
                login(userData, token);
                
                showToast({ icon: 'success', title: `Welcome back, ${userName}!` });
                
                setTimeout(() => {
                    const roleRedirects = {
                        admin: '/admin/dashboard',
                        space: '/space/dashboard',
                        staff: '/space/dashboard',
                        user: '/dashboard'
                    };
                    const redirectPath = roleRedirects[userData.role] || '/dashboard';
                    window.location.href = redirectPath;
                }, 1000);
                
            } catch (err) {
                console.error('❌ Fallback decode error:', err);
                navigate('/login');
            }
        } else {
            console.log('❌ Missing token or user data in URL');
            navigate('/login');
        }
    }, [token, encodedUser, error, navigate, login]);

    const loaderColor = getLoaderColor();

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
            <div className="text-center">
                <Loader2 className={cn("w-8 h-8 animate-spin mx-auto mb-4", loaderColor)} />
                <p className="text-slate-600 dark:text-slate-400 font-black uppercase tracking-wider">
                    Signing in with Google...
                </p>
            </div>
        </div>
    );
};

export default GoogleCallback;