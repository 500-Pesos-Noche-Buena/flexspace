import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    User, Mail, MapPin, ShieldCheck, Edit3, Camera,
    Clock, History, CreditCard, Settings,
    LogOut, ChevronRight, Loader2, Save, Lock, Zap, Coins, Calendar, TrendingUp, ArrowRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPost, apiPut } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';

/** --- HORIZONTAL SCROLL FOR ACTIVITY (Mobile Optimized) --- **/
const HorizontalActivityScroll = ({ activities, loading }) => {
    const scrollContainerRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = direction === 'left' ? -300 : 300;
            scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowLeftArrow(scrollLeft > 20);
            setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 20);
        }
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScroll);
            checkScroll();
            return () => container.removeEventListener('scroll', checkScroll);
        }
    }, [activities]);

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        <History size={16} className="text-indigo-600 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black uppercase italic text-slate-900 tracking-tight">
                            Recent Activity
                        </h2>
                        <p className="text-[8px] sm:text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-0.5 sm:mt-1">
                            Your latest sessions
                        </p>
                    </div>
                </div>

                {/* Navigation Arrows - Desktop only */}
                <div className="hidden sm:flex gap-2">
                    <button
                        onClick={() => scroll('left')}
                        className={`p-2 rounded-full border border-slate-200 transition-all ${showLeftArrow ? 'bg-white text-slate-700 hover:bg-indigo-50 hover:border-indigo-200' : 'opacity-30 cursor-not-allowed'}`}
                        disabled={!showLeftArrow}
                    >
                        <ChevronRight size={16} className="rotate-180" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className={`p-2 rounded-full border border-slate-200 transition-all ${showRightArrow ? 'bg-white text-slate-700 hover:bg-indigo-50 hover:border-indigo-200' : 'opacity-30 cursor-not-allowed'}`}
                        disabled={!showRightArrow}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Horizontal Scroll Container */}
            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto scrollbar-hide gap-4 sm:gap-6 pb-4 -mx-4 px-4 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {activities.length > 0 ? activities.map((activity, idx) => (
                    <div key={idx} className="w-72 sm:w-80 shrink-0 snap-start">
                        <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 hover:border-indigo-100 transition-all shadow-sm">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                                    <Calendar size={18} className="text-indigo-600 sm:w-5 sm:h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm font-black text-slate-900 uppercase italic truncate">
                                        {activity.spaceName || 'Workspace Hub'}
                                    </p>
                                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                        {activity.duration} hrs • ₱{activity.amount}
                                    </p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                                        {activity.date}
                                    </p>
                                </div>
                                <Coins size={14} className="text-amber-500 shrink-0" />
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="w-full py-12 text-center">
                        <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">
                            No recent activity yet
                        </p>
                        <button
                            onClick={() => window.location.href = '/user/space'}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                        >
                            Book Your First Space
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile swipe hint */}
            {activities.length > 0 && (
                <div className="flex justify-center mt-3 sm:hidden">
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-300"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    </div>
                    <p className="text-[7px] text-slate-400 ml-2">Swipe to see more →</p>
                </div>
            )}
        </div>
    );
};

/** --- STAT CARD (Mobile Optimized) --- **/
const ProfileStatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white border border-slate-100 p-3 sm:p-4 rounded-2xl sm:rounded-3xl text-center hover:border-indigo-200 transition-all shadow-sm">
        <div className="flex items-center justify-center mb-1.5 sm:mb-2">
            <Icon size={16} className={`${color} opacity-70 sm:w-5 sm:h-5`} />
        </div>
        <h3 className={`text-xl sm:text-2xl font-[1000] ${color} tracking-tighter`}>{value}</h3>
        <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
);

