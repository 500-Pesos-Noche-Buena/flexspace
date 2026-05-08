import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [role, setRole] = useState('user');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // Cloudflare Turnstile states
    const [turnstileToken, setTurnstileToken] = useState(null);
    const [turnstileError, setTurnstileError] = useState(false);
    const turnstileContainerRef = useRef(null);
    const widgetIdRef = useRef(null);

    // State for inputs
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    // State for files
    const [files, setFiles] = useState({
        business_permit: null,
        dti_sec_reg: null
    });

    // Check URL hash for role detection (e.g., /register#space or /register#user)
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash === 'space') {
            setRole('space');
        } else if (hash === 'user') {
            setRole('user');
        }
    }, [location]);

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

    // Password validation
    const validatePassword = (password) => {
        const errors = [];
        if (password.length < 8) errors.push('At least 8 characters');
        if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
        if (!/[0-9]/.test(password)) errors.push('One number');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One special character');
        return errors;
    };

    const passwordErrors = validatePassword(formData.password);
    const isPasswordValid = passwordErrors.length === 0 && formData.password.length > 0;
    const doPasswordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;
    const isFormValid = formData.name && formData.email && isPasswordValid && doPasswordsMatch && turnstileToken;

    const handleFileChange = (e, field) => {
        setFiles({ ...files, [field]: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check Turnstile verification
        if (!turnstileToken) {
            showToast({ 
                icon: 'error', 
                title: 'Security Check Required', 
                text: 'Please complete the security verification.' 
            });
            return;
        }

        if (!isFormValid) {
            showToast({ icon: 'error', title: 'Please fix the errors before submitting' });
            return;
        }

        setIsLoading(true);

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('email', formData.email);
            data.append('password', formData.password);
            data.append('role', role);
            data.append('cf-turnstile-response', turnstileToken);

            if (role === 'space') {
                if (!files.business_permit || !files.dti_sec_reg) {
                    throw new Error("Please upload all required documents.");
                }

                data.append('business_permit', files.business_permit);
                data.append('dti_sec_reg', files.dti_sec_reg);
            }

            const response = await apiPost('/auth/register', data);

            if (response.status === 'success') {
                showToast({
                    icon: 'success',
                    title: 'Success!',
                    text: response.message || 'Registration successful! You can now log in.'
                });
                navigate('/login');
            }
            else if (response.status === 'pending') {
                showToast({
                    icon: 'info',
                    title: 'Application Received',
                    text: response.message
                });
                localStorage.setItem('pending_name', formData.name);
                navigate('/registration-status');
            }

        } catch (error) {
            console.error('Registration error:', error);

            // Reset Turnstile on failed registration
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.reset(widgetIdRef.current);
            }
            setTurnstileToken(null);

            // Check for duplicate email error
            const errorMessage = error.message || '';

            if (errorMessage.includes('Email is already registered') ||
                errorMessage.includes('duplicate') ||
                errorMessage.includes('already exists')) {
                showToast({
                    icon: 'error',
                    title: 'Email Already Exists',
                    text: 'This email is already registered. Please login or use a different email.'
                });
            }
            // Check for missing files error
            else if (errorMessage.includes('Please upload all required documents')) {
                showToast({
                    icon: 'error',
                    title: 'Missing Documents',
                    text: errorMessage
                });
            }
            // Check for validation errors
            else if (errorMessage.includes('All fields are required')) {
                showToast({
                    icon: 'error',
                    title: 'Missing Information',
                    text: 'Please fill in all required fields.'
                });
            }
            // Default error
            else {
                showToast({
                    icon: 'error',
                    title: 'Registration Failed',
                    text: errorMessage || 'Something went wrong. Please try again.'
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-4 md:mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700">Create Account</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">Get Started</h1>
            </div>

            <form className="space-y-3 md:space-y-4" onSubmit={handleSubmit}>
                {/* Role Selector */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                    <button
                        type="button"
                        onClick={() => setRole('user')}
                        className={`p-3 md:p-4 rounded-2xl border-2 transition-all text-center ${role === 'user' ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-slate-100 bg-white'
                            }`}
                    >
                        <span className={`block text-[8px] font-black uppercase tracking-widest mb-0.5 ${role === 'user' ? 'text-indigo-600' : 'text-slate-400'}`}>I'm a</span>
                        <span className={`text-xs md:text-sm font-black ${role === 'user' ? 'text-slate-900' : 'text-slate-500'}`}>Member</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setRole('space')}
                        className={`p-3 md:p-4 rounded-2xl border-2 transition-all text-center ${role === 'space' ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-slate-100 bg-white'
                            }`}
                    >
                        <span className={`block text-[8px] font-black uppercase tracking-widest mb-0.5 ${role === 'space' ? 'text-indigo-600' : 'text-slate-400'}`}>I own a</span>
                        <span className={`text-xs md:text-sm font-black ${role === 'space' ? 'text-slate-900' : 'text-slate-500'}`}>Space</span>
                    </button>
                </div>

                {/* Name Input */}
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Full Name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-3.5 md:py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold text-sm"
                    />
                </div>

                {/* Email Input */}
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="email"
                        placeholder="Email Address"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-3.5 md:py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold text-sm"
                    />
                </div>

                {/* Password Input with validation */}
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create Password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`w-full pl-12 pr-12 py-3.5 md:py-4 rounded-2xl border transition-all font-bold text-sm
                            ${formData.password && !isPasswordValid ? 'border-red-500 bg-red-50 focus:border-red-500' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400'}`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                {/* Password requirements */}
                {formData.password && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2">Password must contain:</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                            <div className={`text-[8px] flex items-center gap-1 ${formData.password.length >= 8 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {formData.password.length >= 8 ? <CheckCircle size={10} /> : <XCircle size={10} />} 8+ characters
                            </div>
                            <div className={`text-[8px] flex items-center gap-1 ${/[A-Z]/.test(formData.password) ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {/[A-Z]/.test(formData.password) ? <CheckCircle size={10} /> : <XCircle size={10} />} Uppercase letter
                            </div>
                            <div className={`text-[8px] flex items-center gap-1 ${/[a-z]/.test(formData.password) ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {/[a-z]/.test(formData.password) ? <CheckCircle size={10} /> : <XCircle size={10} />} Lowercase letter
                            </div>
                            <div className={`text-[8px] flex items-center gap-1 ${/[0-9]/.test(formData.password) ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {/[0-9]/.test(formData.password) ? <CheckCircle size={10} /> : <XCircle size={10} />} Number
                            </div>
                            <div className={`text-[8px] flex items-center gap-1 col-span-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? <CheckCircle size={10} /> : <XCircle size={10} />} Special character
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirm Password Input */}
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm Password"
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className={`w-full pl-12 pr-12 py-3.5 md:py-4 rounded-2xl border transition-all font-bold text-sm
                            ${formData.confirmPassword && !doPasswordsMatch ? 'border-red-500 bg-red-50' :
                                formData.confirmPassword && doPasswordsMatch ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                {/* Confirm password feedback */}
                {formData.confirmPassword && (
                    <p className={`text-[8px] font-bold -mt-2 ${doPasswordsMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                        {doPasswordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                )}

                {/* Password strength meter */}
                {formData.password && (
                    <div className="mt-1">
                        <div className="flex gap-1 h-1">
                            {[1, 2, 3, 4, 5].map((level) => {
                                let isActive = false;
                                if (level === 1 && formData.password.length >= 8) isActive = true;
                                if (level === 2 && /[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password)) isActive = true;
                                if (level === 3 && /[0-9]/.test(formData.password)) isActive = true;
                                if (level === 4 && /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) isActive = true;
                                if (level === 5 && formData.password.length >= 12) isActive = true;
                                return (
                                    <div
                                        key={level}
                                        className={`flex-1 h-full rounded-full transition-all ${isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                    />
                                );
                            })}
                        </div>
                        <p className="text-[7px] text-slate-400 mt-1 text-right">
                            {isPasswordValid ? '✓ Strong password' : 'Weak password - meet all requirements'}
                        </p>
                    </div>
                )}

                {/* Cloudflare Turnstile Widget */}
                <div className="flex justify-center py-2">
                    <div ref={turnstileContainerRef} />
                </div>
                {turnstileError && (
                    <p className="text-[8px] text-red-500 text-center -mt-2">
                        Security verification failed. Please refresh and try again.
                    </p>
                )}

                {/* Space Owner File Uploads */}
                {role === 'space' && (
                    <div className="space-y-3 pt-3 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                        <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Verification Docs</p>

                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1 block">Business Permit</label>
                                <input
                                    type="file"
                                    required
                                    onChange={(e) => handleFileChange(e, 'business_permit')}
                                    className="block w-full text-[10px] text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-slate-900 file:text-white file:font-black file:uppercase file:text-[9px] bg-slate-50 rounded-xl border border-slate-200 p-1"
                                />
                            </div>
                            <div>
                                <label className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1 block">DTI / SEC Registration</label>
                                <input
                                    type="file"
                                    required
                                    onChange={(e) => handleFileChange(e, 'dti_sec_reg')}
                                    className="block w-full text-[10px] text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-slate-900 file:text-white file:font-black file:uppercase file:text-[9px] bg-slate-50 rounded-xl border border-slate-200 p-1"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={isLoading || !isFormValid || !turnstileToken}
                    className="w-full h-12 md:h-14 rounded-2xl bg-slate-900 text-white hover:bg-indigo-600 font-black text-base md:text-lg flex gap-2 shadow-lg shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>Create Account <ArrowRight size={20} /></>
                    )}
                </Button>
            </form>

            <p className="text-center mt-6 md:mt-8 text-xs md:text-sm font-bold text-slate-400 uppercase tracking-tight">
                Got an account? <Link to="/login" className="text-slate-900 hover:text-indigo-600 underline underline-offset-4 decoration-2">Sign in</Link>
            </p>
        </div>
    );
};

export default Register;