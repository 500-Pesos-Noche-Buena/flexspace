import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { 
    Users, 
    MapPin, 
    Zap, 
    ArrowUpRight, 
    Clock, 
    QrCode
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';

const SpaceDashboard = () => {
    const [stats, setStats] = useState({ spaces: 0, bookings: 0, walkins: 0 });
    const [activeSessions, setActiveSessions] = useState([]);

    // Stable function for manual refreshes (e.g., after checkout)
    const fetchDashboardData = useCallback(async (isSilent = false) => {
        try {
            const res = await apiGet('/space/dashboard');
            if (res.success) {
                setStats(res.stats || { spaces: 0, bookings: 0, walkins: 0 });
                setActiveSessions(res.activeSessions || []);
            }
        } catch {
            // Only show error toast if it's not a silent background poll
            if (!isSilent) showToast({ icon: 'error', title: 'Failed to sync dashboard' });
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        // 1. Initial Load
        const loadInitial = async () => {
            const res = await apiGet('/space/dashboard');
            if (isMounted && res.success) {
                setStats(res.stats || { spaces: 0, bookings: 0, walkins: 0 });
                setActiveSessions(res.activeSessions || []);
            }
        };
        loadInitial();

        // 2. Set up the "Real-Time" subscription (Polling every 10 seconds)
        const interval = setInterval(() => {
            if (isMounted) fetchDashboardData(true);
        }, 10000);

        // 3. Cleanup on unmount
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchDashboardData]);

    const handleCheckout = async (sessionId) => {
        try {
            await apiPost(`/space/walkins/${sessionId}/checkout`);
            showToast({ icon: 'success', title: 'User checked out' });
            fetchDashboardData(); // Instant refresh after action
        } catch {
            showToast({ icon: 'error', title: 'Checkout failed' });
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-12">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Space Dashboard</h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Real-time hub operations & walk-in management.</p>
                </div>
                <div className="bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest">System Live: Iloilo Work</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-5 shadow-xl group hover:border-indigo-500/20 transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-inner group-hover:scale-110 transition-transform">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Active Spaces</p>
                        <p className="text-3xl font-black text-white italic tracking-tighter">{stats.spaces}</p>
                    </div>
                </div>

                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-5 shadow-xl group hover:border-amber-500/20 transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner group-hover:scale-110 transition-transform">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Total Bookings</p>
                        <p className="text-3xl font-black text-white italic tracking-tighter">{stats.bookings}</p>
                    </div>
                </div>

                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-5 shadow-xl group hover:border-emerald-500/20 transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform">
                        <Zap size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Walk-ins Today</p>
                        <p className="text-3xl font-black text-white italic tracking-tighter">{stats.walkins}</p>
                    </div>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white flex justify-between items-center group cursor-pointer overflow-hidden relative shadow-2xl shadow-indigo-900/40 active:scale-[0.98] transition-all">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">New Walk-in</h3>
                        <p className="text-xs font-bold opacity-70 mt-1 uppercase tracking-widest">Manual Registration</p>
                    </div>
                    <ArrowUpRight className="relative z-10 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500" size={28} />
                    <Zap size={180} className="absolute -right-7.5 -bottom-12.5 opacity-10 rotate-12 group-hover:rotate-25 transition-transform duration-700" />
                </div>

                <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-white flex justify-between items-center group cursor-pointer hover:bg-white hover:text-black transition-all duration-500 shadow-xl active:scale-[0.98]">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">Scan QR</h3>
                        <p className="text-xs font-bold text-slate-500 group-hover:text-black/60 mt-1 uppercase tracking-widest transition-colors">Instant Check-in</p>
                    </div>
                    <QrCode className="relative z-10 group-hover:scale-110 transition-transform" size={28} />
                </div>
            </div>

            {/* Live Occupancy */}
            <div className="mt-12">
                <div className="flex items-center justify-between mb-6 px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                        <h3 className="text-sm font-black text-white uppercase italic tracking-[0.2em]">Live Occupancy</h3>
                    </div>
                    <button className="text-[10px] font-black text-slate-500 uppercase hover:text-indigo-500 transition-colors">View All</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {activeSessions.length > 0 ? (
                        activeSessions.map((session) => (
                            <div key={session._id} className="bg-[#111114] border border-white/5 p-5 rounded-4xl flex items-center justify-between group hover:border-indigo-500/30 transition-all shadow-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-500 font-black italic border border-white/5 shadow-inner">
                                        {session.userName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white uppercase tracking-tight">{session.userName}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Clock size={10} className="text-slate-600" />
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Started {session.startTime}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleCheckout(session._id)}
                                        className="h-10 px-5 bg-emerald-500/10 text-emerald-500 rounded-xl text-[9px] font-black uppercase border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-emerald-900/10"
                                    >
                                        Checkout
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-12 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center opacity-50">
                            <Users size={32} className="text-slate-600 mb-3" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No active sessions at the moment</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpaceDashboard;