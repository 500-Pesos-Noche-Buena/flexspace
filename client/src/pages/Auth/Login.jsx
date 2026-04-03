import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { apiPost } from '@/utils/Api'; // Using your utility
import { showToast } from '@/components/ui/SweetAlert2'; // Using your utility

const Login = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        const response = await apiPost('/auth/login', formData);

        if (response.status === 'success') {
            localStorage.setItem('authToken', response.token); 
            localStorage.setItem('user', JSON.stringify(response.user));
            
            showToast({ icon: 'success', title: `Welcome back, ${response.user.name}!` });
            
            const roleRedirects = {
                admin: '/admin/dashboard',
                space: '/space/dashboard',
                user: '/dashboard'
            };
            
            navigate(roleRedirects[response.user.role] || '/dashboard');
        } 
        else if (response.status === 'pending') {
            localStorage.setItem('pending_name', response.name);
            navigate('/registration-status');
        }
    } catch (error) {
        showToast({ icon: 'error', title: error.message || 'Login failed' });
    } finally {
        setIsLoading(false);
    }
};

    return (
        <div className="w-full max-w-110 animate-in fade-in duration-500">
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 mb-6">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Secure Access</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Sign in</h1>
                <p className="text-slate-500 font-medium">Access your account to continue</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 ml-1">Email Address</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={20} />
                        <input 
                            type="email" 
                            required 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="you@email.com" 
                            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-400 outline-none transition font-bold" 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <label className="block text-sm font-bold text-slate-700">Password</label>
                        <Link to="#" className="text-xs font-black text-amber-600 hover:text-amber-700">Forgot?</Link>
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={20} />
                        <input 
                            type={showPassword ? "text" : "password"} 
                            required 
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            placeholder="••••••••" 
                            className="w-full pl-12 pr-12 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-400 outline-none transition font-bold" 
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <Button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black hover:bg-amber-500 hover:text-slate-900 transition flex gap-2 text-lg shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-70"
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin" size={22} />
                    ) : (
                        <>Sign in <ArrowRight size={22} /></>
                    )}
                </Button>
            </form>

            <p className="text-center mt-10 text-sm font-bold text-slate-400">
                New here? <Link to="/register" className="text-indigo-600 hover:underline underline-offset-4 decoration-2">Create account</Link>
            </p>
        </div>
    );
};

export default Login;