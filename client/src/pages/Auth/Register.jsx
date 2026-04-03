import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, User, Mail, Lock, ArrowRight, FileText, Building2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

const Register = () => {
    const [role, setRole] = useState('user');

    return (
        <div className="w-full max-w-110 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 mb-4">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Create Account</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Get Started</h1>
                <p className="mt-2 text-sm font-bold text-slate-500">Join our community today</p>
            </div>

            <form className="space-y-5">
                {/* 1. Grid Role Selector (Matches PHP Design) */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                        type="button"
                        onClick={() => setRole('user')}
                        className={`p-4 rounded-2xl border-2 transition-all text-center group ${
                            role === 'user' 
                            ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-200/20' 
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                    >
                        <span className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${role === 'user' ? 'text-amber-600' : 'text-slate-400'}`}>I'm a</span>
                        <span className={`text-sm font-black ${role === 'user' ? 'text-slate-900' : 'text-slate-500'}`}>Member</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setRole('space')}
                        className={`p-4 rounded-2xl border-2 transition-all text-center group ${
                            role === 'space' 
                            ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-200/20' 
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                    >
                        <span className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${role === 'space' ? 'text-amber-600' : 'text-slate-400'}`}>I own a</span>
                        <span className={`text-sm font-black ${role === 'space' ? 'text-slate-900' : 'text-slate-500'}`}>Space</span>
                    </button>
                </div>

                {/* 2. Core Fields */}
                <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={18} />
                    <input type="text" placeholder="Full Name" required className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 outline-none transition font-bold" />
                </div>
                
                <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={18} />
                    <input type="email" placeholder="Email Address" required className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 outline-none transition font-bold" />
                </div>

                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={18} />
                    <input type="password" placeholder="Create Password" required className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 outline-none transition font-bold" />
                </div>

                {/* 3. Space Owner Requirements (The 2 Uploads) */}
                {role === 'space' && (
                    <div className="space-y-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Business Documents</p>
                        
                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                                <FileText size={12} /> Business Permit
                            </label>
                            <input 
                                type="file" 
                                required
                                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-slate-900 file:text-white file:font-black file:uppercase file:tracking-tighter hover:file:bg-amber-500 hover:file:text-slate-900 cursor-pointer transition-all bg-slate-50 rounded-2xl border border-slate-200 p-1" 
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                                <Building2 size={12} /> DTI / SEC Registration
                            </label>
                            <input 
                                type="file" 
                                required
                                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-slate-900 file:text-white file:font-black file:uppercase file:tracking-tighter hover:file:bg-amber-500 hover:file:text-slate-900 cursor-pointer transition-all bg-slate-50 rounded-2xl border border-slate-200 p-1" 
                            />
                        </div>
                    </div>
                )}

                {/* 4. Submit Button */}
                <Button className="w-full h-14 rounded-2xl bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-900 font-black text-lg flex gap-2 mt-4 shadow-xl shadow-slate-200 transition-all active:scale-[0.98]">
                    Create Account <ArrowRight size={22} />
                </Button>
            </form>

            <p className="text-center mt-10 text-sm font-bold text-slate-400">
                Already have an account? <Link to="/login" className="text-slate-900 hover:text-amber-600 transition-colors underline-offset-4 decoration-2">Sign in</Link>
            </p>
        </div>
    );
};

export default Register;