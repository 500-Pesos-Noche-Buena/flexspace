import React, { useState, useEffect, useCallback } from 'react';
import { 
    AlertCircle, CheckCircle, XCircle, Clock, 
    Search, Loader2, RefreshCw, Eye, Check,
    Server, Monitor, Database, Bug, TrendingUp,
    User, Calendar, Filter, ChevronDown, ChevronUp,
    Trash2, Activity, Shield, Wifi, Zap, CreditCard, Mail,
    ChevronLeft, ChevronRight, Copy, ExternalLink, Lock
} from 'lucide-react';
import { apiGet, apiPut } from '@/utils/Api';
import { showToast, showConfirm } from '@/components/ui/SweetAlert2';
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

const ErrorLogs = () => {
    const { themeColor } = useTheme();
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [filterResolved, setFilterResolved] = useState('all');
    const [selectedLog, setSelectedLog] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const getButtonColor = () => {
        const colors = {
            indigo: 'hover:bg-indigo-600',
            emerald: 'hover:bg-emerald-600',
            purple: 'hover:bg-purple-600',
            blue: 'hover:bg-blue-600',
            rose: 'hover:bg-rose-600',
            amber: 'hover:bg-amber-600',
        };
        return colors[themeColor] || colors.indigo;
    };

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

    const fetchStats = async () => {
        try {
            const res = await apiGet('/admin/error-logs/stats');
            if (res.success) {
                setStats(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page,
                limit: 50,
                ...(searchTerm && { search: searchTerm }),
                ...(filterType !== 'all' && { error_type: filterType }),
                ...(filterSeverity !== 'all' && { severity: filterSeverity }),
                ...(filterResolved !== 'all' && { resolved: filterResolved === 'true' })
            });
            
            const res = await apiGet(`/admin/error-logs?${params}`);
            if (res.success) {
                setLogs(res.data.logs || []);
                setTotalPages(res.data.totalPages || 1);
                setTotalLogs(res.data.total || 0);
            }
        } catch (error) {
            showToast({ icon: 'error', title: 'Failed to fetch error logs' });
        } finally {
            setLoading(false);
        }
    }, [page, searchTerm, filterType, filterSeverity, filterResolved]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        let interval;
        if (autoRefresh) {
            interval = setInterval(() => {
                fetchLogs();
                fetchStats();
            }, 30000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh, fetchLogs]);

    useEffect(() => {
        fetchStats();
        fetchLogs();
    }, [fetchLogs]);

    const handleResolve = async (logId) => {
        const confirmed = await showConfirm(
            'Resolve Error?',
            'Mark this error as resolved.',
            'Yes, resolve'
        );
        
        if (confirmed) {
            try {
                const res = await apiPut(`/admin/error-logs/${logId}/resolve`, { notes: 'Resolved by admin' });
                if (res.success) {
                    showToast({ icon: 'success', title: 'Error marked as resolved' });
                    fetchLogs();
                    fetchStats();
                }
            } catch (error) {
                showToast({ icon: 'error', title: 'Failed to resolve error' });
            }
        }
    };

    const getSeverityColor = (severity) => {
        const colors = {
            low: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
            medium: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
            high: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
            critical: 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
        };
        return colors[severity] || colors.medium;
    };

    const getSeverityIcon = (severity) => {
        const icons = {
            low: <Activity size={14} />,
            medium: <AlertCircle size={14} />,
            high: <Zap size={14} />,
            critical: <XCircle size={14} />
        };
        return icons[severity] || <AlertCircle size={14} />;
    };

    const getTypeIcon = (type) => {
        const icons = {
            backend: <Server size={14} />,
            frontend: <Monitor size={14} />,
            database: <Database size={14} />,
            api: <TrendingUp size={14} />,
            validation: <AlertCircle size={14} />,
            auth: <Lock size={14} />,
            payment: <CreditCard size={14} />,
            email: <Mail size={14} />
        };
        return icons[type] || <Bug size={14} />;
    };

    const getTypeColor = (type) => {
        const colors = {
            backend: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
            frontend: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
            database: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
            api: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
            validation: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
            auth: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
            payment: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
            email: 'bg-sky-500/20 text-sky-600 dark:text-sky-400'
        };
        return colors[type] || 'bg-muted text-muted-foreground';
    };

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-PH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return 'N/A';
        }
    };

    const columns = [
        {
            header: "Error Message",
            cell: (row) => (
                <div className="flex flex-col max-w-[250px]">
                    <span className="text-xs font-bold text-foreground truncate">
                        {row.error_message}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono truncate">
                        {row.url || 'N/A'}
                    </span>
                </div>
            )
        },
        {
            header: "Type",
            cell: (row) => (
                <div className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase",
                    getTypeColor(row.error_type)
                )}>
                    {getTypeIcon(row.error_type)}
                    {row.error_type}
                </div>
            )
        },
        {
            header: "Severity",
            cell: (row) => (
                <div className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase",
                    getSeverityColor(row.severity)
                )}>
                    {getSeverityIcon(row.severity)}
                    {row.severity}
                </div>
            )
        },
        {
            header: "Status",
            cell: (row) => (
                <div className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase",
                    row.resolved 
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                )}>
                    {row.resolved ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {row.resolved ? 'Resolved' : 'Open'}
                </div>
            )
        },
        {
            header: "User",
            cell: (row) => (
                <div className="flex items-center gap-1.5">
                    <User size={12} className="text-muted-foreground" />
                    <span className="text-[10px] text-foreground truncate max-w-[100px]">
                        {row.user_id?.name || row.user_id?.email || 'System'}
                    </span>
                </div>
            )
        },
        {
            header: "Time",
            cell: (row) => (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDate(row.created_at)}
                </span>
            )
        },
        {
            header: "Actions",
            cell: (row) => (
                <div className="flex gap-1.5">
                    <button
                        onClick={() => { setSelectedLog(row); setShowDetails(true); }}
                        className="p-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                        title="View Details"
                    >
                        <Eye size={14} />
                    </button>
                    {!row.resolved && (
                        <button
                            onClick={() => handleResolve(row._id)}
                            className="p-1.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                            title="Mark as Resolved"
                        >
                            <Check size={14} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-foreground italic uppercase tracking-tighter">
                        Error Logs
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest">
                        Monitor and track system errors
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={cn(
                            "px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                            autoRefresh 
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
                    </button>
                    <button
                        onClick={() => { fetchLogs(); fetchStats(); }}
                        className="p-2 bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-all"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-4 text-center">
                            <AlertCircle size={16} className="mx-auto text-primary mb-1" />
                            <p className="text-[8px] font-black uppercase text-muted-foreground">Total</p>
                            <p className="text-2xl font-black text-foreground">{stats.total}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-amber-500/5 border-amber-500/20">
                        <CardContent className="p-4 text-center">
                            <Clock size={16} className="mx-auto text-amber-500 mb-1" />
                            <p className="text-[8px] font-black uppercase text-muted-foreground">Today</p>
                            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.today}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-rose-500/5 border-rose-500/20">
                        <CardContent className="p-4 text-center">
                            <XCircle size={16} className="mx-auto text-rose-500 mb-1" />
                            <p className="text-[8px] font-black uppercase text-muted-foreground">Unresolved</p>
                            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.unresolved}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-500/5 border-emerald-500/20">
                        <CardContent className="p-4 text-center">
                            <CheckCircle size={16} className="mx-auto text-emerald-500 mb-1" />
                            <p className="text-[8px] font-black uppercase text-muted-foreground">Resolved</p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                {stats.total - stats.unresolved}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-purple-500/5 border-purple-500/20">
                        <CardContent className="p-4 text-center">
                            <Activity size={16} className="mx-auto text-purple-500 mb-1" />
                            <p className="text-[8px] font-black uppercase text-muted-foreground">7 Days</p>
                            <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.week}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search errors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 outline-none transition-all"
                    />
                </div>
                
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:border-primary/50 outline-none transition-all"
                >
                    <option value="all">All Types</option>
                    <option value="backend">Backend</option>
                    <option value="frontend">Frontend</option>
                    <option value="database">Database</option>
                    <option value="api">API</option>
                    <option value="validation">Validation</option>
                    <option value="auth">Auth</option>
                    <option value="payment">Payment</option>
                    <option value="email">Email</option>
                </select>

                <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:border-primary/50 outline-none transition-all"
                >
                    <option value="all">All Severity</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>

                <select
                    value={filterResolved}
                    onChange={(e) => setFilterResolved(e.target.value)}
                    className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:border-primary/50 outline-none transition-all"
                >
                    <option value="all">All Status</option>
                    <option value="false">Unresolved</option>
                    <option value="true">Resolved</option>
                </select>
            </div>

            {/* Error Logs Table */}
            <DataTable
                columns={columns}
                data={logs}
                loading={loading}
                totalCount={totalLogs}
                onParamsChange={() => {}}
                renderMobileCard={(log) => (
                    <div className="bg-card border-border p-5 rounded-2xl space-y-3 shadow-lg">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">
                                    {log.error_message}
                                </p>
                                <p className="text-[9px] text-muted-foreground font-mono truncate mt-0.5">
                                    {log.url || 'N/A'}
                                </p>
                            </div>
                            <div className="flex gap-1.5 ml-2 flex-shrink-0">
                                <button
                                    onClick={() => { setSelectedLog(log); setShowDetails(true); }}
                                    className="p-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                                >
                                    <Eye size={14} />
                                </button>
                                {!log.resolved && (
                                    <button
                                        onClick={() => handleResolve(log._id)}
                                        className="p-1.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                                    >
                                        <Check size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                            <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                                getTypeColor(log.error_type)
                            )}>
                                {getTypeIcon(log.error_type)}
                                {log.error_type}
                            </span>
                            <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                                getSeverityColor(log.severity)
                            )}>
                                {getSeverityIcon(log.severity)}
                                {log.severity}
                            </span>
                            <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                                log.resolved 
                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            )}>
                                {log.resolved ? <CheckCircle size={10} /> : <Clock size={10} />}
                                {log.resolved ? 'Resolved' : 'Open'}
                            </span>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-2 border-t border-border">
                            <span className="flex items-center gap-1">
                                <User size={10} />
                                {log.user_id?.name || log.user_id?.email || 'System'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar size={10} />
                                {formatDate(log.created_at)}
                            </span>
                        </div>
                    </div>
                )}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                    <p className="text-[10px] text-muted-foreground">
                        Showing {logs.length} of {totalLogs} logs
                    </p>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 bg-muted rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 bg-muted rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Error Details Modal */}
            {showDetails && selectedLog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-3xl border border-border max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-xl",
                                    selectedLog.resolved 
                                        ? "bg-emerald-500/20" 
                                        : "bg-rose-500/20"
                                )}>
                                    {selectedLog.resolved 
                                        ? <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                                        : <AlertCircle size={20} className="text-rose-600 dark:text-rose-400" />
                                    }
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-foreground">Error Details</h2>
                                    <p className="text-[10px] text-muted-foreground">
                                        {selectedLog.resolved ? 'Resolved' : 'Open'} • {formatDate(selectedLog.created_at)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="p-2 hover:bg-muted rounded-xl transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Error Message */}
                            <div>
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Error Message</label>
                                <div className="mt-1 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                    <p className="text-sm font-bold text-foreground">{selectedLog.error_message}</p>
                                </div>
                            </div>

                            {/* Error Details Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Type</label>
                                    <div className="mt-1 flex items-center gap-2">
                                        {getTypeIcon(selectedLog.error_type)}
                                        <span className="text-sm font-bold text-foreground capitalize">{selectedLog.error_type}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Severity</label>
                                    <div className="mt-1 flex items-center gap-2">
                                        {getSeverityIcon(selectedLog.severity)}
                                        <span className={cn(
                                            "text-sm font-bold uppercase",
                                            selectedLog.severity === 'critical' ? 'text-rose-600 dark:text-rose-400' :
                                            selectedLog.severity === 'high' ? 'text-orange-600 dark:text-orange-400' :
                                            selectedLog.severity === 'medium' ? 'text-amber-600 dark:text-amber-400' :
                                            'text-blue-600 dark:text-blue-400'
                                        )}>
                                            {selectedLog.severity}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Status Code</label>
                                    <div className="mt-1">
                                        <span className="text-sm font-bold text-foreground">{selectedLog.status_code || 'N/A'}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">User</label>
                                    <div className="mt-1">
                                        <span className="text-sm font-bold text-foreground">
                                            {selectedLog.user_id?.name || selectedLog.user_id?.email || 'System'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Request Details */}
                            <div>
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Request Details</label>
                                <div className="mt-1 grid grid-cols-2 gap-2 p-3 bg-muted rounded-xl">
                                    <div>
                                        <span className="text-[8px] text-muted-foreground">Method</span>
                                        <p className="text-xs font-bold text-foreground">{selectedLog.method || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[8px] text-muted-foreground">URL</span>
                                        <p className="text-xs font-bold text-foreground truncate">{selectedLog.url || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[8px] text-muted-foreground">IP</span>
                                        <p className="text-xs font-bold text-foreground">{selectedLog.ip || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[8px] text-muted-foreground">User Agent</span>
                                        <p className="text-xs font-bold text-foreground truncate">{selectedLog.user_agent || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Stack Trace */}
                            {selectedLog.error_stack && (
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Stack Trace</label>
                                    <div className="mt-1 p-3 bg-muted rounded-xl overflow-x-auto">
                                        <pre className="text-[10px] font-mono text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                                            {selectedLog.error_stack}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Request Data */}
                            {selectedLog.request_data && (
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Request Data</label>
                                    <div className="mt-1 p-3 bg-muted rounded-xl overflow-x-auto">
                                        <pre className="text-[10px] font-mono text-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                                            {JSON.stringify(selectedLog.request_data, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Resolution */}
                            {selectedLog.resolved && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                            Resolved at {formatDate(selectedLog.resolved_at)}
                                        </span>
                                    </div>
                                    {selectedLog.resolution_notes && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Notes: {selectedLog.resolution_notes}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-border">
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="flex-1 py-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors rounded-xl"
                                >
                                    Close
                                </button>
                                {!selectedLog.resolved && (
                                    <button
                                        onClick={() => {
                                            handleResolve(selectedLog._id);
                                            setShowDetails(false);
                                        }}
                                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold text-sm transition-all"
                                    >
                                        <Check size={14} className="inline mr-2" />
                                        Mark as Resolved
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ErrorLogs;