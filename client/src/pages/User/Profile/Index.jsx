import React, { useState, useEffect, useCallback } from 'react';
import { 
    User, Mail, Phone, MapPin, 
    ShieldCheck, Edit3, Camera, 
    Clock, History, CreditCard, Settings,
    LogOut, ChevronRight, Loader2, Save, Lock, Zap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';

/** --- SUB-COMPONENTS --- **/
const EditableField = ({ icon: Icon, label, value, onChange, name, type = "text" }) => (
    <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-3xl focus-within:border-indigo-200 transition-all group shadow-sm">
        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-focus-within:bg-indigo-50 group-focus-within:text-indigo-600 transition-colors">
            <Icon size={18} />
        </div>
        <div className="flex-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
            <input 
                type={type}
                name={name}
                value={value || ''}
                onChange={onChange}
                className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none placeholder:text-slate-300"
                placeholder={`Enter ${label.toLowerCase()}...`}
            />
        </div>
    </div>
);

const ActionButton = ({ icon: Icon, label, onClick, danger = false }) => (
    <button 
        onClick={onClick}
        className={`flex items-center justify-between w-full p-5 rounded-4xl border transition-all group ${
            danger 
            ? 'bg-red-50 border-red-100 hover:bg-red-100 text-red-600' 
            : 'bg-white border-slate-100 hover:border-indigo-200 text-slate-900 shadow-sm'
        }`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${danger ? 'bg-white' : 'bg-slate-50 group-hover:bg-indigo-50'}`}>
                <Icon size={18} className={danger ? 'text-red-600' : 'text-slate-400 group-hover:text-indigo-600'} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <ChevronRight size={16} className={danger ? 'text-red-300' : 'text-slate-300 group-hover:text-indigo-400'} />
    </button>
);

/** --- MAIN PROFILE COMPONENT --- **/
const UserProfile = () => {
    const { logout } = useAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

    const fetchProfile = useCallback(async (isSilent = false) => {
        try {
            const res = await apiGet('/auth/profile');
            const data = res.data || res;
            if (data) {
                setUser(data);
                // Keep form data in sync unless user is typing
                setFormData(prev => ({
                    name: prev.name || data.name,
                    email: prev.email || data.email,
                    phone: prev.phone || data.phone || ''
                }));
            }
        } catch (err) {
            if (!isSilent) showToast({ icon: 'error', title: 'Sync Error' });
        }
    }, []);

    // Heartbeat Sync
    useEffect(() => {
        let isMounted = true;
        const loadInitial = async () => {
            setLoading(true);
            await fetchProfile(false);
            if (isMounted) setLoading(false);
        };
        loadInitial();

        const interval = setInterval(() => {
            if (isMounted && document.visibilityState === 'visible' && !saving) {
                fetchProfile(true);
            }
        }, 5000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchProfile, saving]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiPost('/auth/profile/update', formData);
            showToast({ icon: 'success', title: 'Profile Synchronized' });
            await fetchProfile(false);
        } catch (err) {
            showToast({ icon: 'error', title: 'Update Failed' });
        } finally {
            setSaving(false);
        }
    };

    const getRank = (points = 0) => {
        if (points > 1000) return { title: 'Elite Nomad', color: 'text-purple-600', bg: 'bg-purple-50' };
        if (points > 500) return { title: 'Pro Scholar', color: 'text-indigo-600', bg: 'bg-indigo-50' };
        return { title: 'Starter Hubber', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    };

    const rank = getRank(user?.points);

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="text-indigo-600 animate-spin" size={32} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Syncing Profile...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in duration-700">
            {/* 1. HERO HEADER */}
            <div className="bg-white border-b border-slate-100 pt-12 pb-20">
                <div className="max-w-4xl mx-auto px-6 flex flex-col items-center text-center">
                    <div className="relative mb-8">
                        <div className="w-32 h-32 rounded-[3rem] bg-linear-to-tr from-indigo-600 to-violet-500 p-1 shadow-2xl shadow-indigo-200">
                            <div className="w-full h-full rounded-[2.8rem] bg-white overflow-hidden border-4 border-white flex items-center justify-center">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-black italic text-indigo-600">{user?.name?.charAt(0)}</span>
                                )}
                            </div>
                        </div>
                        <button className="absolute bottom-0 right-0 w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center border-4 border-white hover:scale-110 transition-transform">
                            <Camera size={16} />
                        </button>
                    </div>

                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${rank.bg} border border-indigo-100 mb-4`}>
                        <ShieldCheck size={14} className={rank.color} />
                        <span className={`text-[10px] font-[1000] uppercase tracking-widest ${rank.color}`}>
                            {rank.title}
                        </span>
                    </div>

                    <h1 className="text-4xl font-[1000] italic tracking-tighter uppercase text-slate-900 leading-none">
                        {user?.name}
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
                        Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2026'} • {user?.role || 'User'}
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 -mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* 2. LEFT COLUMN: EDITABLE IDENTITY */}
                <div className="lg:col-span-7 space-y-6">
                    <form onSubmit={handleUpdate} className="bg-white border border-slate-100 rounded-[3rem] p-8 shadow-xl shadow-slate-200/50">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-sm font-[1000] uppercase italic tracking-widest text-slate-900">Personal Identity</h2>
                            <button 
                                type="submit" 
                                disabled={saving}
                                className="text-indigo-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                            >
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                Save Changes
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <EditableField 
                                icon={User} label="Full Name" name="name"
                                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                            <EditableField 
                                icon={Mail} label="Email Address" name="email" type="email"
                                value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                            <EditableField 
                                icon={Phone} label="Contact Number" name="phone"
                                value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            />
                            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-3xl opacity-60">
                                <MapPin size={18} className="text-slate-400" />
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Location</p>
                                    <p className="text-sm font-bold text-slate-900 tracking-tight">Iloilo City, PH</p>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* RECENT ACTIVITY */}
                    <div className="bg-white border border-slate-100 rounded-[3rem] p-8 shadow-xl shadow-slate-200/50">
                        <h2 className="text-sm font-[1000] uppercase italic tracking-widest text-slate-900 mb-8">Recent History</h2>
                        <div className="space-y-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <History size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 uppercase italic">Ground Zero Hub</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">3 Hour Session • ₱150</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-300 uppercase">2 days ago</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. RIGHT COLUMN: ACTIONS & WALLET */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="bg-indigo-600 rounded-[3rem] p-8 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <CreditCard size={120} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Loyalty Wallet</p>
                        <h3 className="text-4xl font-[1000] italic mt-2 tracking-tighter uppercase">
                            {user?.points?.toString().padStart(3, '0') || '000'} <span className="text-lg italic opacity-80">pts</span>
                        </h3>
                        <p className="text-[10px] font-bold mt-6 flex items-center gap-2 uppercase tracking-widest">
                            <Clock size={12} /> Syncing with Hub Points...
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="p-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-4">Account Controls</p>
                            <ActionButton icon={Settings} label="Global Preferences" onClick={() => {}} />
                            <div className="mt-3">
                                <ActionButton icon={Lock} label="Change Access Key" onClick={() => {}} />
                            </div>
                            <div className="mt-3">
                                <ActionButton 
                                    icon={LogOut} 
                                    label="Disconnect Session" 
                                    danger 
                                    onClick={logout} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-8 text-center">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Node ID: {user?._id?.slice(-8).toUpperCase()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;