/** --- EDITABLE FIELD (Mobile Optimized) --- **/
const EditableField = ({ icon: Icon, label, value, onChange, name, type = "text", required = false }) => (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-slate-100 rounded-xl sm:rounded-3xl focus-within:border-indigo-200 transition-all group shadow-sm">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-focus-within:bg-indigo-50 group-focus-within:text-indigo-600 transition-colors shrink-0">
            <Icon size={14} className="sm:w-4.5 sm:h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
            <input
                type={type}
                name={name}
                value={value || ''}
                onChange={onChange}
                required={required}
                className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 focus:outline-none placeholder:text-slate-300 truncate"
                placeholder={`Enter ${label.toLowerCase()}...`}
            />
        </div>
    </div>
);

/** --- ACTION BUTTON (Mobile Optimized) --- **/
const ActionButton = ({ icon: Icon, label, onClick, danger = false, disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center justify-between w-full p-4 sm:p-5 rounded-2xl sm:rounded-4xl border transition-all group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${danger
            ? 'bg-red-50 border-red-100 hover:bg-red-100 text-red-600'
            : 'bg-white border-slate-100 hover:border-indigo-200 text-slate-900 shadow-sm'
            }`}
    >
        <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center ${danger ? 'bg-white' : 'bg-slate-50 group-hover:bg-indigo-50'}`}>
                <Icon size={14} className={`sm:w-4.5 sm:h-4.5 ${danger ? 'text-red-600' : 'text-slate-400 group-hover:text-indigo-600'}`} />
            </div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <ChevronRight size={14} className={`sm:w-4 sm:h-4 ${danger ? 'text-red-300' : 'text-slate-300 group-hover:text-indigo-400'}`} />
    </button>
);

