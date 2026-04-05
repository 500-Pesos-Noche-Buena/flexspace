import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import { apiGet } from '@/utils/Api';
import { Users, MapPin, Clock, Banknote, ArrowUpRight, Loader2, RefreshCw, Building2 } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';

// Global polling instance for the dashboard heartbeat
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

    const lastDashboardFingerprint = useRef("");
    const [loading, setLoading] = useState(true);

    // Fixed: Wrapped in useCallback to satisfy the dependency array and prevent re-renders
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
                
                if (!isInitial) {
                    console.log("📊 System Stats Synced: " + new Date().toLocaleTimeString());
                }
            }
        } catch {
            // Fix: Removed unused 'err'
            if (isInitial) {
                showToast({ icon: 'error', title: 'Dashboard sync failed' });
            }
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        // Clear any existing poll before starting a new one
        if (globalDashboardPollingInstance) clearInterval(globalDashboardPollingInstance);

        fetchDashboardData(true);

        globalDashboardPollingInstance = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchDashboardData(false);
            }
        }, 3000); // 3-second heartbeat

        return () => {
            if (globalDashboardPollingInstance) {
                clearInterval(globalDashboardPollingInstance);
                globalDashboardPollingInstance = null;
            }
        };
    }, [fetchDashboardData]);

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
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-widest">Network health monitoring.</p>
                </div>
                <button 
                    onClick={() => fetchDashboardData(true)}
                    className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all active:scale-95 group"
                >
                    <RefreshCw className="w-4 h-4 text-indigo-500 group-hover:rotate-180 transition-transform duration-500" />
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                <StatCard title="Users" value={stats.totalUsers} icon={<Users size={16} className="text-blue-500" />} trend="Active" />
                <StatCard title="Total Hubs" value={stats.totalSpaceHubs} icon={<Building2 size={16} className="text-purple-500" />} trend="Registered" />
                <StatCard title="Online" value={stats.activeSpaces} icon={<MapPin size={16} className="text-emerald-500" />} trend="Live Now" />
                <StatCard title="Pending" value={stats.pendingRequests} icon={<Clock size={16} className="text-yellow-500" />} trend="Queue" />
                <StatCard title="Revenue" value={`₱${stats.monthlyRevenue}`} icon={<Banknote size={16} className="text-pink-500" />} trend="Monthly" />
            </div>

            {/* Main Content Area */}
            <div className="mt-6 md:mt-8 grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
                
                {/* Recent Applications */}
                <div className="xl:col-span-2 bg-[#111114] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Incoming Applications</h3>
                        <button 
                            onClick={() => navigate('/admin/space/applications')}
                            className="text-[10px] font-black text-indigo-500 hover:text-white uppercase tracking-widest transition-all flex items-center gap-1"
                        >
                            Review All <ArrowUpRight className="w-3 h-3" />
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/2">
                                    <th className="px-6 py-4">Applicant</th>
                                    <th className="px-6 py-4 hidden sm:table-cell">Region</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Control</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentRequests.length > 0 ? (
                                    stats.recentRequests.map((req, i) => (
                                        <TableRow 
                                            key={i} 
                                            name={req.name} 
                                            loc={req.location || 'Iloilo City'} 
                                            status={req.status} 
                                            statusColor={req.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'} 
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">No active requests found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Network Growth Action Card */}
                <div className="bg-linear-to-br from-indigo-600/20 via-transparent to-transparent rounded-[2.5rem] border border-indigo-500/10 p-8 flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-600/10 blur-3xl rounded-full group-hover:bg-indigo-600/20 transition-all" />
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-900/40 relative z-10">
                        <ArrowUpRight className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-3 italic uppercase tracking-tighter">Expand Network</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-6 font-medium">
                        Found <strong>{stats.pendingRequests}</strong> unverified applications. Scale the Iloilo hub density by approving qualified partners.
                    </p>
                    <button 
                        onClick={() => navigate('/admin/space/applications')}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-indigo-900/20"
                    >
                        Review Queue
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Subcomponents ---
const StatCard = ({ title, value, icon, trend }) => (
    <div className="bg-[#111114] p-5 rounded-4xl border border-white/5 group hover:border-indigo-500/30 transition-all duration-500 shadow-xl">
        <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-white/5 rounded-xl group-hover:bg-indigo-500/10 transition-all duration-500 border border-white/5">{icon}</div>
        </div>
        <h4 className="text-xl font-black text-white mb-0.5 truncate italic tracking-tighter">{value}</h4>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">{title}</p>
        <div className="text-[8px] font-black text-indigo-500 flex items-center gap-1.5 uppercase tracking-tighter">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            {trend}
        </div>
    </div>
);

const TableRow = ({ name, loc, status, statusColor }) => (
    <tr className="border-t border-white/2 hover:bg-white/2 transition-colors group">
        <td className="px-6 py-4">
            <p className="font-black text-white text-[11px] uppercase italic tracking-tight">{name}</p>
        </td>
        <td className="px-6 py-4 text-slate-500 text-[10px] font-bold uppercase tracking-widest hidden sm:table-cell">{loc}</td>
        <td className="px-6 py-4">
            <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter border ${statusColor}`}>
                {status}
            </span>
        </td>
        <td className="px-6 py-4 text-right">
            <button className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                Manage
            </button>
        </td>
    </tr>
);

export default AdminDashboard;