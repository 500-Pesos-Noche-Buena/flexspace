import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import { apiGet } from '@/utils/Api';
import {
    Users, MapPin, Clock, Banknote, ArrowUpRight, Loader2, RefreshCw,
    Building2, TrendingUp, TrendingDown, Activity, Award, Crown,
    AlertTriangle, BarChart3, Calendar, Star, StarHalf,
    ShoppingBag, Ticket, Gift, Coins, Zap, Target, Globe,
    MessageSquare, CheckCircle, XCircle, Clock as ClockIcon,
    TrendingUp as TrendingUpIcon, DollarSign, PieChart,
    Layers, Sparkles, Shield, Zap as ZapIcon, Eye,
    Calendar as CalendarIcon, UserCheck, UserX, UserPlus
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/formatNumber';
import { useTheme } from '@/hooks/useTheme';

let globalDashboardPollingInstance = null;

const StatCard = ({ title, value, icon, trend, subValue, color = 'primary' }) => {
    const { themeColor } = useTheme();
    const theme = themeColor;

    const colorMap = {
        primary: `text-${theme}-600 dark:text-${theme}-400 bg-${theme}-500/10 border-${theme}-500/20`,
        blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
        emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        purple: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
        amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        rose: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
        indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    };

    const displayValue = typeof value === 'string' && value.includes('₱')
        ? value
        : formatNumber(value);

    return (
        <div className="bg-card p-5 rounded-4xl border border-border group hover:border-primary/30 transition-all duration-500 shadow-xl">
            <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-xl border transition-all duration-500", colorMap[color] || colorMap.primary)}>
                    {icon}
                </div>
                {trend && (
                    <span className="text-[7px] font-black text-muted-foreground uppercase tracking-wider bg-muted px-2 py-1 rounded-lg">
                        {trend}
                    </span>
                )}
            </div>
            <h4 className="text-xl font-black text-foreground mb-0.5 truncate italic tracking-tighter">{displayValue}</h4>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
            {subValue && (
                <p className="text-[8px] text-muted-foreground/70 mt-1">{subValue}</p>
            )}
        </div>
    );
};

// Star Rating Component
const StarRating = ({ rating }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
        <div className="flex items-center gap-0.5">
            {[...Array(fullStars)].map((_, i) => (
                <Star key={`full-${i}`} size={12} className="fill-amber-500 text-amber-500" />
            ))}
            {hasHalfStar && <StarHalf size={12} className="fill-amber-500 text-amber-500" />}
            {[...Array(emptyStars)].map((_, i) => (
                <Star key={`empty-${i}`} size={12} className="text-muted-foreground/30" />
            ))}
            <span className="text-[8px] text-muted-foreground ml-1">({rating.toFixed(1)})</span>
        </div>
    );
};

// Mini Progress Bar
const MiniProgress = ({ value, max, label, color = 'emerald' }) => {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const colorMap = {
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        rose: 'bg-rose-500',
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-[8px] text-muted-foreground w-12 truncate">{label}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", colorMap[color] || 'bg-primary')} style={{ width: `${percentage}%` }} />
            </div>
            <span className="text-[7px] font-black text-muted-foreground w-8 text-right">{value}</span>
        </div>
    );
};

// Quick Action Button
const QuickAction = ({ icon: Icon, label, onClick, color = 'primary' }) => {
    const colorMap = {
        primary: 'bg-primary/10 text-primary hover:bg-primary hover:text-white',
        emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white',
        purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500 hover:text-white',
        blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white',
        amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white',
        rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white',
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95",
                colorMap[color] || colorMap.primary
            )}
        >
            <Icon size={14} />
            {label}
        </button>
    );
};

