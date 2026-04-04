import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { apiPost } from '@/utils/Api'; 
import { showToast } from '@/components/ui/SweetAlert2';
import { useAuth } from '@/context/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    
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
                login(response.user, response.token); 
                
                showToast({ icon: 'success', title: `Welcome back, ${response.user.name}!` });
                
                const roleRedirects = {
                    admin: '/admin/dashboard',
                    space: '/space/dashboard',
                    user: '/dashboard'
                };
                
                // 4. Navigate after state is updated
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
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-6 md:mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Welcome Back</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">Sign in</h1>
                <p className="text-slate-500 text-sm font-medium">Access your coworking dashboard</p>
            </div>

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
                        <Link to="#" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Forgot?</Link>
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

                <Button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 md:h-14 rounded-2xl bg-slate-900 text-white font-black hover:bg-indigo-600 transition flex gap-2 text-base md:text-lg shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-70 mt-2"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Sign in <ArrowRight size={20} /></>}
                </Button>
            </form>

            <p className="text-center mt-8 md:mt-12 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                New to IloiloWork? <Link to="/register" className="text-indigo-600 hover:underline underline-offset-4 decoration-2">Create account</Link>
            </p>
        </div>
    );
};

export default Login;