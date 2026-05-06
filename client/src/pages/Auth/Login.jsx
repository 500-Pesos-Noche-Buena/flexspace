import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { apiPost } from '@/utils/Api'; 
import { showToast } from '@/components/ui/SweetAlert2';
import { useAuth } from '@/context/AuthContext';
import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal';

const Login = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState(null);
    const [turnstileError, setTurnstileError] = useState(false);
    const turnstileContainerRef = useRef(null);
    const widgetIdRef = useRef(null);

    const { login } = useAuth();
    
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    // Load Turnstile script and initialize widget
    useEffect(() => {
        // Load the Turnstile script
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = initTurnstile;
        document.body.appendChild(script);

        return () => {
            // Cleanup widget on unmount
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
            }
        };
    }, []);

    const initTurnstile = () => {
        if (window.turnstile && turnstileContainerRef.current && !widgetIdRef.current) {
            const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAADKRTC20ldH2jxH_';
            
            widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
                sitekey: siteKey,
                callback: (token) => {
                    console.log('Turnstile verified successfully');
                    setTurnstileToken(token);
                    setTurnstileError(false);
                },
                'expired-callback': () => {
                    console.log('Turnstile token expired');
                    setTurnstileToken(null);
                    setTurnstileError(true);
                },
                'error-callback': () => {
                    console.log('Turnstile error occurred');
                    setTurnstileToken(null);
                    setTurnstileError(true);
                },
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check Turnstile verification
        if (!turnstileToken) {
            showToast({ 
                icon: 'error', 
                title: 'Security Check Required', 
                message: 'Please complete the security verification.' 
            });
            return;
        }

        setIsLoading(true);

        try {
            const response = await apiPost('/auth/login', {
                ...formData,
                'cf-turnstile-response': turnstileToken
            });

            if (response.status === 'success') {
                login(response.user, response.token); 
                
                showToast({ icon: 'success', title: `Welcome back, ${response.user.name}!` });
                
                const roleRedirects = {
                    admin: '/admin/dashboard',
                    space: '/space/dashboard',
                    staff: '/space/dashboard',
                    user: '/dashboard'
                };
                
                navigate(roleRedirects[response.user.role] || '/dashboard');
            } 
            else if (response.status === 'pending') {
                localStorage.setItem('pending_name', response.name);
                navigate('/registration-status');
            }
        } catch (error) {
            // Check if error is from Google-only account
            if (error.message?.includes('Google') || error.requiresGoogle) {
                showToast({ 
                    icon: 'info', 
                    title: 'Google Account Detected', 
                    message: 'Please sign in with Google for this account.' 
                });
            } else {
                showToast({ icon: 'error', title: error.message || 'Login failed' });
            }
            // Reset Turnstile on failed login
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.reset(widgetIdRef.current);
            }
            setTurnstileToken(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        // Redirect to backend Google OAuth endpoint
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        window.location.href = `${backendUrl}/api/v1/auth/google`;
    };

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-6 md:mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Welcome Back</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">Sign in</h1>
                <p className="text-slate-500 text-sm font-medium">Access your coworking dashboard</p>
            </div>

            {/* Google Sign In Button */}
            <div className="mb-6">
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 py-3.5 md:py-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all group"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="text-sm font-bold text-slate-700">Continue with Google</span>
                </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white text-slate-400 font-bold uppercase tracking-wider">OR</span>
                </div>
            </div>

            {/* Email/Password Form */}
            <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Email Address</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type="email" 
                            required 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="name@email.com" 
                            className="w-full pl-12 pr-4 py-3.5 md:py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold text-sm" 
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Password</label>
                        <Link 
                            to="#" 
                            onClick={(e) => { e.preventDefault(); setShowForgotPassword(true); }}
                            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest"
                        >
                            Forgot?
                        </Link>
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type={showPassword ? "text" : "password"} 
                            required 
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            placeholder="••••••••" 
                            className="w-full pl-12 pr-12 py-3.5 md:py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold text-sm" 
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                {/* Cloudflare Turnstile Widget */}
                <div className="flex justify-center py-2">
                    <div ref={turnstileContainerRef} />
                </div>
                {turnstileError && (
                    <p className="text-[8px] text-red-500 text-center -mt-2">
                        Security verification failed. Please refresh and try again.
                    </p>
                )}

                <Button 
                    type="submit"
                    disabled={isLoading || !turnstileToken}
                    className="w-full h-12 md:h-14 rounded-2xl bg-slate-900 text-white font-black hover:bg-indigo-600 transition flex gap-2 text-base md:text-lg shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Sign in <ArrowRight size={20} /></>}
                </Button>
            </form>

            <p className="text-center mt-8 md:mt-12 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                New to FlexSpace? <Link to="/register" className="text-indigo-600 hover:underline underline-offset-4 decoration-2">Create account</Link>
            </p>

            <ForgotPasswordModal 
                isOpen={showForgotPassword} 
                onClose={() => setShowForgotPassword(false)} 
            />
        </div>
    );
};

export default Login;