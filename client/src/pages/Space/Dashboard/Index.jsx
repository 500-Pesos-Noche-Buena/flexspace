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
    Coins,
    BarChart3,
    Loader2,
    Activity,
    Award
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils/cn';

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
    const [occupancy, setOccupancy] = useState({
        current: { occupancyRate: 0, occupiedSeats: 0, totalSeats: 0, status: 'quiet' },
        spaces: [],
        historical: []
    });
    const [peakHours, setPeakHours] = useState({ hours: [], topHours: [], bestHour: null });
    const [customerLoyalty, setCustomerLoyalty] = useState({
        summary: { returnRate: 0, totalCustomers: 0, newCustomersLast30Days: 0 },
        topCustomers: []
    });
    const [revenueTrend, setRevenueTrend] = useState({ trend: [], growth: 0 });
    const [analyticsLoading, setAnalyticsLoading] = useState(true);

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

    const fetchOccupancy = useCallback(async () => {
        try {
            const res = await apiGet('/space/dashboard/occupancy');
            if (res.success) setOccupancy(res.data);
        } catch (err) {
            console.error('Occupancy fetch error:', err);
        }
    }, []);

    const fetchPeakHours = useCallback(async () => {
        try {
            const res = await apiGet(`/space/dashboard/peak-hours?period=${period}`);
            if (res.success) setPeakHours(res.data);
        } catch (err) {
            console.error('Peak hours fetch error:', err);
        }
    }, [period]);

    const fetchCustomerLoyalty = useCallback(async () => {
        try {
            const res = await apiGet('/space/dashboard/customer-loyalty');
            if (res.success) setCustomerLoyalty(res.data);
        } catch (err) {
            console.error('Customer loyalty fetch error:', err);
        }
    }, []);

    const fetchRevenueTrend = useCallback(async () => {
        try {
            const res = await apiGet(`/space/dashboard/revenue-trend?period=${period}`);
            if (res.success) setRevenueTrend(res.data);
        } catch (err) {
            console.error('Revenue trend fetch error:', err);
        }
    }, [period]);

    const fetchAllAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);
        await Promise.all([
            fetchOccupancy(),
            fetchPeakHours(),
            fetchCustomerLoyalty(),
            fetchRevenueTrend()
        ]);
        setAnalyticsLoading(false);
    }, [fetchOccupancy, fetchPeakHours, fetchCustomerLoyalty, fetchRevenueTrend]);

    useEffect(() => {
        let isMounted = true;

        const loadInitial = async () => {
            await fetchDashboardData(true);
            await fetchAllAnalytics();  // ADD THIS LINE
        };
        loadInitial();

        const interval = setInterval(() => {
            if (isMounted) {
                fetchDashboardData(true);
                fetchAllAnalytics();  // ADD THIS LINE
            }
        }, 15000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchDashboardData, fetchAllAnalytics]);  // UPDATE DEPENDENCIES

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


            {/* ============ ADVANCED ANALYTICS SECTION ============ */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <BarChart3 size={16} className="text-indigo-400" />
                    </div>
                    <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">Performance Analytics</h2>
                    {analyticsLoading && (
                        <Loader2 size={14} className="text-slate-500 animate-spin ml-2" />
                    )}
                </div>

                {/* Row 1: Occupancy + Peak Hours */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* OCCUPANCY CARD */}
                    <Card className="bg-[#111114] border-white/5 hover:border-emerald-500/30 transition-all duration-500">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <Activity size={16} className="text-emerald-400" />
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Live Occupancy</h3>
                                </div>
                                <span className={cn(
                                    "text-[8px] font-black px-2 py-1 rounded-full uppercase",
                                    occupancy.current.status === 'busy' && "bg-red-500/10 text-red-400",
                                    occupancy.current.status === 'moderate' && "bg-yellow-500/10 text-yellow-400",
                                    occupancy.current.status === 'quiet' && "bg-emerald-500/10 text-emerald-400"
                                )}>
                                    {occupancy.current.status === 'busy' ? '🔥 BUSY' : occupancy.current.status === 'moderate' ? '⚡ MODERATE' : '🌿 QUIET'}
                                </span>
                            </div>

                            <div className="text-5xl font-black text-white mb-2">
                                {occupancy.current.occupancyRate}%
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
                                <div
                                    className={cn(
                                        "h-2 rounded-full transition-all duration-500",
                                        occupancy.current.occupancyRate >= 80 ? "bg-red-500" :
                                            occupancy.current.occupancyRate >= 40 ? "bg-yellow-500" : "bg-emerald-500"
                                    )}
                                    style={{ width: `${occupancy.current.occupancyRate}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400">
                                {occupancy.current.occupiedSeats} of {occupancy.current.totalSeats} seats filled
                            </p>

                            {/* Space breakdown */}
                            {occupancy.spaces.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-[8px] text-slate-500 uppercase tracking-wider mb-2">Per Space</p>
                                    <div className="space-y-2">
                                        {occupancy.spaces.slice(0, 3).map((space, idx) => (
                                            <div key={idx} className="flex justify-between text-[9px]">
                                                <span className="text-slate-400">{space.name}</span>
                                                <span className="text-white font-bold">{space.capacity} seats</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* PEAK HOURS CARD */}
                    <Card className="bg-[#111114] border-white/5 hover:border-indigo-500/30 transition-all duration-500">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock size={16} className="text-indigo-400" />
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Peak Hours ({period})</h3>
                            </div>

                            {peakHours.bestHour && (
                                <div className="mb-4 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                    <p className="text-[8px] text-indigo-400 uppercase tracking-wider">Best Time</p>
                                    <p className="text-xl font-black text-white">{peakHours.bestHour.label}</p>
                                    <p className="text-[9px] text-slate-400">{peakHours.bestHour.bookings} bookings</p>
                                </div>
                            )}

                            {/* Hourly heatmap bars */}
                            <div className="flex items-end gap-1 h-24">
                                {peakHours.hours.filter((_, i) => i % 3 === 0 || i === 12 || i === 18).map((hour) => (
                                    <div key={hour.hour} className="flex-1 flex flex-col items-center">
                                        <div
                                            className="w-full bg-indigo-500/30 rounded-t-lg transition-all duration-300 hover:bg-indigo-500 cursor-pointer"
                                            style={{ height: `${Math.max(4, hour.percentage * 0.6)}px` }}
                                        >
                                            <div
                                                className="w-full bg-indigo-500 rounded-t-lg opacity-70 hover:opacity-100 transition-all"
                                                style={{ height: `${hour.percentage * 0.6}px` }}
                                            />
                                        </div>
                                        <span className="text-[7px] text-slate-500 mt-1">{hour.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/5">
                                <p className="text-[8px] text-slate-500 uppercase">
                                    Total: {peakHours.totalBookings || 0} bookings this {period}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Row 2: Customer Loyalty + Revenue Trend */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CUSTOMER LOYALTY CARD */}
                    <Card className="bg-[#111114] border-white/5 hover:border-purple-500/30 transition-all duration-500">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Award size={16} className="text-purple-400" />
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Customer Loyalty</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="text-center p-3 bg-purple-500/5 rounded-xl">
                                    <p className="text-2xl font-black text-purple-400">{customerLoyalty.summary.returnRate}%</p>
                                    <p className="text-[8px] text-slate-500 uppercase">Return Rate</p>
                                </div>
                                <div className="text-center p-3 bg-emerald-500/5 rounded-xl">
                                    <p className="text-2xl font-black text-emerald-400">{customerLoyalty.summary.totalCustomers || 0}</p>
                                    <p className="text-[8px] text-slate-500 uppercase">Total Customers</p>
                                </div>
                            </div>

                            <div className="flex justify-between text-[9px] mb-3">
                                <span className="text-slate-500">Returning: {customerLoyalty.summary.returningCustomers || 0}</span>
                                <span className="text-slate-500">New (30d): {customerLoyalty.summary.newCustomersLast30Days || 0}</span>
                            </div>

                            {/* Top Customers */}
                            {customerLoyalty.topCustomers.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/5">
                                    <p className="text-[8px] text-slate-500 uppercase tracking-wider mb-2">🏆 Top Customers</p>
                                    <div className="space-y-2">
                                        {customerLoyalty.topCustomers.slice(0, 3).map((customer, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[9px] font-black text-purple-400">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="text-[10px] text-white font-medium truncate max-w-30">
                                                        {customer.name}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] text-emerald-400 font-bold">₱{customer.totalSpent.toLocaleString()}</p>
                                                    <p className="text-[7px] text-slate-500">{customer.totalBookings} visits</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                   {/* REVENUE TREND CARD - FIXED VERSION */}
<Card className="bg-[#111114] border-white/5 hover:border-emerald-500/30 transition-all duration-500">
    <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" />
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Revenue Trend ({period})</h3>
            </div>
            {revenueTrend.growth !== 0 && revenueTrend.growth !== undefined && (
                <span className={cn(
                    "text-[8px] font-black px-2 py-1 rounded-full",
                    revenueTrend.growth > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                )}>
                    {revenueTrend.growth > 0 ? "↑" : "↓"} {Math.abs(revenueTrend.growth)}% vs last
                </span>
            )}
        </div>
        
        {/* Bar chart - handles single or multiple data points */}
        <div className="flex items-end gap-2 h-32 mb-3">
            {revenueTrend.trend && revenueTrend.trend.length > 0 ? (
                (() => {
                    const displayData = [...revenueTrend.trend].slice(-7);
                    const maxRevenue = Math.max(...displayData.map(t => t.revenue), 1);
                    
                    return displayData.map((item, idx) => {
                        const heightPercent = (item.revenue / maxRevenue) * 100;
                        const barHeight = Math.max(8, heightPercent);
                        
                        // Format date nicely
                        let dateLabel = item._id;
                        if (period === 'daily' || period === 'weekly') {
                            const parts = String(item._id).split('-');
                            if (parts.length === 3) {
                                dateLabel = `${parts[1]}/${parts[2]}`;
                            }
                        } else if (period === 'monthly') {
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            const monthNum = parseInt(String(item._id).split('-')[1]) - 1;
                            dateLabel = monthNames[monthNum] || item._id;
                        }
                        
                        return (
                            <div key={idx} className="flex-1 flex flex-col items-center group">
                                <div className="relative w-full flex justify-center">
                                    <div 
                                        className="w-8 bg-emerald-500/20 rounded-t-lg hover:bg-emerald-500/40 transition-all cursor-pointer group-hover:scale-105"
                                        style={{ height: `${barHeight}px` }}
                                    >
                                        <div 
                                            className="w-full bg-emerald-500 rounded-t-lg transition-all"
                                            style={{ height: `${heightPercent}%` }}
                                        />
                                    </div>
                                    {/* Tooltip on hover */}
                                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none shadow-lg">
                                        <p className="text-[8px] text-emerald-400 font-black">₱{item.revenue.toLocaleString()}</p>
                                        <p className="text-[6px] text-slate-400">{item.bookings} booking{item.bookings !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                                <span className="text-[7px] text-slate-500 mt-2 font-mono">
                                    {dateLabel}
                                </span>
                            </div>
                        );
                    });
                })()
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 text-[9px]">
                    No revenue data for this period
                </div>
            )}
        </div>
        
        {/* Summary stats */}
        <div className="flex justify-between items-center pt-3 border-t border-white/5">
            <div>
                <p className="text-[8px] text-slate-500 uppercase tracking-wider">Total Revenue</p>
                <p className="text-lg font-black text-emerald-400">
                    ₱{(revenueTrend.totalRevenue || 0).toLocaleString()}
                </p>
            </div>
            <div className="text-right">
                <p className="text-[8px] text-slate-500 uppercase tracking-wider">Total Bookings</p>
                <p className="text-lg font-black text-white">{revenueTrend.totalBookings || 0}</p>
            </div>
            {revenueTrend.trend && revenueTrend.trend.length > 1 && (
                <div className="text-right">
                    <p className="text-[8px] text-slate-500 uppercase tracking-wider">Period Range</p>
                    <p className="text-[7px] font-mono text-slate-500">
                        {revenueTrend.trend[0]?._id?.slice(5)} → {revenueTrend.trend.slice(-1)[0]?._id?.slice(5)}
                    </p>
                </div>
            )}
        </div>
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