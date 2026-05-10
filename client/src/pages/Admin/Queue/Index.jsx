import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { apiGet } from '@/utils/Api';
import { Loader2, RefreshCw, Database, Activity, HardDrive, Clock, AlertCircle, CheckCircle, XCircle, Server, PieChart } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/formatNumber';

const QueueDashboard = () => {
    const { logout } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [queueStats, setQueueStats] = useState({
        email: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        cloudinary: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        failedJobs: [],
        lastUpdated: null
    });
    
    const [selectedQueue, setSelectedQueue] = useState('cloudinary');
    const [refreshing, setRefreshing] = useState(false);

    // Fetch queue statistics from backend
    const fetchQueueStats = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                logout();
                return;
            }

            // Get queue counts
            const emailCounts = await apiGet('/admin/queue/email/counts');
            const cloudinaryCounts = await apiGet('/admin/queue/cloudinary/counts');
            const failedJobs = await apiGet('/admin/queue/failed-jobs?limit=20');
            
            setQueueStats({
                email: emailCounts.data || emailCounts,
                cloudinary: cloudinaryCounts.data || cloudinaryCounts,
                failedJobs: failedJobs.data || failedJobs,
                lastUpdated: new Date()
            });
            
            if (showRefresh) {
                showToast({ icon: 'success', title: 'Queue stats refreshed', duration: 1500 });
            }
        } catch (error) {
            console.error('Failed to fetch queue stats:', error);
            if (showRefresh) {
                showToast({ icon: 'error', title: 'Failed to refresh queue stats' });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [logout]);

    // Retry a failed job
    const retryJob = async (queueName, jobId) => {
        try {
            await apiGet(`/admin/queue/${queueName}/retry/${jobId}`);
            showToast({ icon: 'success', title: `Job ${jobId} queued for retry` });
            fetchQueueStats(true);
        } catch (error) {
            showToast({ icon: 'error', title: 'Failed to retry job', message: error.message });
        }
    };

    // Retry all failed jobs
    const retryAllFailed = async (queueName) => {
        try {
            await apiGet(`/admin/queue/${queueName}/retry-all`);
            showToast({ icon: 'success', title: `All ${queueName} jobs queued for retry` });
            fetchQueueStats(true);
        } catch (error) {
            showToast({ icon: 'error', title: 'Failed to retry jobs', message: error.message });
        }
    };

    // Clear completed jobs
    const clearCompleted = async (queueName) => {
        try {
            await apiGet(`/admin/queue/${queueName}/clean-completed`);
            showToast({ icon: 'success', title: `Completed jobs cleared from ${queueName}` });
            fetchQueueStats(true);
        } catch (error) {
            showToast({ icon: 'error', title: 'Failed to clear jobs', message: error.message });
        }
    };

    useEffect(() => {
        fetchQueueStats();
        
        // Auto-refresh every 10 seconds
        const interval = setInterval(() => {
            fetchQueueStats(false);
        }, 10000);
        
        return () => clearInterval(interval);
    }, [fetchQueueStats]);

    const getQueueColor = (queueName) => {
        const stats = queueStats[queueName];
        if (stats.failed > 0) return 'text-red-500';
        if (stats.active > 0) return 'text-yellow-500';
        return 'text-emerald-500';
    };

    const StatCard = ({ title, value, icon, color = 'indigo', warning = false }) => (
        <div className="bg-[#111114] p-4 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
                <div className={cn("p-2 rounded-xl", `bg-${color}-500/10`)}>{icon}</div>
                {warning && <AlertCircle size={14} className="text-red-400 animate-pulse" />}
            </div>
            <p className="text-2xl font-black text-white mb-1">{formatNumber(value)}</p>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{title}</p>
        </div>
    );

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Loading Queue Monitor...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {/* Header */}
            <div className="mb-6 md:mb-8 flex flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase italic">Queue Monitor</h1>
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-widest">Background job processing & failed job management</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fetchQueueStats(true)} className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all active:scale-95 group">
                        <RefreshCw className={cn("w-4 h-4 text-indigo-500", refreshing && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Queue Selection Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-3">
                {['cloudinary', 'email'].map(queue => (
                    <button
                        key={queue}
                        onClick={() => setSelectedQueue(queue)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                            selectedQueue === queue 
                                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" 
                                : "text-slate-500 hover:text-white"
                        )}
                    >
                        <Activity size={12} className={getQueueColor(queue)} />
                        {queue === 'cloudinary' ? '☁️ Cloudinary' : '📧 Email'}
                        {queueStats[queue]?.failed > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[7px] font-black">
                                {queueStats[queue].failed}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Queue Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                <StatCard 
                    title="Waiting" 
                    value={queueStats[selectedQueue]?.waiting || 0} 
                    icon={<Clock size={14} className="text-slate-400" />}
                    color="slate"
                />
                <StatCard 
                    title="Active" 
                    value={queueStats[selectedQueue]?.active || 0} 
                    icon={<Activity size={14} className="text-yellow-400" />}
                    color="yellow"
                />
                <StatCard 
                    title="Completed" 
                    value={queueStats[selectedQueue]?.completed || 0} 
                    icon={<CheckCircle size={14} className="text-emerald-400" />}
                    color="emerald"
                />
                <StatCard 
                    title="Failed" 
                    value={queueStats[selectedQueue]?.failed || 0} 
                    icon={<XCircle size={14} className="text-red-400" />}
                    color="red"
                    warning={queueStats[selectedQueue]?.failed > 0}
                />
                <StatCard 
                    title="Delayed" 
                    value={queueStats[selectedQueue]?.delayed || 0} 
                    icon={<Clock size={14} className="text-orange-400" />}
                    color="orange"
                />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
                <button 
                    onClick={() => retryAllFailed(selectedQueue)}
                    className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-[9px] font-black text-indigo-400 uppercase tracking-wider hover:bg-indigo-500/20 transition-all"
                >
                    🔄 Retry All Failed
                </button>
                <button 
                    onClick={() => clearCompleted(selectedQueue)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-wider hover:bg-white/10 transition-all"
                >
                    🗑️ Clear Completed
                </button>
            </div>

            {/* Failed Jobs Table */}
            {queueStats.failedJobs?.filter(job => job.queue === selectedQueue).length > 0 && (
                <div className="bg-[#111114] rounded-2xl border border-white/5 overflow-hidden shadow-xl mt-6">
                    <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={14} className="text-red-400" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Failed Jobs</h3>
                        </div>
                        <span className="text-[8px] text-slate-500">{queueStats.failedJobs.filter(j => j.queue === selectedQueue).length} jobs failed</span>
                    </div>
                    <div className="overflow-x-auto max-h-100 overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-[#111114]">
                                <tr className="text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10">
                                    <th className="px-6 py-3">Job ID</th>
                                    <th className="px-6 py-3">Failed At</th>
                                    <th className="px-6 py-3">Attempts</th>
                                    <th className="px-6 py-3">Error</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queueStats.failedJobs
                                    .filter(job => job.queue === selectedQueue)
                                    .map((job, idx) => (
                                        <tr key={idx} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <code className="text-[9px] font-mono text-white">{job.id}</code>
                                             </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[9px] text-slate-400 font-mono">
                                                    {new Date(job.failedAt).toLocaleString()}
                                                </p>
                                             </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-[7px] font-black">
                                                    {job.attemptsMade}/{job.attempts}
                                                </span>
                                             </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[9px] text-red-400 max-w-md truncate" title={job.failedReason}>
                                                    {job.failedReason?.substring(0, 80)}...
                                                </p>
                                             </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => retryJob(selectedQueue, job.id)}
                                                    className="text-[8px] font-black text-indigo-400 hover:text-white uppercase tracking-wider transition-all"
                                                >
                                                    Retry
                                                </button>
                                             </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* No Failed Jobs Message */}
            {queueStats.failedJobs?.filter(job => job.queue === selectedQueue).length === 0 && (
                <div className="mt-8 text-center py-12 bg-[#111114] rounded-2xl border border-white/5">
                    <CheckCircle size={32} className="text-emerald-400 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">All Systems Operational</p>
                    <p className="text-[8px] text-slate-500 mt-1">No failed jobs in {selectedQueue} queue</p>
                </div>
            )}

            {/* System Info */}
            <div className="mt-6 text-center">
                <p className="text-[7px] text-slate-600 uppercase tracking-widest">
                    Last updated: {queueStats.lastUpdated?.toLocaleTimeString() || 'Never'} • Auto-refreshes every 10s
                </p>
                <p className="text-[6px] text-slate-700 mt-1">
                    Powered by Bull Queue • Redis Backend
                </p>
            </div>
        </div>
    );
};

export default QueueDashboard;