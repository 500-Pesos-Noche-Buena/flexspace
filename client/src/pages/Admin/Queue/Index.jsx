import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { apiGet } from '@/utils/Api';
import { Loader2, RefreshCw, Database, Activity, HardDrive, Clock, AlertCircle, CheckCircle, XCircle, Server, PieChart } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/formatNumber';
import { QueueStatCard } from '@/components/QueueStatCard';
import { useTheme } from '@/hooks/useTheme';

const QueueDashboard = () => {
    const { logout } = useContext(AuthContext);
    const { themeColor } = useTheme();
    const [loading, setLoading] = useState(true);
    const [queueStats, setQueueStats] = useState({
        email: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        cloudinary: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        failedJobs: [],
        lastUpdated: null
    });

    const [selectedQueue, setSelectedQueue] = useState('cloudinary');
    const [refreshing, setRefreshing] = useState(false);

    const getThemeColorClass = () => {
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
            showToast({ icon: 'error', title: 'Failed to retry job', text: error.message });
        }
    };

    // Retry all failed jobs
    const retryAllFailed = async (queueName) => {
        try {
            await apiGet(`/admin/queue/${queueName}/retry-all`);
            showToast({ icon: 'success', title: `All ${queueName} jobs queued for retry` });
            fetchQueueStats(true);
        } catch (error) {
            showToast({ icon: 'error', title: 'Failed to retry jobs', text: error.message });
        }
    };

    // Clear completed jobs
    const clearCompleted = async (queueName) => {
        try {
            await apiGet(`/admin/queue/${queueName}/clean-completed`);
            showToast({ icon: 'success', title: `Completed jobs cleared from ${queueName}` });
            fetchQueueStats(true);
        } catch (error) {
            showToast({ icon: 'error', title: 'Failed to clear jobs', text: error.message });
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
        if (stats.failed > 0) return 'text-rose-600 dark:text-rose-400';
        if (stats.active > 0) return 'text-amber-600 dark:text-amber-400';
        return 'text-emerald-600 dark:text-emerald-400';
    };

    const color = getThemeColorClass();

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-foreground rounded-full animate-pulse" />
                    </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Loading Queue Monitor...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* Header */}
            <div className="mb-6 md:mb-8 flex flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground uppercase italic">Queue Monitor</h1>
                    <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-widest">Background job processing & failed job management</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fetchQueueStats(true)} className="p-3 bg-muted rounded-2xl border border-border hover:bg-muted/80 transition-all active:scale-95 group">
                        <RefreshCw className={cn("w-4 h-4 text-primary", refreshing && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Queue Selection Tabs */}
            <div className="flex gap-2 mb-6 border-b border-border pb-3">
                {['cloudinary', 'email'].map(queue => (
                    <button
                        key={queue}
                        onClick={() => setSelectedQueue(queue)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                            selectedQueue === queue
                                ? `bg-${color}-500/20 text-primary border border-primary/30`
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Activity size={12} className={getQueueColor(queue)} />
                        {queue === 'cloudinary' ? '☁️ Cloudinary' : '📧 Email'}
                        {queueStats[queue]?.failed > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full text-[7px] font-black">
                                {queueStats[queue].failed}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Queue Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                <QueueStatCard
                    title="Waiting"
                    value={queueStats[selectedQueue]?.waiting || 0}
                    icon={<Clock size={14} className="text-muted-foreground" />}
                    color="slate"
                />
                <QueueStatCard
                    title="Active"
                    value={queueStats[selectedQueue]?.active || 0}
                    icon={<Activity size={14} className="text-amber-600 dark:text-amber-400" />}
                    color="yellow"
                />
                <QueueStatCard
                    title="Completed"
                    value={queueStats[selectedQueue]?.completed || 0}
                    icon={<CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />}
                    color="emerald"
                />
                <QueueStatCard
                    title="Failed"
                    value={queueStats[selectedQueue]?.failed || 0}
                    icon={<XCircle size={14} className="text-rose-600 dark:text-rose-400" />}
                    color="rose"
                    warning={queueStats[selectedQueue]?.failed > 0}
                />
                <QueueStatCard
                    title="Delayed"
                    value={queueStats[selectedQueue]?.delayed || 0}
                    icon={<Clock size={14} className="text-amber-600 dark:text-amber-400" />}
                    color="orange"
                />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() => retryAllFailed(selectedQueue)}
                    className={`px-4 py-2 bg-${color}-500/10 border border-${color}-500/30 rounded-xl text-[9px] font-black text-primary uppercase tracking-wider hover:bg-${color}-500/20 transition-all`}
                >
                    🔄 Retry All Failed
                </button>
                <button
                    onClick={() => clearCompleted(selectedQueue)}
                    className="px-4 py-2 bg-muted border border-border rounded-xl text-[9px] font-black text-muted-foreground uppercase tracking-wider hover:bg-muted/80 transition-all"
                >
                    🗑️ Clear Completed
                </button>
            </div>

            {/* Failed Jobs Table */}
            {queueStats.failedJobs?.filter(job => job.queue === selectedQueue).length > 0 && (
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xl mt-6">
                    <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={14} className="text-rose-600 dark:text-rose-400" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">Failed Jobs</h3>
                        </div>
                        <span className="text-[8px] text-muted-foreground">{queueStats.failedJobs.filter(j => j.queue === selectedQueue).length} jobs failed</span>
                    </div>
                    <div className="overflow-x-auto max-h-100 overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-card">
                                <tr className="text-[8px] font-black text-muted-foreground uppercase tracking-widest border-b border-border">
                                    <th className="px-6 py-3">Job ID</th>
                                    <th className="px-6 py-3">Failed At</th>
                                    <th className="px-6 py-3">Attempts</th>
                                    <th className="px-6 py-3">Error</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>                            </thead>
                            <tbody>
                                {queueStats.failedJobs
                                    .filter(job => job.queue === selectedQueue)
                                    .map((job, idx) => (
                                        <tr key={idx} className="border-t border-border hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <code className="text-[9px] font-mono text-foreground">{job.id}</code>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[9px] text-muted-foreground font-mono">
                                                    {new Date(job.failedAt).toLocaleString()}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[7px] font-black">
                                                    {job.attemptsMade}/{job.attempts}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[9px] text-rose-600 dark:text-rose-400 max-w-md truncate" title={job.failedReason}>
                                                    {job.failedReason?.substring(0, 80)}...
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => retryJob(selectedQueue, job.id)}
                                                    className="text-[8px] font-black text-primary hover:text-primary/80 uppercase tracking-wider transition-all"
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
                <div className="mt-8 text-center py-12 bg-card rounded-2xl border border-border">
                    <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">All Systems Operational</p>
                    <p className="text-[8px] text-muted-foreground mt-1">No failed jobs in {selectedQueue} queue</p>
                </div>
            )}

            {/* System Info */}
            <div className="mt-6 text-center">
                <p className="text-[7px] text-muted-foreground uppercase tracking-widest">
                    Last updated: {queueStats.lastUpdated?.toLocaleTimeString() || 'Never'} • Auto-refreshes every 10s
                </p>
                <p className="text-[6px] text-muted-foreground/60 mt-1">
                    Powered by Bull Queue • Redis Backend
                </p>
            </div>
        </div>
    );
};

export default QueueDashboard;