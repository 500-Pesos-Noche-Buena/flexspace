import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import { apiGet } from '@/utils/Api';
import { Users, MapPin, Clock, Banknote, ArrowUpRight, Loader2, RefreshCw } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';

const AdminDashboard = () => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        totalUsers: 0,
        activeSpaces: 0,
        pendingRequests: 0,
        monthlyRevenue: "0",
        recentRequests: []
    });
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return logout();

            const res = await apiGet('/admin/dashboard');
            setStats(res.data);
        } catch (err) {
            showToast({ icon: 'error', title: 'Failed to sync dashboard data' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">
                    Syncing System Stats...
                </p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* Header - Adjusted for Mobile Stacking */}
            <div className="mb-6 md:mb-8 flex flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase italic">System Overview</h1>
                    <p className="text-[10px] md:text-sm text-slate-500 font-medium">Real-time performance of Iloilo Co-Working network.</p>
                </div>
                <button 
                    onClick={fetchDashboardData}
                    className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                >
                    <RefreshCw className="w-4 h-4 text-emerald-500" />
                </button>
            </div>

            {/* Stats Grid - 2 columns on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard title="Users" value={stats.totalUsers} icon={<Users className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />} trend="+12%" />
                <StatCard title="Spaces" value={stats.activeSpaces} icon={<MapPin className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />} trend="Live" />
                <StatCard title="Pending" value={stats.pendingRequests} icon={<Clock className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />} trend="Review" />
                <StatCard title="Revenue" value={`₱${stats.monthlyRevenue}`} icon={<Banknote className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />} trend="Total" />
            </div>

            {/* Main Content Area */}
            <div className="mt-6 md:mt-8 grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
                
                {/* Recent Requests Table */}
                <div className="xl:col-span-2 bg-[#111114] rounded-3xl md:rounded-4xl border border-white/5 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 md:px-6 md:py-5 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">Recent Applications</h3>
                        <button 
                            onClick={() => navigate('/admin/users')}
                            className="text-[10px] font-bold text-emerald-500 hover:underline flex items-center gap-1"
                        >
                            View All <ArrowUpRight className="w-3 h-3" />
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[400px] md:min-w-full">
                            <thead>
                                <tr className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-tighter bg-white/[0.02]">
                                    <th className="px-5 py-3 md:px-6 md:py-4">Name</th>
                                    <th className="px-5 py-3 md:px-6 md:py-4 hidden sm:table-cell">Location</th>
                                    <th className="px-5 py-3 md:px-6 md:py-4">Status</th>
                                    <th className="px-5 py-3 md:px-6 md:py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {stats.recentRequests.length > 0 ? (
                                    stats.recentRequests.map((req, i) => (
                                        <TableRow 
                                            key={i} 
                                            name={req.name} 
                                            loc={req.location || 'Iloilo City'} 
                                            status={req.status} 
                                            statusColor={req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-emerald-500/10 text-emerald-500'} 
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-10 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">No recent requests</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Growth Card - Compact for Mobile */}
                <div className="bg-linear-to-br from-emerald-600/20 to-transparent rounded-3xl md:rounded-4xl border border-emerald-500/10 p-5 md:p-8 flex flex-col justify-center">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-900/40">
                        <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-white mb-2">Network Growth</h3>
                    <p className="text-[11px] md:text-sm text-slate-400 leading-relaxed mb-5">
                        Manage <strong>{stats.pendingRequests}</strong> pending applications to expand coverage.
                    </p>
                    <button 
                        onClick={() => navigate('/admin/space/applications')}
                        className="w-full py-3 md:py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                    >
                        Review Applications
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Subcomponents ---
const StatCard = ({ title, value, icon, trend }) => (
    <div className="bg-[#111114] p-4 md:p-6 rounded-2xl md:rounded-4xl border border-white/5 group hover:border-emerald-500/30 transition-all duration-300">
        <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="p-2 md:p-3 bg-white/5 rounded-lg md:rounded-2xl group-hover:bg-emerald-500/10 transition-all duration-500">{icon}</div>
            <span className="hidden sm:block text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-tighter bg-white/5 px-2 py-1 rounded-lg">Live</span>
        </div>
        <h4 className="text-lg md:text-2xl font-black text-white mb-0.5 truncate">{value}</h4>
        <p className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">{title}</p>
        <div className="text-[8px] md:text-[10px] font-black text-emerald-500 flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            {trend}
        </div>
    </div>
);

const TableRow = ({ name, loc, status, statusColor }) => (
    <tr className="border-t border-white/5 hover:bg-white/2 transition-colors group">
        <td className="px-5 py-3 md:px-6 md:py-4">
            <p className="font-bold text-white text-[11px] md:text-xs truncate max-w-[100px] md:max-w-none">{name}</p>
        </td>
        <td className="px-5 py-3 md:px-6 md:py-4 text-slate-400 text-[10px] md:text-xs hidden sm:table-cell">{loc}</td>
        <td className="px-5 py-3 md:px-6 md:py-4">
            <span className={`px-2 py-0.5 md:py-1 rounded-md md:rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-tighter ${statusColor}`}>
                {status}
            </span>
        </td>
        <td className="px-5 py-3 md:px-6 md:py-4 text-right">
            <button className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors bg-white/5 md:bg-transparent px-2 py-1 md:p-0 rounded-md">
                Manage
            </button>
        </td>
    </tr>
);

export default AdminDashboard;