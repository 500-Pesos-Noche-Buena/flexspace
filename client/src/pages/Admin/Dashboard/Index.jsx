import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import { apiGet } from '@/utils/Api';
import { Users, MapPin, Clock, Banknote, ArrowUpRight, Loader2 } from 'lucide-react';
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
            <div className="h-96 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Syncing System Stats...
                </p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">System Overview</h1>
                    <p className="text-sm text-slate-500 font-medium">Real-time performance of Iloilo Co-Working network.</p>
                </div>
                <button 
                    onClick={fetchDashboardData}
                    className="p-2 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all"
                >
                    <Clock className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Users" value={stats.totalUsers} icon={<Users className="w-5 h-5 text-blue-500" />} trend="+12% this month" />
                <StatCard title="Active Spaces" value={stats.activeSpaces} icon={<MapPin className="w-5 h-5 text-emerald-500" />} trend="Live Hubs" />
                <StatCard title="Pending Requests" value={stats.pendingRequests} icon={<Clock className="w-5 h-5 text-yellow-500" />} trend="Awaiting Review" />
                <StatCard title="Monthly Revenue" value={`₱${stats.monthlyRevenue}`} icon={<Banknote className="w-5 h-5 text-purple-500" />} trend="System Total" />
            </div>

            {/* Recent Requests Table */}
            <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-[#111114] rounded-4xl border border-white/5 overflow-hidden shadow-sm">
                    <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Recent Space Requests</h3>
                        <button 
                            onClick={() => navigate('/admin/users')}
                            className="text-xs font-bold text-emerald-500 hover:underline flex items-center gap-1"
                        >
                            View All <ArrowUpRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {stats.recentRequests.map((req, i) => (
                                    <TableRow 
                                        key={i} 
                                        name={req.name} 
                                        loc={req.location || 'N/A'} 
                                        status={req.status} 
                                        statusColor={req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-emerald-500/10 text-emerald-500'} 
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-linear-to-br from-emerald-600/20 to-transparent rounded-4xl border border-emerald-500/10 p-6 flex flex-col justify-center">
                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-900/40">
                        <ArrowUpRight className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Grow the Network</h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-6">
                        There are <strong>{stats.pendingRequests}</strong> pending applications. Reviewing them expands the Iloilo coverage.
                    </p>
                    <button 
                        onClick={() => navigate('/admin/users')}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
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
    <div className="bg-[#111114] p-6 rounded-4xl border border-white/5 group hover:border-emerald-500/30 transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform duration-500">{icon}</div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter bg-white/5 px-2 py-1 rounded-lg">Live</span>
        </div>
        <h4 className="text-2xl font-black text-white mb-1">{value}</h4>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">{title}</p>
        <div className="text-[10px] font-black text-emerald-500 flex items-center gap-1">{trend}</div>
    </div>
);

const TableRow = ({ name, loc, status, statusColor }) => (
    <tr className="border-t border-white/5 hover:bg-white/2 transition-colors group">
        <td className="px-6 py-4 font-bold text-white text-xs">{name}</td>
        <td className="px-6 py-4 text-slate-400 text-xs">{loc}</td>
        <td className="px-6 py-4">
            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${statusColor}`}>{status}</span>
        </td>
        <td className="px-6 py-4 text-right">
            <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Details</button>
        </td>
    </tr>
);

export default AdminDashboard;