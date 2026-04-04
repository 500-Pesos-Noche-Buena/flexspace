import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { User, Shield, Mail, BadgeCheck, Save, Loader2, Lock } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';

const ProfileIndex = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form States
    const [formData, setFormData] = useState({ name: '', email: '' });
    const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await apiGet('/auth/profile'); // Adjust path to your route
            setUser(res.data);
            setFormData({ name: res.data.name, email: res.data.email });
        } catch (err) {
            showToast({ icon: 'error', title: 'Failed to load profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateInfo = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiPost('/auth/profile/update', formData);
            showToast({ icon: 'success', title: 'Profile Updated' });
            fetchProfile();
        } catch (err) {
            showToast({ icon: 'error', title: err.response?.data?.message || 'Update failed' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-white italic opacity-50 uppercase text-[10px] tracking-widest">Loading Identity...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex items-center gap-6 bg-[#111114] border border-white/5 p-8 rounded-[3rem]">
                <div className="w-24 h-24 rounded-4xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 text-3xl font-black">
                    {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">{user?.name}</h1>
                        {user?.role === 'admin' && <BadgeCheck size={18} className="text-emerald-500" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <Shield size={10} /> {user?.role} Account
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* General Information */}
                <div className="bg-[#111114] border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <User size={16} className="text-indigo-400" />
                        <h2 className="text-xs font-black text-white uppercase tracking-widest">General Info</h2>
                    </div>

                    <form onSubmit={handleUpdateInfo} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Full Name</label>
                            <input 
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-bold"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Email Address</label>
                            <input 
                                type="email"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-bold"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                        <button 
                            disabled={saving}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                            Save Changes
                        </button>
                    </form>
                </div>

                {/* Security Section */}
                <div className="bg-[#111114] border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <Lock size={16} className="text-rose-400" />
                        <h2 className="text-xs font-black text-white uppercase tracking-widest">Security</h2>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] text-slate-500 font-medium italic">Change your password to keep your account secure.</p>
                        
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">New Password</label>
                            <input 
                                type="password"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-rose-500 transition-all font-bold"
                                placeholder="••••••••"
                            />
                        </div>

                        <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all">
                            Update Password
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileIndex;