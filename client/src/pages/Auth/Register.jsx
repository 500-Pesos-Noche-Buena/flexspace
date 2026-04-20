import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { apiPost } from '@/utils/Api'; // Using your utility
import { showToast } from '@/components/ui/SweetAlert2'; // Using your utility

const Register = () => {
    const navigate = useNavigate();
    const [role, setRole] = useState('user');
    const [isLoading, setIsLoading] = useState(false);

    // State for inputs
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });

    // State for files
    const [files, setFiles] = useState({
        business_permit: null,
        dti_sec_reg: null
    });

    const handleFileChange = (e, field) => {
        setFiles({ ...files, [field]: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        // 1. Construct FormData
        const data = new FormData();
        data.append('name', formData.name);
        data.append('email', formData.email);
        data.append('password', formData.password);
        data.append('role', role);

        // 2. Add files if the role is 'space'
        if (role === 'space') {
            // Check if files exist
            if (!files.business_permit || !files.dti_sec_reg) {
                throw new Error("Please upload all required documents.");
            }
            
            // IMPORTANT: Append the actual File objects, not the state
            data.append('business_permit', files.business_permit);
            data.append('dti_sec_reg', files.dti_sec_reg);
            
            // Debug: Log the files being sent
            console.log('Uploading files:', {
                business_permit: files.business_permit.name,
                dti_sec_reg: files.dti_sec_reg.name
            });
        }

        // 3. Send request (Don't set Content-Type header - let browser set it with boundary)
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
        showToast({ 
            icon: 'error', 
            title: 'Registration Failed', 
            text: error.message || 'Something went wrong' 
        });
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

                {/* Password Input */}
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="password"
                        placeholder="Create Password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-12 pr-4 py-3.5 md:py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold text-sm"
                    />
                </div>

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
                    disabled={isLoading}
                    className="w-full h-12 md:h-14 rounded-2xl bg-slate-900 text-white hover:bg-indigo-600 font-black text-base md:text-lg flex gap-2 shadow-lg shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-70"
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