const AdminDashboard = () => {
    const { logout } = useContext(AuthContext);
    const { themeColor } = useTheme();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        totalUsers: 0,
        totalSpaceHubs: 0,
        activeSpaces: 0,
        pendingRequests: 0,
        monthlyRevenue: "0",
        recentRequests: [],
        // New stats
        totalBookings: 0,
        activeBookings: 0,
        completedBookings: 0,
        totalOrders: 0,
        totalVouchers: 0,
        vouchersUsed: 0,
        platformFeesCollected: 0,
        pendingFees: 0,
        newUsersThisMonth: 0,
        userGrowth: 0,
        revenueGrowth: 0,
        bookingGrowth: 0,
        totalReviews: 0,
        avgRating: 0,
        totalEarnings: 0
    });

    // Advanced analytics states
    const [platformOccupancy, setPlatformOccupancy] = useState({
        platform: { occupancyRate: 0, activeBookings: 0, totalCapacity: 0, totalSpaces: 0 },
        strugglingSpaces: [],
        thrivingSpaces: []
    });
    const [revenueTrend, setRevenueTrend] = useState({ trend: [], growth: 0, totalRevenue: 0 });
    const [topSpaces, setTopSpaces] = useState([]);
    const [userGrowth, setUserGrowth] = useState({ growth: [], totals: {} });
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [trendPeriod, setTrendPeriod] = useState('monthly');

    const lastDashboardFingerprint = useRef("");
    const [loading, setLoading] = useState(true);

    const getColorClass = () => {
        const colors = {
            indigo: 'indigo',
            emerald: 'emerald',
            purple: 'purple',
            blue: 'blue',
            rose: 'rose',
            amber: 'amber',
        };
        return colors[themeColor] || 'indigo';
    };

    const fetchDashboardData = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return logout();

            const res = await apiGet('/admin/dashboard');
            const freshData = res.data || res;
            const currentFingerprint = JSON.stringify(freshData);

            if (currentFingerprint !== lastDashboardFingerprint.current) {
                lastDashboardFingerprint.current = currentFingerprint;
                setStats(freshData);
                if (!isInitial) console.log("📊 System Stats Synced: " + new Date().toLocaleTimeString());
            }
        } catch {
            if (isInitial) showToast({ icon: 'error', title: 'Dashboard sync failed' });
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [logout]);

    const fetchAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);
        try {
            const [occupancyRes, revenueRes, topSpacesRes, userGrowthRes] = await Promise.all([
                apiGet('/admin/dashboard/occupancy'),
                apiGet(`/admin/dashboard/revenue-trend?period=${trendPeriod}`),
                apiGet('/admin/dashboard/top-spaces?limit=5&sort=bookings'),
                apiGet('/admin/dashboard/user-growth')
            ]);

            if (occupancyRes.success) setPlatformOccupancy(occupancyRes.data);
            if (revenueRes.success) setRevenueTrend(revenueRes.data);
            if (topSpacesRes.success) setTopSpaces(topSpacesRes.data);
            if (userGrowthRes.success) setUserGrowth(userGrowthRes.data);
        } catch (err) {
            console.error('Analytics fetch error:', err);
        } finally {
            setAnalyticsLoading(false);
        }
    }, [trendPeriod]);

    useEffect(() => {
        if (globalDashboardPollingInstance) clearInterval(globalDashboardPollingInstance);
        fetchDashboardData(true);
        fetchAnalytics();

        globalDashboardPollingInstance = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchDashboardData(false);
            }
        }, 15000);

        return () => {
            if (globalDashboardPollingInstance) {
                clearInterval(globalDashboardPollingInstance);
                globalDashboardPollingInstance = null;
            }
        };
    }, [fetchDashboardData, fetchAnalytics]);

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-foreground rounded-full animate-pulse" />
                    </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">
                    Loading Platform Intelligence...
                </p>
            </div>
        );
    }

    const color = getColorClass();

    // Quick actions
    const quickActions = [
        { icon: Users, label: 'Manage Users', path: '/admin/users', color: 'blue' },
        { icon: Building2, label: 'Spaces', path: '/admin/space/management', color: 'emerald' },
        { icon: Ticket, label: 'Vouchers', path: '/admin/vouchers', color: 'purple' },
        { icon: DollarSign, label: 'Earnings', path: '/admin/earnings', color: 'amber' },
        { icon: BarChart3, label: 'Analytics', path: '/admin/insights', color: 'indigo' },
        { icon: Activity, label: 'Queue', path: '/admin/queues', color: 'cyan' },
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* Header */}
            <div className="mb-6 md:mb-8 flex flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground uppercase italic">Platform Command Center</h1>
                    <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-widest">Real-time platform intelligence & monitoring</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-[8px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                    </div>
                    <button onClick={() => { fetchDashboardData(true); fetchAnalytics(); }} className="p-3 bg-muted rounded-2xl border border-border hover:bg-muted/80 transition-all active:scale-95 group">
                        <RefreshCw className="w-4 h-4 text-primary group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* Primary Stats Grid - Expanded */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-8">
                <StatCard 
                    title="Total Users" 
                    value={stats.totalUsers} 
                    icon={<Users size={16} />} 
                    trend="Active" 
                    color="blue"
                    subValue={`+${stats.newUsersThisMonth || 0} this month`}
                />
                <StatCard 
                    title="Space Owners" 
                    value={stats.totalSpaceHubs} 
                    icon={<Building2 size={16} />} 
                    trend="Registered" 
                    color="purple"
                />
                <StatCard 
                    title="Active Spaces" 
                    value={stats.activeSpaces} 
                    icon={<MapPin size={16} />} 
                    trend="Live Now" 
                    color="emerald"
                />
                <StatCard 
                    title="Pending" 
                    value={stats.pendingRequests} 
                    icon={<Clock size={16} />} 
                    trend="Applications" 
                    color="amber"
                />
                <StatCard 
                    title="Total Bookings" 
                    value={stats.totalBookings || 0} 
                    icon={<CalendarIcon size={16} />} 
                    trend="All Time" 
                    color="indigo"
                />
                <StatCard 
                    title="Platform Revenue" 
                    value={`₱${formatNumber(stats.monthlyRevenue)}`} 
                    icon={<Banknote size={16} />} 
                    trend="This Month" 
                    color="rose"
                />
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
                <StatCard 
                    title="Active Bookings" 
                    value={stats.activeBookings || 0} 
                    icon={<Zap size={14} />} 
                    trend="Now" 
                    color="emerald"
                />
                <StatCard 
                    title="Completed" 
                    value={stats.completedBookings || 0} 
                    icon={<CheckCircle size={14} />} 
                    trend="All Time" 
                    color="blue"
                />
                <StatCard 
                    title="POS Orders" 
                    value={stats.totalOrders || 0} 
                    icon={<ShoppingBag size={14} />} 
                    trend="Sales" 
                    color="purple"
                />
                <StatCard 
                    title="Vouchers" 
                    value={stats.totalVouchers || 0} 
                    icon={<Ticket size={14} />} 
                    trend="Created" 
                    color="amber"
                />
                <StatCard 
                    title="Reviews" 
                    value={stats.totalReviews || 0} 
                    icon={<MessageSquare size={14} />} 
                    trend={`⭐ ${(stats.avgRating || 0).toFixed(1)}`} 
                    color="cyan"
                />
                <StatCard 
                    title="Platform Fees" 
                    value={`₱${formatNumber(stats.platformFeesCollected || 0)}`} 
                    icon={<Coins size={14} />} 
                    trend="Collected" 
                    color="rose"
                />
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <ZapIcon size={14} className="text-primary" />
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Quick Actions</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {quickActions.map((action, idx) => (
                        <QuickAction
                            key={idx}
                            icon={action.icon}
                            label={action.label}
                            color={action.color}
                            onClick={() => navigate(action.path)}
                        />
                    ))}
                </div>
            </div>

            {/* Platform Analytics Section */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className={`w-8 h-8 rounded-xl bg-${color}-500/10 flex items-center justify-center`}>
                        <BarChart3 size={16} className="text-primary" />
                    </div>
                    <h2 className="text-lg font-black text-foreground uppercase italic tracking-tighter">Platform Analytics</h2>
                    {analyticsLoading && <Loader2 size={14} className="text-muted-foreground animate-spin ml-2" />}
                </div>

                {/* Row 1: Platform Occupancy + Revenue Trend */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Platform Occupancy Card */}
                    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-500">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <Activity size={16} className="text-emerald-600 dark:text-emerald-400" />
                                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Live Occupancy</h3>
                                </div>
                                <span className={cn(
                                    "text-[8px] font-black px-2 py-1 rounded-full",
                                    platformOccupancy.platform.occupancyRate >= 70 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                                        platformOccupancy.platform.occupancyRate >= 40 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                )}>
                                    {platformOccupancy.platform.occupancyRate >= 70 ? "🔥 HIGH" :
                                        platformOccupancy.platform.occupancyRate >= 40 ? "⚡ MODERATE" : "🌿 LOW"}
                                </span>
                            </div>
                            <div className="text-5xl font-black text-foreground mb-2">{platformOccupancy.platform.occupancyRate}%</div>
                            <div className="w-full bg-muted rounded-full h-2 mb-3">
                                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${platformOccupancy.platform.occupancyRate}%` }} />
                            </div>
                            <p className="text-[10px] text-muted-foreground mb-4">
                                {platformOccupancy.platform.activeBookings} active of {platformOccupancy.platform.totalCapacity} total seats
                            </p>

                            {/* Thriving Spaces */}
                            {platformOccupancy.thrivingSpaces?.length > 0 && (
                                <div className="mt-3 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" />
                                        <p className="text-[8px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Thriving Spaces</p>
                                    </div>
                                    <div className="space-y-1">
                                        {platformOccupancy.thrivingSpaces.slice(0, 3).map((space, idx) => (
                                            <div key={idx} className="flex justify-between text-[9px]">
                                                <span className="text-muted-foreground">{space.name}</span>
                                                <span className="text-emerald-600 dark:text-emerald-400">{space.occupancyRate}% occupied</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Struggling Spaces Alert */}
                            {platformOccupancy.strugglingSpaces?.length > 0 && (
                                <div className="mt-3 p-3 bg-rose-500/5 rounded-xl border border-rose-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle size={12} className="text-rose-600 dark:text-rose-400" />
                                        <p className="text-[8px] text-rose-600 dark:text-rose-400 uppercase tracking-wider">Needs Attention</p>
                                    </div>
                                    <div className="space-y-1">
                                        {platformOccupancy.strugglingSpaces.slice(0, 3).map((space, idx) => (
                                            <div key={idx} className="flex justify-between text-[9px]">
                                                <span className="text-muted-foreground">{space.name}</span>
                                                <span className="text-rose-600 dark:text-rose-400">{space.occupancyRate}% occupancy</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Revenue Trend Card */}
                    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-500">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={16} className="text-primary" />
                                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Revenue Trend</h3>
                                </div>
                                <div className="flex gap-1">
                                    {['daily', 'weekly', 'monthly'].map(p => (
                                        <button key={p} onClick={() => setTrendPeriod(p)} className={cn(
                                            "text-[8px] px-2 py-1 rounded-lg uppercase font-black transition-all",
                                            trendPeriod === p ? `bg-${color}-500/20 text-primary` : "text-muted-foreground hover:text-foreground"
                                        )}>
                                            {p[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-end gap-1 h-24 mb-3">
                                {revenueTrend.trend?.slice(-7).map((item, idx) => {
                                    const maxRevenue = Math.max(...(revenueTrend.trend?.map(t => t.revenue) || [1]), 1);
                                    const height = (item.revenue / maxRevenue) * 100;
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center group">
                                            <div className="w-full bg-primary/30 rounded-t-lg" style={{ height: `${Math.max(4, height)}px` }}>
                                                <div className="w-full bg-primary rounded-t-lg" style={{ height: `${height}px` }} />
                                            </div>
                                            <span className="text-[5px] text-muted-foreground mt-1">{String(item._id).slice(5)}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-border">
                                <div>
                                    <p className="text-[7px] text-muted-foreground">Total Revenue</p>
                                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">₱{formatNumber(revenueTrend.totalRevenue || 0)}</p>
                                </div>
                                {revenueTrend.growth !== 0 && (
                                    <div className={cn("flex items-center gap-1 text-[8px] font-black", revenueTrend.growth > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                        {revenueTrend.growth > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                        {Math.abs(revenueTrend.growth)}% vs last
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Row 2: Top Spaces + User Growth + Activity Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top Performing Spaces */}
                    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-500">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Crown size={16} className="text-amber-600 dark:text-amber-400" />
                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">🏆 Most Visited</h3>
                            </div>
                            <div className="space-y-3">
                                {topSpaces.length > 0 ? (
                                    topSpaces.map((space, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 w-5">#{idx + 1}</span>
                                                <div>
                                                    <p className="text-[11px] font-black text-foreground">{space.spaceName}</p>
                                                    <p className="text-[7px] text-muted-foreground">{space.ownerName}</p>
                                                    <StarRating rating={space.rating || 0} />
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{formatNumber(space.totalBookings)} visits</p>
                                                <p className="text-[7px] text-muted-foreground">{formatNumber(space.totalWalkins || 0)} walk-ins</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-[9px] text-muted-foreground py-4">No booking data yet</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* User Growth */}
                    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-500">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Users size={16} className="text-blue-600 dark:text-blue-400" />
                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">User Growth</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="text-center p-2 bg-blue-500/5 rounded-xl">
                                    <p className="text-lg font-black text-blue-600 dark:text-blue-400">{formatNumber(userGrowth.totals?.all || 0)}</p>
                                    <p className="text-[6px] text-muted-foreground uppercase">Total</p>
                                </div>
                                <div className="text-center p-2 bg-purple-500/5 rounded-xl">
                                    <p className="text-lg font-black text-purple-600 dark:text-purple-400">{formatNumber(userGrowth.totals?.spaceOwners || 0)}</p>
                                    <p className="text-[6px] text-muted-foreground uppercase">Owners</p>
                                </div>
                                <div className="text-center p-2 bg-emerald-500/5 rounded-xl">
                                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatNumber(userGrowth.totals?.regularUsers || 0)}</p>
                                    <p className="text-[6px] text-muted-foreground uppercase">Users</p>
                                </div>
                            </div>
                            <div className="flex items-end gap-1 h-16">
                                {userGrowth.growth?.slice(-7).map((item, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center">
                                        <div className="w-full bg-blue-500/30 rounded-t-lg" style={{ height: `${(item.users / Math.max(...(userGrowth.growth?.map(g => g.users) || [1]), 1)) * 40}px` }}>
                                            <div className="w-full bg-blue-500 rounded-t-lg" style={{ height: `${(item.users / Math.max(...(userGrowth.growth?.map(g => g.users) || [1]), 1)) * 40}px` }} />
                                        </div>
                                        <span className="text-[5px] text-muted-foreground mt-1">{String(item._id).slice(5)}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Platform Status Card */}
                    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-500">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield size={16} className="text-primary" />
                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Platform Health</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-2 bg-muted rounded-xl">
                                    <span className="text-[9px] text-muted-foreground">Total Spaces</span>
                                    <span className="text-[10px] font-black text-foreground">{stats.activeSpaces || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-muted rounded-xl">
                                    <span className="text-[9px] text-muted-foreground">Total Bookings</span>
                                    <span className="text-[10px] font-black text-foreground">{stats.totalBookings || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-muted rounded-xl">
                                    <span className="text-[9px] text-muted-foreground">Total Reviews</span>
                                    <span className="text-[10px] font-black text-foreground">{stats.totalReviews || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-muted rounded-xl">
                                    <span className="text-[9px] text-muted-foreground">Average Rating</span>
                                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">⭐ {(stats.avgRating || 0).toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-muted rounded-xl">
                                    <span className="text-[9px] text-muted-foreground">Pending Requests</span>
                                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">{stats.pendingRequests || 0}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Recent Applications Section */}
            <div className="mt-6 bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-2xl">
                <div className="px-6 py-5 border-b border-border flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ClockIcon size={14} className="text-muted-foreground" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">Incoming Applications</h3>
                        {stats.pendingRequests > 0 && (
                            <span className="text-[8px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-black">
                                {stats.pendingRequests} pending
                            </span>
                        )}
                    </div>
                    <button onClick={() => navigate('/admin/space/applications')} className="text-[10px] font-black text-primary hover:text-primary/80 uppercase tracking-widest transition-all flex items-center gap-1">
                        Review All <ArrowUpRight className="w-3 h-3" />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[9px] font-black text-muted-foreground uppercase tracking-widest bg-muted/20">
                                <th className="px-6 py-4">Business</th>
                                <th className="px-6 py-4 hidden sm:table-cell">Owner</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentRequests?.length > 0 ? (
                                stats.recentRequests.map((req, i) => (
                                    <tr key={i} className="border-t border-border hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-black text-foreground text-[11px] uppercase italic tracking-tight">{req.name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground text-[10px] font-bold uppercase tracking-widest hidden sm:table-cell">{req.ownerName}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all bg-muted px-3 py-1.5 rounded-xl border border-border">
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" className="px-6 py-12 text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">No pending applications</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;