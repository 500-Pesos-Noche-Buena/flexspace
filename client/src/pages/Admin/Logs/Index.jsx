import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiDelete, downloadFile } from '@/utils/Api';
import {
    Loader2, RefreshCw, History, AlertCircle, CheckCircle,
    Clock, User, MapPin, Calendar, DollarSign, Eye,
    Filter, ChevronDown, ChevronUp, Search, X, LogIn, LogOut, XCircle, Star,
    Download, Trash2, BarChart3
} from 'lucide-react';
import { showToast, showConfirm } from '@/components/ui/SweetAlert2';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/formatNumber';
import { StatsModal } from '@/components/modal';
import { useTheme } from '@/hooks/useTheme';

let globalPollingInstance = null;

const AdminLogs = () => {
    const { themeColor } = useTheme();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [cleaning, setCleaning] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({
        total: 0, user: 0, space: 0, booking: 0,
        login: 0, logout: 0, recent: 0
    });
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedLog, setExpandedLog] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [paginationInfo, setPaginationInfo] = useState({});
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [detailedStats, setDetailedStats] = useState(null);

    const paramsRef = useRef({ filter, search: searchTerm, page: currentPage });
    const lastDataFingerprint = useRef("");

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

    useEffect(() => {
        paramsRef.current = { filter, search: searchTerm, page: currentPage };
    }, [filter, searchTerm, currentPage]);

    const fetchLogs = async (params = paramsRef.current, isInitial = false, showRefresh = false) => {
        if (isInitial) setLoading(true);
        if (showRefresh) setRefreshing(true);

        try {
            const { filter, search, page } = params;
            const res = await apiGet(`/admin/activity-logs?filter=${filter}&search=${search}&page=${page}&limit=20`);

            const rowData = res.data?.logs || res.logs || [];
            const total = res.data?.total || res.total || 0;
            const fetchedStats = res.data?.stats || res.stats || { total: 0, user: 0, space: 0, booking: 0 };
            const pagination = res.data?.pagination || {};

            const currentFingerprint = JSON.stringify({ rowData, total, fetchedStats, page });

            if (currentFingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = currentFingerprint;

                if (page === 1) {
                    setLogs(rowData);
                } else {
                    setLogs(prev => [...prev, ...rowData]);
                }

                setTotalCount(total);
                setStats(fetchedStats);
                setHasMore(rowData.length === 20);
                setPaginationInfo(pagination);
            }

            if (showRefresh) {
                showToast({ icon: 'success', title: 'Logs refreshed', duration: 1500 });
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
            if (isInitial) {
                showToast({ icon: 'error', title: 'Failed to load activity logs' });
            }
        } finally {
            if (isInitial) setLoading(false);
            if (showRefresh) setRefreshing(false);
        }
    };

    const fetchDetailedStats = async () => {
        try {
            const res = await apiGet('/admin/activity-logs/stats');
            if (res.success) {
                setDetailedStats(res.data);
                setShowStatsModal(true);
            } else {
                setDetailedStats({
                    total: stats.total,
                    monthly: stats.recent * 4 || 0,
                    district: 0,
                    review: 0,
                    earnings: 0,
                    register: stats.register || 0,
                    topUsers: [
                        { name: "No data yet", count: 0 }
                    ]
                });
                setShowStatsModal(true);
            }
        } catch (error) {
            console.error('Stats error:', error);
            setDetailedStats({
                total: stats.total,
                monthly: stats.recent * 4 || 0,
                district: 0,
                review: 0,
                earnings: 0,
                register: 0,
                topUsers: []
            });
            setShowStatsModal(true);
            showToast({ icon: 'warning', title: 'Using cached stats', duration: 2000 });
        }
    };

    const exportLogs = async () => {
        setExporting(true);
        try {
            const url = `/admin/activity-logs/export?filter=${filter}&search=${searchTerm}`;
            const filename = `activity-logs-${new Date().toISOString().slice(0, 19)}.csv`;
            await downloadFile(url, filename);
            showToast({ icon: 'success', title: 'Export completed', duration: 2000 });
        } catch (error) {
            console.error('Export error:', error);
            showToast({ icon: 'error', title: 'Export failed' });
        } finally {
            setExporting(false);
        }
    };

    const cleanupOldLogs = async () => {
        const confirmed = await showConfirm(
            "Clean Up Old Logs",
            "This will permanently delete logs older than 30 days. This action cannot be undone.",
            "Yes, clean up"
        );

        if (confirmed) {
            setCleaning(true);
            try {
                const res = await apiDelete('/admin/activity-logs/cleanup?days=30');
                if (res.success) {
                    showToast({ icon: 'success', title: res.message || `Deleted ${res.deletedCount} old logs` });
                    refreshLogs();
                }
            } catch (error) {
                showToast({ icon: 'error', title: 'Cleanup failed' });
            } finally {
                setCleaning(false);
            }
        }
    };

    const refreshLogs = () => {
        fetchLogs({ filter, search: searchTerm, page: 1 }, false, true);
    };

    const loadMore = () => {
        if (!hasMore || loading) return;
        setCurrentPage(prev => prev + 1);
    };

    useEffect(() => {
        if (globalPollingInstance) clearInterval(globalPollingInstance);

        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
            fetchLogs({ filter, search: searchTerm, page: 1 }, true);
        }

        globalPollingInstance = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchLogs({ filter, search: searchTerm, page: currentPage }, false);
            }
        }, 10000);

        return () => {
            clearInterval(globalPollingInstance);
            globalPollingInstance = null;
        };
    }, [filter, searchTerm]);

    useEffect(() => {
        if (currentPage > 1) {
            fetchLogs({ filter, search: searchTerm, page: currentPage }, false);
        }
    }, [currentPage]);

    const clearSearch = () => {
        setSearchTerm('');
        setCurrentPage(1);
    };

    const getActivityIcon = (type) => {
        const iconMap = {
            user_login: <LogIn size={14} className="text-emerald-600 dark:text-emerald-400" />,
            user_logout: <LogOut size={14} className="text-muted-foreground" />,
            user_register: <User size={14} className="text-blue-600 dark:text-blue-400" />,
            user_update: <User size={14} className="text-primary" />,
            user_delete: <User size={14} className="text-rose-600 dark:text-rose-400" />,
            space_create: <MapPin size={14} className="text-purple-600 dark:text-purple-400" />,
            space_update: <MapPin size={14} className="text-amber-600 dark:text-amber-400" />,
            space_delete: <MapPin size={14} className="text-rose-600 dark:text-rose-400" />,
            space_approve: <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />,
            space_reject: <XCircle size={14} className="text-rose-600 dark:text-rose-400" />,
            booking_create: <Calendar size={14} className="text-primary" />,
            booking_cancel: <XCircle size={14} className="text-rose-600 dark:text-rose-400" />,
            booking_complete: <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />,
            payment_made: <DollarSign size={14} className="text-emerald-600 dark:text-emerald-400" />,
            payment_failed: <XCircle size={14} className="text-rose-600 dark:text-rose-400" />,
        };
        return iconMap[type] || <History size={14} className="text-muted-foreground" />;
    };

    const getActivityColor = (type) => {
        if (type === 'user_login') return 'border-emerald-500/20 bg-emerald-500/5';
        if (type === 'user_logout') return 'border-muted-foreground/20 bg-muted/5';
        if (type.includes('delete') || type.includes('cancel') || type.includes('reject') || type.includes('failed'))
            return 'border-rose-500/20 bg-rose-500/5';
        if (type.includes('update') || type.includes('edit')) return 'border-amber-500/20 bg-amber-500/5';
        if (type.includes('create') || type.includes('approve') || type.includes('complete'))
            return 'border-emerald-500/20 bg-emerald-500/5';
        if (type.includes('register')) return 'border-blue-500/20 bg-blue-500/5';
        return 'border-primary/20 bg-primary/5';
    };

    const getActivityBadge = (type) => {
        const badges = {
            user_login: 'Login',
            user_logout: 'Logout',
            user_register: 'Register',
            user_update: 'Update',
            user_delete: 'Delete',
            space_create: 'Space Created',
            space_update: 'Space Updated',
            space_delete: 'Space Deleted',
            space_approve: 'Space Approved',
            space_reject: 'Space Rejected',
            booking_create: 'Booking Made',
            booking_cancel: 'Booking Cancelled',
            booking_complete: 'Booking Completed',
            payment_made: 'Payment Received',
            payment_failed: 'Payment Failed',
        };
        return badges[type] || type?.replace(/_/g, ' ') || 'Activity';
    };

    const StatCard = ({ title, value, icon, color }) => (
        <div className="bg-card p-4 rounded-2xl border border-border hover:border-primary/30 transition-all shadow-lg">
            <div className="flex items-center justify-between mb-2">
                <div className={cn("p-2 rounded-xl", `bg-${color}-500/10`)}>{icon}</div>
            </div>
            <p className="text-2xl font-black text-foreground mb-0.5">{formatNumber(value)}</p>
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
        </div>
    );

    const color = getThemeColorClass();

    if (loading && logs.length === 0) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Loading Activity Logs...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* Header */}
            <div className="mb-6 flex flex-row justify-between items-center gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground uppercase italic">Activity Logs</h1>
                    <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-widest">
                        Real-time system activity & user actions
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchDetailedStats}
                        className="p-3 bg-muted rounded-2xl border border-border hover:bg-muted/80 transition-all active:scale-95 group"
                        title="View Detailed Stats"
                    >
                        <BarChart3 size={16} className="text-purple-600 dark:text-purple-400" />
                    </button>
                    <button
                        onClick={exportLogs}
                        disabled={exporting}
                        className="p-3 bg-muted rounded-2xl border border-border hover:bg-muted/80 transition-all active:scale-95 group disabled:opacity-50"
                        title="Export Logs"
                    >
                        <Download className={cn("w-4 h-4 text-emerald-600 dark:text-emerald-400", exporting && "animate-pulse")} />
                    </button>
                    <button
                        onClick={cleanupOldLogs}
                        disabled={cleaning}
                        className="p-3 bg-muted rounded-2xl border border-border hover:bg-rose-500/10 transition-all active:scale-95 group disabled:opacity-50"
                        title="Clean Old Logs"
                    >
                        <Trash2 className={cn("w-4 h-4 text-rose-600 dark:text-rose-400", cleaning && "animate-pulse")} />
                    </button>
                    <button
                        onClick={refreshLogs}
                        disabled={refreshing}
                        className="p-3 bg-muted rounded-2xl border border-border hover:bg-muted/80 transition-all active:scale-95 group disabled:opacity-50"
                        title="Refresh Logs"
                    >
                        <RefreshCw className={cn("w-4 h-4 text-primary", refreshing && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard title="Total Activities" value={stats.total} icon={<History size={14} className="text-muted-foreground" />} color="slate" />
                <StatCard title="User Actions" value={stats.user} icon={<User size={14} className="text-blue-600 dark:text-blue-400" />} color="blue" />
                <StatCard title="Space Actions" value={stats.space} icon={<MapPin size={14} className="text-purple-600 dark:text-purple-400" />} color="purple" />
                <StatCard title="Booking Actions" value={stats.booking} icon={<Calendar size={14} className="text-primary" />} color="indigo" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <StatCard title="Logins" value={stats.login || 0} icon={<LogIn size={14} className="text-emerald-600 dark:text-emerald-400" />} color="emerald" />
                <StatCard title="Logouts" value={stats.logout || 0} icon={<LogOut size={14} className="text-muted-foreground" />} color="slate" />
                <StatCard title="Last 7 Days" value={stats.recent || 0} icon={<Clock size={14} className="text-primary" />} color="indigo" />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-4 border-b border-border pb-3">
                {[
                    { key: 'all', label: 'All Activities', icon: <History size={12} /> },
                    { key: 'user', label: 'User Actions', icon: <User size={12} /> },
                    { key: 'space', label: 'Space Actions', icon: <MapPin size={12} /> },
                    { key: 'booking', label: 'Booking Actions', icon: <Calendar size={12} /> },
                    { key: 'district', label: 'District Actions', icon: <MapPin size={12} /> },
                    { key: 'review', label: 'Review Actions', icon: <Star size={12} /> },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setFilter(tab.key); setCurrentPage(1); }}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all",
                            filter === tab.key
                                ? `bg-${color}-500/20 text-primary border border-primary/30`
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by user, action, or details..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 outline-none transition-all"
                />
                {searchTerm && (
                    <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Logs List */}
            <div className="space-y-3">
                {logs.length > 0 ? (
                    logs.map((log, idx) => (
                        <Card
                            key={log._id || idx}
                            className={cn(
                                "bg-card border-border hover:border-primary/30 transition-all duration-300 cursor-pointer shadow-lg",
                                expandedLog === idx && "border-primary/30"
                            )}
                            onClick={() => setExpandedLog(expandedLog === idx ? null : idx)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className={cn("p-2 rounded-xl border transition-all shrink-0", getActivityColor(log.type))}>
                                            {getActivityIcon(log.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <p className="text-[11px] font-black text-foreground wrap-break-word">
                                                    {log.description || log.message}
                                                </p>
                                                <span className={cn(
                                                    "text-[7px] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0",
                                                    getActivityColor(log.type).replace('bg-', 'text-').replace('/5', '').replace('border-', '')
                                                )}>
                                                    {getActivityBadge(log.type)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[8px] text-muted-foreground flex-wrap">
                                                {log.userName && (
                                                    <span className="flex items-center gap-1">
                                                        <User size={8} />
                                                        {log.userName}
                                                    </span>
                                                )}
                                                {log.userEmail && (
                                                    <span className="text-muted-foreground/60">{log.userEmail}</span>
                                                )}
                                                {log.spaceName && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={8} />
                                                        {log.spaceName}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Clock size={8} />
                                                    {new Date(log.createdAt || log.timestamp).toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Expanded Details */}
                                            {expandedLog === idx && (
                                                <div className="mt-3 pt-3 border-t border-border">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[9px]">
                                                        {log.ipAddress && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-muted-foreground">IP:</span>
                                                                <code className="text-foreground">{log.ipAddress}</code>
                                                            </div>
                                                        )}
                                                        {log.userAgent && (
                                                            <div className="flex items-center gap-2 col-span-2">
                                                                <span className="text-muted-foreground shrink-0">Browser:</span>
                                                                <span className="text-foreground truncate">{log.userAgent}</span>
                                                            </div>
                                                        )}
                                                        {log.bookingId && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-muted-foreground">Booking ID:</span>
                                                                <code className="text-foreground">{log.bookingId}</code>
                                                            </div>
                                                        )}
                                                        {log.amount && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-muted-foreground">Amount:</span>
                                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">₱{formatNumber(log.amount)}</span>
                                                            </div>
                                                        )}
                                                        {log.details && (
                                                            <div className="col-span-2">
                                                                <span className="text-muted-foreground">Details:</span>
                                                                <pre className="text-foreground mt-1 text-[8px] whitespace-pre-wrap overflow-x-auto">
                                                                    {JSON.stringify(log.details, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        {log.status === 'success' ? (
                                            <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                                        ) : log.status === 'failed' ? (
                                            <AlertCircle size={14} className="text-rose-600 dark:text-rose-400" />
                                        ) : null}
                                        <div className="text-[6px] text-muted-foreground">
                                            {expandedLog === idx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-12 bg-card rounded-2xl border border-border">
                        <History size={32} className="text-muted-foreground mx-auto mb-3" />
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">No activity logs found</p>
                        <p className="text-[8px] text-muted-foreground/60 mt-1">Try changing your filters or search term</p>
                    </div>
                )}
            </div>

            {/* Load More Button */}
            {hasMore && logs.length > 0 && logs.length < totalCount && (
                <div className="text-center mt-6">
                    <button
                        onClick={loadMore}
                        disabled={loading}
                        className="px-6 py-2 bg-muted border border-border rounded-xl text-[9px] font-black text-muted-foreground uppercase tracking-wider hover:bg-muted/80 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={12} className="animate-spin inline mr-2" /> : null}
                        Load More
                    </button>
                </div>
            )}

            {/* Stats Modal */}
            <StatsModal
                isOpen={showStatsModal}
                onClose={() => setShowStatsModal(false)}
                stats={stats}
                detailedStats={detailedStats}
            />

            {/* Footer */}
            <div className="mt-6 text-center">
                <p className="text-[6px] text-muted-foreground uppercase tracking-widest">
                    Showing {logs.length} of {totalCount} activities • Auto-refreshes every 10 seconds
                </p>
            </div>
        </div>
    );
};

export default AdminLogs;