/** --- CHANGE PASSWORD MODAL --- **/
const ChangePasswordModal = ({ isOpen, onClose, onSuccess }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            showToast({ icon: 'error', title: 'Passwords do not match' });
            return;
        }

        if (newPassword.length < 6) {
            showToast({ icon: 'error', title: 'Password must be at least 6 characters' });
            return;
        }

        setLoading(true);
        try {
            await apiPost('/auth/profile/update-password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            showToast({ icon: 'success', title: 'Password updated successfully' });
            onSuccess();
            onClose();
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Failed to update password' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6">
                <h3 className="text-xl font-black text-slate-900 mb-4">Change Password</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Password</label>
                        <input
                            type="password"
                            required
                            className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">New Password</label>
                        <input
                            type="password"
                            required
                            className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Confirm New Password</label>
                        <input
                            type="password"
                            required
                            className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 rounded-xl font-black text-sm">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Update'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/** --- STICKY SAVE BUTTON (Mobile) --- **/
const StickySaveButton = ({ show, onSave, saving }) => (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50 transition-all duration-500 ease-in-out ${show ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
        }`}>
        <button
            onClick={onSave}
            disabled={saving}
            className="w-full bg-indigo-600 text-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex items-center justify-center gap-2 shadow-2xl shadow-indigo-600/30 active:scale-[0.98] transition-all"
        >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest">
                {saving ? 'Saving...' : 'Save Profile Changes'}
            </span>
        </button>
    </div>
);

/** --- MAIN PROFILE COMPONENT (Mobile Optimized) --- **/
const UserProfile = () => {
    const { logout, user: authUser } = useAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activitiesLoading, setActivitiesLoading] = useState(true);
    const [showStickySave, setShowStickySave] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const [formData, setFormData] = useState({ name: '', email: '' });
    const [activities, setActivities] = useState([]);
    const [stats, setStats] = useState({ bookings: 0, hours: 0, points: 0 });

    const fetchProfile = useCallback(async (isSilent = false) => {
        try {
            const res = await apiGet('/auth/profile');
            const data = res.data || res;
            if (data) {
                setUser(data);
                setFormData({
                    name: data.name || '',
                    email: data.email || ''
                });
            }
        } catch (err) {
            if (!isSilent) showToast({ icon: 'error', title: 'Sync Error' });
        }
    }, []);

    const fetchUserStats = useCallback(async () => {
        try {
            // Use the user dashboard endpoint instead
            const res = await apiGet('/user/dashboard');
            const data = res.data || res;
            if (data?.stats) {
                setStats({
                    bookings: parseInt(data.stats.total_bookings) || 0,
                    hours: parseInt(data.stats.total_hours) || 0,
                    points: parseInt(data.stats.loyalty_points) || 0
                });
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
            // Set default values
            setStats({ bookings: 0, hours: 0, points: 0 });
        }
    }, []);

    const fetchRecentActivity = useCallback(async () => {
        setActivitiesLoading(true);
        try {
            const res = await apiGet('/auth/recent-activity');
            console.log('Recent activity response:', res); // Debug log

            // Check if response has data property
            if (res && res.success && Array.isArray(res.data)) {
                setActivities(res.data);
            } else if (res && Array.isArray(res)) {
                setActivities(res);
            } else {
                console.log('No activities found or invalid format');
                setActivities([]);
            }
        } catch (err) {
            console.error('Failed to fetch activity:', err);
            setActivities([]);
        } finally {
            setActivitiesLoading(false);
        }
    }, []);

    // Heartbeat Sync & Scroll Listener
    useEffect(() => {
        let isMounted = true;
        const loadInitial = async () => {
            setLoading(true);
            await Promise.all([
                fetchProfile(false),
                fetchUserStats(),
                fetchRecentActivity()
            ]);
            if (isMounted) setLoading(false);
        };
        loadInitial();

        const interval = setInterval(() => {
            if (isMounted && document.visibilityState === 'visible' && !saving) {
                fetchProfile(true);
                fetchUserStats();
            }
        }, 10000);

        // Sticky save button visibility
        const handleScroll = () => {
            const formElement = document.querySelector('#profile-form');
            if (formElement) {
                const rect = formElement.getBoundingClientRect();
                setShowStickySave(rect.bottom < 0 || rect.top > window.innerHeight);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            isMounted = false;
            clearInterval(interval);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [fetchProfile, fetchUserStats, fetchRecentActivity, saving]);

    const handleUpdate = async (e) => {
        if (e) e.preventDefault();
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

    const rank = getRank(stats.points);

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <div className="relative">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-3 sm:border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                <Zap size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
            </div>
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Syncing Profile...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 sm:pb-32 selection:bg-indigo-100 animate-in fade-in duration-700">

            {/* 1. HERO HEADER - Mobile Optimized */}
            <div className="bg-white border-b border-slate-100 pt-6 sm:pt-12 pb-12 sm:pb-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
                    <div className="relative mb-6 sm:mb-8">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-[3rem] bg-linear-to-tr from-indigo-600 to-violet-500 p-1 shadow-2xl shadow-indigo-200">
                            <div className="w-full h-full rounded-xl sm:rounded-[2.8rem] bg-white overflow-hidden border-4 border-white flex items-center justify-center">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl sm:text-3xl font-black italic text-indigo-600">{user?.name?.charAt(0)}</span>
                                )}
                            </div>
                        </div>
                        {/* Google Badge */}
                        {user?.authProvider === 'google' && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-linear-to-r from-indigo-600 to-indigo-500 text-white text-[8px] font-black px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-md z-10">
                                Google
                            </div>
                        )}
                    </div>

                    <div className={`inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full ${rank.bg} border border-indigo-100 mb-3 sm:mb-4`}>
                        <ShieldCheck size={12} className={`${rank.color} sm:w-3.5 sm:h-3.5`} />
                        <span className={`text-[9px] sm:text-[10px] font-[1000] uppercase tracking-widest ${rank.color}`}>
                            {rank.title}
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-[1000] italic tracking-tighter uppercase text-slate-900 leading-none wrap-break-word max-w-full px-4">
                        {user?.name}
                    </h1>
                    <p className="text-[9px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">
                        Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2026'} • {user?.role || 'User'}
                    </p>

                    {/* Google Account Message */}
                    {user?.authProvider === 'google' && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">
                            <svg className="w-3 h-3" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Connected with Google</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 sm:-mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">

                {/* 2. LEFT COLUMN: EDITABLE IDENTITY */}
                <div className="lg:col-span-7 space-y-6 sm:space-y-8">
                    {/* Stats Row - Mobile */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <ProfileStatCard
                            icon={Calendar}
                            label="Bookings"
                            value={String(stats.bookings).padStart(2, '0')}
                            color="text-indigo-600"
                        />
                        <ProfileStatCard
                            icon={Clock}
                            label="Hours"
                            value={String(stats.hours).padStart(2, '0')}
                            color="text-emerald-600"
                        />
                        <ProfileStatCard
                            icon={Coins}
                            label="Points"
                            value={String(stats.points).padStart(3, '0')}
                            color="text-amber-600"
                        />
                    </div>

                    <form id="profile-form" onSubmit={handleUpdate} className="bg-white border border-slate-100 rounded-2xl sm:rounded-[3rem] p-4 sm:p-8 shadow-xl shadow-slate-200/50">
                        <div className="flex items-center justify-between mb-6 sm:mb-8">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                    <User size={14} className="text-indigo-600 sm:w-4 sm:h-4" />
                                </div>
                                <h2 className="text-xs sm:text-sm font-[1000] uppercase italic tracking-widest text-slate-900">
                                    Personal Identity
                                </h2>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="hidden sm:flex text-indigo-600 text-[10px] font-black uppercase tracking-widest items-center gap-2 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                            >
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                Save Changes
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:gap-4">
                            <EditableField
                                icon={User} label="Full Name" name="name"
                                value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                            <EditableField
                                icon={Mail} label="Email Address" name="email" type="email"
                                value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-3xl opacity-60">
                                <MapPin size={14} className="text-slate-400 sm:w-4 sm:h-4" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Location</p>
                                    <p className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">Iloilo City, PH</p>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* RECENT ACTIVITY - Horizontal Scroll */}
                    <HorizontalActivityScroll activities={activities} loading={activitiesLoading} />
                </div>

                {/* 3. RIGHT COLUMN: ACTIONS & WALLET */}
                <div className="lg:col-span-5 space-y-4 sm:space-y-6">
                    {/* Loyalty Wallet - Mobile Optimized */}
                    <div className="bg-indigo-600 rounded-2xl sm:rounded-[3rem] p-6 sm:p-8 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <CreditCard size={80} className="sm:w-30 sm:h-30" />
                        </div>
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Loyalty Wallet</p>
                        <h3 className="text-3xl sm:text-4xl font-[1000] italic mt-2 tracking-tighter uppercase">
                            {String(stats.points).padStart(3, '0')} <span className="text-base sm:text-lg italic opacity-80">pts</span>
                        </h3>
                        <p className="text-[9px] sm:text-[10px] font-bold mt-4 sm:mt-6 flex items-center gap-2 uppercase tracking-widest">
                            <Clock size={10} className="sm:w-3 sm:h-3" /> {stats.bookings} bookings completed
                        </p>
                    </div>

                    {/* Account Controls */}
                    <div className="space-y-3">
                        <div className="p-2">
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 sm:mb-4 ml-2 sm:ml-4">
                                Account Controls
                            </p>
                            <ActionButton
                                icon={Lock}
                                label="Change Password"
                                onClick={() => setShowPasswordModal(true)}
                            />
                            <div className="mt-2 sm:mt-3">
                                <ActionButton
                                    icon={LogOut}
                                    label="Disconnect Session"
                                    danger
                                    onClick={logout}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Node ID */}
                    <div className="p-4 sm:p-8 text-center">
                        <p className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] sm:tracking-[0.4em]">
                            Node ID: {user?._id?.slice(-8).toUpperCase()}
                        </p>
                    </div>
                </div>
            </div>

            {/* 4. STICKY SAVE BUTTON (Mobile Only) */}
            <StickySaveButton show={showStickySave} onSave={handleUpdate} saving={saving} />

            {/* Change Password Modal */}
            <ChangePasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                onSuccess={() => {
                    // Refresh profile after password change
                    fetchProfile(false);
                }}
            />
        </div>
    );
};

export default UserProfile;