import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import { apiGet } from '@/utils/Api';
import { 
    Users, MapPin, Clock, Banknote, ArrowUpRight, Loader2, RefreshCw, 
    Building2, TrendingUp, TrendingDown, Activity, Award, Crown, 
    AlertTriangle, BarChart3, Calendar
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';

let globalDashboardPollingInstance = null;

const AdminDashboard = () => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        totalUsers: 0,
        totalSpaceHubs: 0,
        activeSpaces: 0,
        pendingRequests: 0,
        monthlyRevenue: "0",
        recentRequests: []
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
                apiGet('/admin/dashboard/top-spaces?limit=5'),
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
        }, 10000);

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
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
                    Initializing System Core...
                </p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* Header */}
            <div className="mb-6 md:mb-8 flex flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase italic">System Overview</h1>
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-widest">Network health monitoring & analytics</p>
                </div>
                <button onClick={() => { fetchDashboardData(true); fetchAnalytics(); }} className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all active:scale-95 group">
                    <RefreshCw className="w-4 h-4 text-indigo-500 group-hover:rotate-180 transition-transform duration-500" />
                </button>
            </div>

            {/* Primary Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-8">
                <StatCard title="Users" value={stats.totalUsers} icon={<Users size={16} className="text-blue-500" />} trend="Active" />
                <StatCard title="Space Owners" value={stats.totalSpaceHubs} icon={<Building2 size={16} className="text-purple-500" />} trend="Registered" />
                <StatCard title="Active Spaces" value={stats.activeSpaces} icon={<MapPin size={16} className="text-emerald-500" />} trend="Live Now" />
                <StatCard title="Pending" value={stats.pendingRequests} icon={<Clock size={16} className="text-yellow-500" />} trend="Applications" />
                <StatCard title="Monthly Revenue" value={`₱${stats.monthlyRevenue}`} icon={<Banknote size={16} className="text-pink-500" />} trend="This Month" />
            </div>

            {/* Platform Analytics Section */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <BarChart3 size={16} className="text-indigo-400" />
                    </div>
                    <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">Platform Analytics</h2>
                    {analyticsLoading && <Loader2 size={14} className="text-slate-500 animate-spin ml-2" />}
                </div>

                {/* Row 1: Platform Occupancy + Revenue Trend */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Platform Occupancy Card */}
                    <Card className="bg-[#111114] border-white/5 hover:border-emerald-500/30 transition-all duration-500">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <Activity size={16} className="text-emerald-400" />
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Platform Occupancy</h3>
                                </div>
                                <span className={cn(
                                    "text-[8px] font-black px-2 py-1 rounded-full",
                                    platformOccupancy.platform.occupancyRate >= 70 ? "bg-red-500/10 text-red-400" :
                                    platformOccupancy.platform.occupancyRate >= 40 ? "bg-yellow-500/10 text-yellow-400" : "bg-emerald-500/10 text-emerald-400"
                                )}>
                                    {platformOccupancy.platform.occupancyRate >= 70 ? "🔥 HIGH" : 
                                     platformOccupancy.platform.occupancyRate >= 40 ? "⚡ MODERATE" : "🌿 LOW"}
                                </span>
                            </div>
                            <div className="text-5xl font-black text-white mb-2">{platformOccupancy.platform.occupancyRate}%</div>
                            <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
                                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${platformOccupancy.platform.occupancyRate}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400 mb-4">
                                {platformOccupancy.platform.activeBookings} active of {platformOccupancy.platform.totalCapacity} total seats
                            </p>
                            
                            {/* Struggling Spaces Alert */}
                            {platformOccupancy.strugglingSpaces?.length > 0 && (
                                <div className="mt-4 p-3 bg-red-500/5 rounded-xl border border-red-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle size={12} className="text-red-400" />
                                        <p className="text-[8px] text-red-400 uppercase tracking-wider">Needs Attention</p>
                                    </div>
                                    <div className="space-y-1">
                                        {platformOccupancy.strugglingSpaces.slice(0, 3).map((space, idx) => (
                                            <div key={idx} className="flex justify-between text-[9px]">
                                                <span className="text-slate-400">{space.name}</span>
                                                <span className="text-red-400">{space.occupancyRate}% occupancy</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Revenue Trend Card */}
                    <Card className="bg-[#111114] border-white/5 hover:border-indigo-500/30 transition-all duration-500">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={16} className="text-indigo-400" />
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Revenue Trend</h3>
                                </div>
                                <div className="flex gap-2">
                                    {['daily', 'weekly', 'monthly'].map(p => (
                                        <button key={p} onClick={() => setTrendPeriod(p)} className={cn(
                                            "text-[8px] px-2 py-1 rounded-lg uppercase font-black transition-all",
                                            trendPeriod === p ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-white"
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
                                            <div className="w-full bg-indigo-500/30 rounded-t-lg" style={{ height: `${Math.max(4, height)}px` }}>
                                                <div className="w-full bg-indigo-500 rounded-t-lg" style={{ height: `${height}px` }} />
                                            </div>
                                            <span className="text-[5px] text-slate-500 mt-1">{String(item._id).slice(5)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                <div>
                                    <p className="text-[7px] text-slate-500">Total Revenue</p>
                                    <p className="text-sm font-black text-emerald-400">₱{(revenueTrend.totalRevenue || 0).toLocaleString()}</p>
                                </div>
                                {revenueTrend.growth !== 0 && (
                                    <div className={cn("flex items-center gap-1 text-[8px] font-black", revenueTrend.growth > 0 ? "text-emerald-400" : "text-red-400")}>
                                        {revenueTrend.growth > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                        {Math.abs(revenueTrend.growth)}% vs last
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Row 2: Top Spaces + User Growth */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Performing Spaces */}
                    <Card className="bg-[#111114] border-white/5 hover:border-yellow-500/30 transition-all duration-500">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Crown size={16} className="text-yellow-400" />
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">🏆 Top Performing Spaces</h3>
                            </div>
                            <div className="space-y-3">
                                {topSpaces.map((space, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 bg-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-yellow-400 w-5">#{idx + 1}</span>
                                            <div>
                                                <p className="text-[11px] font-black text-white">{space.spaceName}</p>
                                                <p className="text-[7px] text-slate-500">{space.ownerName}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-emerald-400">₱{space.totalRevenue.toLocaleString()}</p>
                                            <p className="text-[7px] text-slate-500">{space.totalBookings} bookings</p>
                                        </div>
                                    </div>
                                ))}
                                {topSpaces.length === 0 && (
                                    <p className="text-center text-[9px] text-slate-500 py-4">No booking data yet</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* User Growth */}
                    <Card className="bg-[#111114] border-white/5 hover:border-blue-500/30 transition-all duration-500">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Users size={16} className="text-blue-400" />
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">User Growth</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="text-center p-2 bg-blue-500/5 rounded-xl">
                                    <p className="text-lg font-black text-blue-400">{userGrowth.totals?.all || 0}</p>
                                    <p className="text-[6px] text-slate-500 uppercase">Total</p>
                                </div>
                                <div className="text-center p-2 bg-purple-500/5 rounded-xl">
                                    <p className="text-lg font-black text-purple-400">{userGrowth.totals?.spaceOwners || 0}</p>
                                    <p className="text-[6px] text-slate-500 uppercase">Owners</p>
                                </div>
                                <div className="text-center p-2 bg-emerald-500/5 rounded-xl">
                                    <p className="text-lg font-black text-emerald-400">{userGrowth.totals?.regularUsers || 0}</p>
                                    <p className="text-[6px] text-slate-500 uppercase">Users</p>
                                </div>
                            </div>
                            <div className="flex items-end gap-1 h-16">
                                {userGrowth.growth?.slice(-7).map((item, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center">
                                        <div className="w-full bg-blue-500/30 rounded-t-lg" style={{ height: `${(item.users / Math.max(...(userGrowth.growth?.map(g => g.users) || [1]), 1)) * 40}px` }}>
                                            <div className="w-full bg-blue-500 rounded-t-lg" style={{ height: `${(item.users / Math.max(...(userGrowth.growth?.map(g => g.users) || [1]), 1)) * 40}px` }} />
                                        </div>
                                        <span className="text-[5px] text-slate-500 mt-1">{String(item._id).slice(5)}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Recent Applications Section */}
            <div className="mt-6 bg-[#111114] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Incoming Applications</h3>
                    <button onClick={() => navigate('/admin/space/applications')} className="text-[10px] font-black text-indigo-500 hover:text-white uppercase tracking-widest transition-all flex items-center gap-1">
                        Review All <ArrowUpRight className="w-3 h-3" />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/2">
                                <th className="px-6 py-4">Business</th>
                                <th className="px-6 py-4 hidden sm:table-cell">Owner</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentRequests?.length > 0 ? (
                                stats.recentRequests.map((req, i) => (
                                    <tr key={i} className="border-t border-white/2 hover:bg-white/2 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-black text-white text-[11px] uppercase italic tracking-tight">{req.name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-[10px] font-bold uppercase tracking-widest hidden sm:table-cell">{req.ownerName}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter border bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" className="px-6 py-12 text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">No pending applications</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, trend }) => (
    <div className="bg-[#111114] p-5 rounded-4xl border border-white/5 group hover:border-indigo-500/30 transition-all duration-500 shadow-xl">
        <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-white/5 rounded-xl group-hover:bg-indigo-500/10 transition-all duration-500 border border-white/5">{icon}</div>
        </div>
        <h4 className="text-xl font-black text-white mb-0.5 truncate italic tracking-tighter">{value}</h4>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">{title}</p>
        <div className="text-[8px] font-black text-indigo-500 flex items-center gap-1.5 uppercase tracking-tighter">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            {trend}
        </div>
    </div>
);

export default AdminDashboard;