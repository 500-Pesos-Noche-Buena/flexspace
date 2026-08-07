import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    Award,
    AlertCircle,
    ShoppingBag
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils/cn';
import { useTheme } from '@/hooks/useTheme';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" }
    }
};

const SpaceDashboard = () => {
    const { themeColor } = useTheme(); 
    const [stats, setStats] = useState({
        spaces: 0,
        bookings: 0,
        walkins: 0,
        posOrders: 0,
        totalOrders: 0,
        grossRevenue: 0,
        bookingRevenue: 0,
        posRevenue: 0,
        netRevenue: 0,
        platformFees: 0,
        platformFeePercent: 0,
        pendingFees: 0
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
                setStats(res.stats || { 
                    spaces: 0, 
                    bookings: 0, 
                    walkins: 0,
                    posOrders: 0,
                    totalOrders: 0,
                    grossRevenue: 0,
                    bookingRevenue: 0,
                    posRevenue: 0,
                    netRevenue: 0,
                    platformFees: 0,
                    platformFeePercent: 0,
                    pendingFees: 0 
                });
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
            await fetchAllAnalytics();
        };
        loadInitial();

        const interval = setInterval(() => {
            if (isMounted) {
                fetchDashboardData(true);
                fetchAllAnalytics();
            }
        }, 15000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchDashboardData, fetchAllAnalytics]);

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

    // Get dynamic button color based on theme
    const getButtonColor = () => {
        const colors = {
            indigo: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40',
            emerald: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40',
            purple: 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/40',
            blue: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40',
            rose: 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40',
            amber: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40',
        };
        return colors[themeColor] || colors.indigo;
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="px-4 md:px-0 pb-12"
        >
            {/* --- HEADER & FILTERS --- */}
            <motion.div variants={itemVariants} className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase italic">Hub Command</h1>
                    <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-[0.3em]">Operational Intelligence • Iloilo City</p>
                </div>

                <Tabs value={period} onValueChange={setPeriod} className="w-auto">
                    <TabsList className="bg-card border border-border rounded-2xl p-1 shadow-2xl">
                        {periodFilters.map((f) => (
                            <TabsTrigger
                                key={f.id}
                                value={f.id}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg text-muted-foreground transition-all"
                                style={{ 
                                    backgroundColor: period === f.id ? `var(--theme-primary)` : undefined,
                                    color: period === f.id ? 'white' : undefined
                                }}
                            >
                                {f.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </motion.div>

            {/* --- PRIMARY STATS GRID --- */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {/* GROSS REVENUE CARD - Now shows combined Booking + POS */}
                <Card className="relative overflow-hidden bg-card border-border hover:border-primary/30 transition-all duration-500 shadow-2xl">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 transition-all duration-500">
                                <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg uppercase tracking-tighter">Live</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Total Revenue ({period})</p>
                            <p className="text-2xl font-black text-foreground tracking-tighter">
                                ₱{stats.grossRevenue?.toLocaleString()}
                            </p>
                            {/* Breakdown */}
                            <div className="mt-2 flex gap-3 text-[9px]">
                                <span className="text-muted-foreground">Booking: <span className="font-bold text-emerald-600">₱{stats.bookingRevenue?.toLocaleString()}</span></span>
                                <span className="text-muted-foreground">POS: <span className="font-bold text-blue-600">₱{stats.posRevenue?.toLocaleString()}</span></span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-border">
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-muted-foreground">Net Earnings:</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">₱{stats.netRevenue?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] mt-1">
                                    <span className="text-muted-foreground">Platform Fees ({stats.platformFeePercent || 0}%):</span>
                                    <span className="font-bold text-amber-600 dark:text-amber-400">₱{stats.platformFees?.toLocaleString()}</span>
                                </div>
                                {stats.pendingFees > 0 && (
                                    <div className="flex justify-between items-center text-[10px] mt-1">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <AlertCircle size={10} className="text-red-500" />
                                            Pending Fees:
                                        </span>
                                        <span className="font-bold text-red-600 dark:text-red-400 animate-pulse">₱{stats.pendingFees?.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* TOTAL ORDERS (Bookings + POS) */}
                <Card className="bg-card border-border hover:border-primary/30 transition-all duration-500 shadow-2xl">
                    <CardContent className="p-6 flex flex-col justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-4">
                            <ShoppingBag size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Total Orders ({period})</p>
                            <p className="text-3xl font-black text-foreground tracking-tighter">{stats.totalOrders}</p>
                            <div className="flex gap-3 text-[9px] mt-1">
                                <span className="text-muted-foreground">Bookings: <span className="font-bold">{stats.bookings}</span></span>
                                <span className="text-muted-foreground">POS: <span className="font-bold">{stats.posOrders}</span></span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* SPACES / ACTIVE LOAD */}
                {!isStaff ? (
                    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-500 shadow-2xl">
                        <CardContent className="p-6 flex flex-col justify-between">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-4">
                                <MapPin size={20} style={{ color: `var(--theme-primary)` }} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Your Spaces</p>
                                <p className="text-3xl font-black text-foreground tracking-tighter">{stats.spaces}</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-500 shadow-2xl">
                        <CardContent className="p-6 flex flex-col justify-between">
                            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-500/20 mb-4">
                                <Zap size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Active Sessions</p>
                                <p className="text-3xl font-black text-foreground tracking-tighter">{activeSessions.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* WALKINS */}
                <Card className="bg-card border-border hover:border-primary/30 transition-all duration-500 shadow-2xl">
                    <CardContent className="p-6 flex flex-col justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 mb-4">
                            <Users size={20} className="text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Walk-ins Today</p>
                            <p className="text-3xl font-black text-foreground tracking-tighter">{stats.walkins}</p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* --- VOUCHER STATS SECTION --- */}
            <motion.div variants={itemVariants} className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Ticket size={16} style={{ color: `var(--theme-primary)` }} />
                    </div>
                    <h2 className="text-lg font-black text-foreground uppercase italic tracking-tighter">Voucher Performance</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="bg-card border-border">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Ticket size={14} style={{ color: `var(--theme-primary)` }} />
                                </div>
                                <p className="text-[8px] font-black uppercase text-muted-foreground">Vouchers Created</p>
                            </div>
                            <p className="text-2xl font-[1000] text-foreground">{voucherStats.totalVouchers}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <Coins size={14} className="text-amber-600 dark:text-amber-400" />
                                </div>
                                <p className="text-[8px] font-black uppercase text-muted-foreground">Points Redeemed</p>
                            </div>
                            <p className="text-2xl font-[1000] text-foreground">{voucherStats.totalRedemptions}</p>
                            <p className="text-[8px] text-muted-foreground mt-1">users exchanged points</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Gift size={14} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <p className="text-[8px] font-black uppercase text-muted-foreground">Discount Given</p>
                            </div>
                            <p className="text-2xl font-[1000] text-emerald-600 dark:text-emerald-400">₱{voucherStats.totalDiscountGiven.toLocaleString()}</p>
                            <p className="text-[8px] text-muted-foreground mt-1">worth of vouchers redeemed</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Ticket size={14} style={{ color: `var(--theme-primary)` }} />
                                </div>
                                <p className="text-[8px] font-black uppercase text-muted-foreground">Vouchers Used</p>
                            </div>
                            <p className="text-2xl font-[1000] text-foreground">{voucherStats.vouchersUsed}</p>
                            <p className="text-[8px] text-muted-foreground mt-1">applied at checkout</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <p className="text-[8px] font-black uppercase text-muted-foreground">Customer Savings</p>
                            </div>
                            <p className="text-2xl font-[1000] text-emerald-600 dark:text-emerald-400">₱{voucherStats.totalSavedByCustomers.toLocaleString()}</p>
                            <p className="text-[8px] text-muted-foreground mt-1">total discount applied</p>
                        </CardContent>
                    </Card>
                </div>
            </motion.div>

            {/* --- QUICK ACTIONS --- */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                <Button
                    onClick={() => navigate('/space/bookings')}
                    className={cn(
                        "p-8 rounded-[2.5rem] text-white flex justify-between items-center group cursor-pointer overflow-hidden relative shadow-2xl active:scale-[0.98] transition-all h-auto",
                        getButtonColor()
                    )}
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
                    className="p-8 bg-muted border-border hover:bg-primary hover:text-primary-foreground rounded-[2.5rem] text-foreground flex justify-between items-center group cursor-pointer transition-all duration-500 shadow-xl active:scale-[0.98] h-auto"
                >
                    <div className="relative z-10 text-left">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">Scan QR</h3>
                        <p className="text-[10px] font-bold text-muted-foreground group-hover:text-primary-foreground/60 mt-1 uppercase tracking-widest transition-colors">Digital Ticket Entry</p>
                    </div>
                    <QrCode className="relative z-10 group-hover:scale-110 transition-transform" size={32} />
                </Button>
            </motion.div>

            {/* --- LIVE OCCUPANCY SECTION --- */}
            <motion.div variants={itemVariants} className="mt-12">
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute inset-0"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500 relative"></div>
                        </div>
                        <h3 className="text-lg font-black text-foreground uppercase italic tracking-tighter">Live Traffic</h3>
                    </div>
                    <Button variant="ghost" className="text-[10px] font-black text-muted-foreground uppercase hover:text-primary flex items-center gap-2 transition-all">
                        View All Activity <ChevronRight size={14} />
                    </Button>
                </div>

                <AnimatePresence>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {activeSessions.length > 0 ? (
                            activeSessions.map((session, idx) => (
                                <motion.div
                                    key={session._id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <Card className="bg-card border-border hover:border-primary/30 transition-all shadow-lg">
                                        <CardContent className="p-6 flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center font-black text-xl italic border border-border">
                                                    {session.userName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-md font-black text-foreground uppercase tracking-tight">{session.userName}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Clock size={12} className="text-muted-foreground" />
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Checked in at {session.startTime}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => handleCheckout(session._id)}
                                                variant="outline"
                                                className="h-12 px-6 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl text-[10px] font-black uppercase border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
                                            >
                                                End Session
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="col-span-full py-16 bg-muted rounded-[3rem] border border-dashed border-border flex flex-col items-center justify-center text-center"
                            >
                                <Calendar size={40} className="text-muted-foreground mb-4" />
                                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">No Active Guests in the Hub</p>
                            </motion.div>
                        )}
                    </div>
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};

export default SpaceDashboard;