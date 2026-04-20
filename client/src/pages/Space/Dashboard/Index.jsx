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
    ChevronRight,
    Ticket,
    Gift,
    Coins
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SpaceDashboard = () => {
    const [stats, setStats] = useState({
        spaces: 0,
        bookings: 0,
        walkins: 0,
        revenue: 0
    });
    const [voucherStats, setVoucherStats] = useState({
        totalVouchers: 0,
        totalRedemptions: 0,
        totalDiscountGiven: 0,
        vouchersUsed: 0,
        totalSavedByCustomers: 0
    });
    const [activeSessions, setActiveSessions] = useState([]);
    const [period, setPeriod] = useState('daily');
    const [isStaff, setIsStaff] = useState(false);
    const navigate = useNavigate();

    const fetchDashboardData = useCallback(async (isSilent = false) => {
        try {
            const res = await apiGet(`/space/dashboard?period=${period}`);
            if (res.success) {
                setIsStaff(res.isStaff);
                setStats(res.stats || { spaces: 0, bookings: 0, walkins: 0, revenue: 0 });
                setVoucherStats(res.voucherStats || {
                    totalVouchers: 0,
                    totalRedemptions: 0,
                    totalDiscountGiven: 0,
                    vouchersUsed: 0,
                    totalSavedByCustomers: 0
                });
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

                <Tabs value={period} onValueChange={setPeriod} className="w-auto">
                    <TabsList className="bg-[#111114] border border-white/5 rounded-2xl p-1 shadow-2xl">
                        {periodFilters.map((f) => (
                            <TabsTrigger
                                key={f.id}
                                value={f.id}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-900/20 text-slate-500"
                            >
                                {f.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            {/* --- PRIMARY STATS GRID --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {/* REVENUE CARD */}
                <Card className="relative overflow-hidden bg-[#0a0a0c] border-white/3 hover:border-emerald-500/30 transition-all duration-500 shadow-2xl">
                    <CardContent className="p-6 flex flex-col justify-between">
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
                    </CardContent>
                </Card>

                {/* SPACES / ACTIVE LOAD */}
                {!isStaff ? (
                    <Card className="bg-[#0a0a0c] border-white/3 hover:border-indigo-500/30 transition-all duration-500 shadow-2xl">
                        <CardContent className="p-6 flex flex-col justify-between">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 mb-4">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Your Spaces</p>
                                <p className="text-3xl font-black text-white tracking-tighter">{stats.spaces}</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-[#0a0a0c] border-white/3 hover:border-sky-500/30 transition-all duration-500 shadow-2xl">
                        <CardContent className="p-6 flex flex-col justify-between">
                            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500 border border-sky-500/20 mb-4">
                                <Zap size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Active Sessions</p>
                                <p className="text-3xl font-black text-white tracking-tighter">{activeSessions.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* TOTAL BOOKINGS */}
                <Card className="bg-[#0a0a0c] border-white/3 hover:border-amber-500/30 transition-all duration-500 shadow-2xl">
                    <CardContent className="p-6 flex flex-col justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 mb-4">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Total Bookings</p>
                            <p className="text-3xl font-black text-white tracking-tighter">{stats.bookings}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* WALKINS */}
                <Card className="bg-[#0a0a0c] border-white/3 hover:border-white/30 transition-all duration-500 shadow-2xl">
                    <CardContent className="p-6 flex flex-col justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white border border-white/10 mb-4">
                            <Zap size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Walk-ins Today</p>
                            <p className="text-3xl font-black text-white tracking-tighter">{stats.walkins}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- VOUCHER STATS SECTION --- */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Ticket size={16} className="text-purple-400" />
                    </div>
                    <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">Voucher Performance</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="bg-[#111114] border-white/5">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                    <Ticket size={14} className="text-indigo-400" />
                                </div>
                                <p className="text-[8px] font-black uppercase text-slate-500">Vouchers Created</p>
                            </div>
                            <p className="text-2xl font-[1000] text-white">{voucherStats.totalVouchers}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#111114] border-white/5">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <Coins size={14} className="text-amber-400" />
                                </div>
                                <p className="text-[8px] font-black uppercase text-slate-500">Points Redeemed</p>
                            </div>
                            <p className="text-2xl font-[1000] text-white">{voucherStats.totalRedemptions}</p>
                            <p className="text-[8px] text-slate-500 mt-1">users exchanged points</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#111114] border-white/5">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Gift size={14} className="text-emerald-400" />
                                </div>
                                <p className="text-[8px] font-black uppercase text-slate-500">Discount Given</p>
                            </div>
                            <p className="text-2xl font-[1000] text-emerald-400">₱{voucherStats.totalDiscountGiven.toLocaleString()}</p>
                            <p className="text-[8px] text-slate-500 mt-1">worth of vouchers redeemed</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#111114] border-white/5">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                    <Ticket size={14} className="text-purple-400" />
                                </div>
                                <p className="text-[8px] font-black uppercase text-slate-500">Vouchers Used</p>
                            </div>
                            <p className="text-2xl font-[1000] text-white">{voucherStats.vouchersUsed}</p>
                            <p className="text-[8px] text-slate-500 mt-1">applied at checkout</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#111114] border-white/5">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <TrendingUp size={14} className="text-emerald-400" />
                                </div>
                                <p className="text-[8px] font-black uppercase text-slate-500">Customer Savings</p>
                            </div>
                            <p className="text-2xl font-[1000] text-emerald-400">₱{voucherStats.totalSavedByCustomers.toLocaleString()}</p>
                            <p className="text-[8px] text-slate-500 mt-1">total discount applied</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* --- QUICK ACTIONS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                <Button
                    onClick={() => navigate('/space/walkins')}
                    className="p-8 bg-indigo-600 hover:bg-indigo-500 rounded-[2.5rem] text-white flex justify-between items-center group cursor-pointer overflow-hidden relative shadow-2xl shadow-indigo-900/40 active:scale-[0.98] transition-all h-auto"
                >
                    <div className="relative z-10 text-left">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">New Walk-in</h3>
                        <p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">Manual Register User</p>
                    </div>
                    <ArrowUpRight className="relative z-10 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500" size={32} />
                    <Zap size={160} className="absolute -right-8 -bottom-10 opacity-10 rotate-12 group-hover:rotate-25 transition-transform duration-700" />
                </Button>

                <Button
                    onClick={() => navigate('/space/bookings')}
                    variant="outline"
                    className="p-8 bg-white/5 border-white/10 hover:bg-white hover:text-black rounded-[2.5rem] text-white flex justify-between items-center group cursor-pointer transition-all duration-500 shadow-xl active:scale-[0.98] h-auto"
                >
                    <div className="relative z-10 text-left">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">Scan QR</h3>
                        <p className="text-[10px] font-bold text-slate-500 group-hover:text-black/60 mt-1 uppercase tracking-widest transition-colors">Digital Ticket Entry</p>
                    </div>
                    <QrCode className="relative z-10 group-hover:scale-110 transition-transform" size={32} />
                </Button>
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
                    <Button variant="ghost" className="text-[10px] font-black text-slate-500 uppercase hover:text-indigo-500 flex items-center gap-2 transition-all">
                        View All Activity <ChevronRight size={14} />
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {activeSessions.length > 0 ? (
                        activeSessions.map((session) => (
                            <Card key={session._id} className="bg-[#111114] border-white/5 hover:border-indigo-500/30 transition-all shadow-lg">
                                <CardContent className="p-6 flex items-center justify-between">
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
                                    <Button
                                        onClick={() => handleCheckout(session._id)}
                                        variant="outline"
                                        className="h-12 px-6 bg-emerald-500/10 text-emerald-500 rounded-2xl text-[10px] font-black uppercase border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
                                    >
                                        End Session
                                    </Button>
                                </CardContent>
                            </Card>
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