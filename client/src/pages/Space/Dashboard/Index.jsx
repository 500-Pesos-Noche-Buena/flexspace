import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import {
    Users,
    MapPin,
    Zap,
    ArrowUpRight,
    Clock,
    QrCode,
    TrendingUp,
    Calendar,
    ChevronRight
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { useNavigate } from 'react-router-dom'; // ← add if not imported

const SpaceDashboard = () => {
    const [stats, setStats] = useState({
        spaces: 0,
        bookings: 0,
        walkins: 0,
        revenue: 0
    });
    const [activeSessions, setActiveSessions] = useState([]);
    const [period, setPeriod] = useState('daily'); // daily, weekly, monthly, yearly
    const [isStaff, setIsStaff] = useState(false);
    const navigate = useNavigate();

    const fetchDashboardData = useCallback(async (isSilent = false) => {
        try {
            const res = await apiGet(`/space/dashboard?period=${period}`);
            if (res.success) {
                setIsStaff(res.isStaff);
                setStats(res.stats);
                setStats(res.stats || { spaces: 0, bookings: 0, walkins: 0, revenue: 0 });
                setActiveSessions(res.activeSessions || []);
            }
        } catch (error) {
            if (!isSilent) showToast({ icon: 'error', title: 'Failed to sync dashboard' });
            console.error("Dashboard Fetch Error:", error);
        }
    }, [period]);

    useEffect(() => {
        let isMounted = true;

        const loadInitial = async () => {
            await fetchDashboardData(true);
        };
        loadInitial();

        const interval = setInterval(() => {
            if (isMounted) fetchDashboardData(true);
        }, 15000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchDashboardData]);

    const handleCheckout = async (sessionId) => {
        try {
            await apiPost(`/space/walkins/${sessionId}/checkout`);
            showToast({ icon: 'success', title: 'User checked out' });
            fetchDashboardData();
        } catch {
            showToast({ icon: 'error', title: 'Checkout failed' });
        }
    };

    const periodFilters = [
        { id: 'daily', label: 'Today' },
        { id: 'weekly', label: 'Week' },
        { id: 'monthly', label: 'Month' },
        { id: 'yearly', label: 'Year' },
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-12">

            {/* --- HEADER & FILTERS --- */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Hub Command</h1>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-[0.3em]">Operational Intelligence • Iloilo City</p>
                </div>

                <div className="flex bg-[#111114] border border-white/5 p-1 rounded-2xl shadow-2xl">
                    {periodFilters.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setPeriod(f.id)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${period === f.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- PRIMARY STATS GRID --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">

                {/* REVENUE CARD - High Contrast Emerald */}
                {/* Optional: wrap in !isStaff if you don't want staff seeing the total money */}
                <div className="relative overflow-hidden bg-[#0a0a0c] border border-white/[0.03] p-6 rounded-[2rem] flex flex-col justify-between group hover:border-emerald-500/30 transition-all duration-500 shadow-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black transition-all duration-500">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg uppercase tracking-tighter">Live</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Revenue ({period})</p>
                        <p className="text-3xl font-black text-white tracking-tighter">
                            ₱{stats.revenue?.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* SPACES / ACTIVE LOAD - Indigo */}
                {!isStaff ? (
                    <div className="bg-[#0a0a0c] border border-white/[0.03] p-6 rounded-[2rem] flex flex-col justify-between group hover:border-indigo-500/30 transition-all duration-500 shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500 mb-4">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Your Spaces</p>
                            <p className="text-3xl font-black text-white tracking-tighter">{stats.spaces}</p>
                        </div>
                    </div>
                ) : (
                    /* If Staff, show 'Today's Goal' or 'Active Sessions' instead of 'Your Spaces' */
                    <div className="bg-[#0a0a0c] border border-white/[0.03] p-6 rounded-[2rem] flex flex-col justify-between group hover:border-sky-500/30 transition-all duration-500 shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500 border border-sky-500/20 mb-4">
                            <Zap size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Active Sessions</p>
                            <p className="text-3xl font-black text-white tracking-tighter">{stats.active || 0}</p>
                        </div>
                    </div>
                )}

                {/* TOTAL BOOKINGS - Amber */}
                <div className="bg-[#0a0a0c] border border-white/[0.03] p-6 rounded-[2rem] flex flex-col justify-between group hover:border-amber-500/30 transition-all duration-500 shadow-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-black transition-all duration-500 mb-4">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Total Bookings</p>
                        <p className="text-3xl font-black text-white tracking-tighter">{stats.bookings}</p>
                    </div>
                </div>

                {/* WALKINS - Slate/White */}
                <div className="bg-[#0a0a0c] border border-white/[0.03] p-6 rounded-[2rem] flex flex-col justify-between group hover:border-white/30 transition-all duration-500 shadow-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white border border-white/10 group-hover:bg-white group-hover:text-black transition-all duration-500 mb-4">
                        <Zap size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Walk-ins Today</p>
                        <p className="text-3xl font-black text-white tracking-tighter">{stats.walkins}</p>
                    </div>
                </div>
            </div>

          {/* --- QUICK ACTIONS --- */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
    <div 
        onClick={() => navigate('/space/walkins')}
        className="p-8 bg-indigo-600 rounded-[2.5rem] text-white flex justify-between items-center group cursor-pointer overflow-hidden relative shadow-2xl shadow-indigo-900/40 active:scale-[0.98] transition-all">
        <div className="relative z-10">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">New Walk-in</h3>
            <p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">Manual Register User</p>
        </div>
        <ArrowUpRight className="relative z-10 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500" size={32} />
        <Zap size={160} className="absolute -right-8 -bottom-10 opacity-10 rotate-12 group-hover:rotate-25 transition-transform duration-700" />
    </div>

    <div 
        onClick={() => navigate('/space/bookings')}
        className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-white flex justify-between items-center group cursor-pointer hover:bg-white hover:text-black transition-all duration-500 shadow-xl active:scale-[0.98]">
        <div className="relative z-10">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Scan QR</h3>
            <p className="text-[10px] font-bold text-slate-500 group-hover:text-black/60 mt-1 uppercase tracking-widest transition-colors">Digital Ticket Entry</p>
        </div>
        <QrCode className="relative z-10 group-hover:scale-110 transition-transform" size={32} />
    </div>
</div>

            {/* --- LIVE OCCUPANCY SECTION --- */}
            <div className="mt-12">
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute inset-0"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500 relative"></div>
                        </div>
                        <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Live Traffic</h3>
                    </div>
                    <button className="text-[10px] font-black text-slate-500 uppercase hover:text-indigo-500 flex items-center gap-2 transition-all">
                        View All Activity <ChevronRight size={14} />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {activeSessions.length > 0 ? (
                        activeSessions.map((session) => (
                            <div key={session._id} className="bg-[#111114] border border-white/5 p-6 rounded-[2rem] flex items-center justify-between group hover:border-indigo-500/30 transition-all shadow-lg">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400 font-black text-xl italic border border-white/5">
                                        {session.userName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-md font-black text-white uppercase tracking-tight">{session.userName}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Clock size={12} className="text-slate-600" />
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Checked in at {session.startTime}</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCheckout(session._id)}
                                    className="h-12 px-6 bg-emerald-500/10 text-emerald-500 rounded-2xl text-[10px] font-black uppercase border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
                                >
                                    End Session
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-16 bg-white/5 rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center opacity-40">
                            <Calendar size={40} className="text-slate-600 mb-4" />
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">No Active Guests in the Hub</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpaceDashboard;