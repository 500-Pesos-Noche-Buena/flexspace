import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPut } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';
import { useTheme } from '@/hooks/useTheme';
import { formatNumber } from '@/utils/formatNumber';
import {
    Cpu,
    Sparkles,
    Bot,
    FileText,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    Save,
    Activity,
    Zap,
    TrendingUp,
    Clock,
    Sliders,
    ArrowRight,
    Search,
    ChevronLeft,
    ChevronRight,
    Layers,
    Server,
    HelpCircle
} from 'lucide-react';

export default function AiSettings() {
    const { themeColor } = useTheme();

    // Configuration state
    const [settings, setSettings] = useState({
        chatbotConfig: {
            mode: 'auto',
            selectedModel: 'gemini-2.0-flash',
            fallbackEnabled: true,
            temperature: 0.3
        },
        blogConfig: {
            mode: 'auto',
            selectedModel: 'gemini-2.0-flash',
            fallbackEnabled: true,
            temperature: 0.7
        },
        defaultPriorityList: [
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-1.5-flash',
            'gemini-2.5-flash'
        ]
    });

    const [availableModels, setAvailableModels] = useState([
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Recommended)', tier: 'High Speed & Free Tier' },
        { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', tier: 'Ultra Fast & Low Latency' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tier: 'High Stability' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: 'Advanced Reasoning' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'High Context' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'Flagship Performance' }
    ]);

    // Analytics & Telemetry state
    const [timeframe, setTimeframe] = useState('week');
    const [analytics, setAnalytics] = useState(null);
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
    const [logServiceFilter, setLogServiceFilter] = useState('all');
    const [logStatusFilter, setLogStatusFilter] = useState('all');

    // UI Loading state
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [activeTab, setActiveTab] = useState('routing'); // 'routing' | 'analytics' | 'logs'

    // Load AI Settings
    const fetchSettings = useCallback(async () => {
        try {
            setLoadingSettings(true);
            const res = await apiGet('/admin/ai/settings');
            if (res.success && res.data) {
                setSettings(res.data);
                if (res.availableModels?.length) {
                    setAvailableModels(res.availableModels);
                }
            }
        } catch (error) {
            console.error('[AiSettings] Failed to fetch settings:', error);
            showToast({
                icon: 'error',
                title: 'Error Loading Settings',
                text: error.message || 'Could not load AI routing configurations'
            });
        } finally {
            setLoadingSettings(false);
        }
    }, []);

    // Load Analytics
    const fetchAnalytics = useCallback(async (tf = timeframe) => {
        try {
            setLoadingAnalytics(true);
            const res = await apiGet(`/admin/ai/analytics?timeframe=${tf}`);
            if (res.success && res.data) {
                setAnalytics(res.data);
            }
        } catch (error) {
            console.error('[AiSettings] Failed to fetch analytics:', error);
        } finally {
            setLoadingAnalytics(false);
        }
    }, [timeframe]);

    // Load Logs
    const fetchLogs = useCallback(async (page = 1, service = logServiceFilter, status = logStatusFilter) => {
        try {
            setLoadingLogs(true);
            let url = `/admin/ai/logs?page=${page}&limit=15`;
            if (service !== 'all') url += `&service=${service}`;
            if (status !== 'all') url += `&status=${status}`;

            const res = await apiGet(url);
            if (res.success && res.data) {
                setLogs(res.data);
                if (res.pagination) setPagination(res.pagination);
            }
        } catch (error) {
            console.error('[AiSettings] Failed to fetch logs:', error);
        } finally {
            setLoadingLogs(false);
        }
    }, [logServiceFilter, logStatusFilter]);

    useEffect(() => {
        fetchSettings();
        fetchAnalytics(timeframe);
        fetchLogs(1);
    }, [fetchSettings, fetchAnalytics, fetchLogs, timeframe]);

    // Save Settings
    const handleSaveSettings = async (e) => {
        e?.preventDefault();
        try {
            setSavingSettings(true);
            const res = await apiPut('/admin/ai/settings', settings);
            if (res.success) {
                showToast({
                    icon: 'success',
                    title: 'Settings Saved',
                    text: 'AI model routing configurations updated successfully.'
                });
                if (res.data) setSettings(res.data);
            }
        } catch (error) {
            console.error('[AiSettings] Failed to save settings:', error);
            showToast({
                icon: 'error',
                title: 'Save Failed',
                text: error.message || 'Could not update AI configurations'
            });
        } finally {
            setSavingSettings(false);
        }
    };

    // Filter changes for logs
    const handleServiceFilterChange = (srv) => {
        setLogServiceFilter(srv);
        fetchLogs(1, srv, logStatusFilter);
    };

    const handleStatusFilterChange = (st) => {
        setLogStatusFilter(st);
        fetchLogs(1, logServiceFilter, st);
    };

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > pagination.pages) return;
        fetchLogs(newPage, logServiceFilter, logStatusFilter);
    };

    const getStatusBadge = (status, fallbackFrom) => {
        switch (status) {
            case 'success':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300/40">
                        <CheckCircle2 className="w-3 h-3" /> Success
                    </span>
                );
            case 'fallback':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300/40" title={fallbackFrom ? `Recovered from ${fallbackFrom}` : 'Recovered via fallback'}>
                        <Zap className="w-3 h-3" /> Recovered {fallbackFrom ? `(${fallbackFrom})` : ''}
                    </span>
                );
            case 'rate_limited':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400 border border-orange-300/40">
                        <AlertTriangle className="w-3 h-3" /> 429 Intercepted
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300/40">
                        <AlertTriangle className="w-3 h-3" /> Failed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-6">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Cpu className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            AI Operations & Model Routing
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                        Centralized Gemini AI model orchestration with autonomous 429 rate-limit failovers, manual overrides, and live token usage telemetry.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => {
                            fetchSettings();
                            fetchAnalytics(timeframe);
                            fetchLogs(pagination.page);
                        }}
                        disabled={loadingSettings || loadingAnalytics || loadingLogs}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${(loadingSettings || loadingAnalytics || loadingLogs) ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {savingSettings ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-border/60">
                <button
                    onClick={() => setActiveTab('routing')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                        activeTab === 'routing'
                            ? 'border-primary text-primary font-semibold'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Sliders className="w-4 h-4" />
                    Model Routing & Failover
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                        activeTab === 'analytics'
                            ? 'border-primary text-primary font-semibold'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Activity className="w-4 h-4" />
                    Usage & Token Analytics
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                        activeTab === 'logs'
                            ? 'border-primary text-primary font-semibold'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    Execution Logs
                </button>
            </div>

            {/* TAB 1: MODEL ROUTING & SETTINGS */}
            {activeTab === 'routing' && (
                <div className="space-y-6">
                    {/* Status Alert Banner */}
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex items-start gap-3.5">
                        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <span className="font-semibold text-foreground">Zero-Disruption Fallback Shield Active: </span>
                            <span className="text-muted-foreground">
                                If a Gemini model exhausts its hourly or RPM quota (HTTP 429), the orchestrator automatically reroutes the request in real-time to the next model in the fallback chain without erroring out to regular users.
                            </span>
                        </div>
                    </div>

                    {/* Service Config Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Service Card 1: Chatbot */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-base text-foreground">Chatbot Support</h3>
                                        <p className="text-xs text-muted-foreground">Interactive assistance at /chat/support</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                    settings.chatbotConfig?.mode === 'auto'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                }`}>
                                    {settings.chatbotConfig?.mode === 'auto' ? 'Auto Dynamic' : 'Manual Override'}
                                </span>
                            </div>

                            {/* Mode Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Routing Strategy
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSettings(prev => ({
                                            ...prev,
                                            chatbotConfig: { ...prev.chatbotConfig, mode: 'auto' }
                                        }))}
                                        className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                                            settings.chatbotConfig?.mode === 'auto'
                                                ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                                                : 'border-border bg-background hover:bg-accent/40 text-muted-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                                            <Sparkles className="w-3.5 h-3.5 text-primary" /> Auto (Recommended)
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Start with primary high-quota model & auto-failover
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSettings(prev => ({
                                            ...prev,
                                            chatbotConfig: { ...prev.chatbotConfig, mode: 'manual' }
                                        }))}
                                        className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                                            settings.chatbotConfig?.mode === 'manual'
                                                ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                                                : 'border-border bg-background hover:bg-accent/40 text-muted-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                                            <Sliders className="w-3.5 h-3.5 text-primary" /> Manual Override
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Pin a specific model designated by admin
                                        </p>
                                    </button>
                                </div>
                            </div>

                            {/* Manual Model Dropdown */}
                            {settings.chatbotConfig?.mode === 'manual' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Designated Model
                                    </label>
                                    <select
                                        value={settings.chatbotConfig?.selectedModel || 'gemini-2.0-flash'}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            chatbotConfig: { ...prev.chatbotConfig, selectedModel: e.target.value }
                                        }))}
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {availableModels.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} ({m.tier})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Fallback Checkbox */}
                            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                                <div>
                                    <span className="text-sm font-medium text-foreground block">
                                        Rate-Limit (429) Fallback
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Fall back to next priority model if rate limited
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.chatbotConfig?.fallbackEnabled ?? true}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        chatbotConfig: { ...prev.chatbotConfig, fallbackEnabled: e.target.checked }
                                    }))}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                                />
                            </div>

                            {/* Temperature Control */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                                        Sampling Temperature
                                    </span>
                                    <span className="font-mono font-medium text-foreground bg-accent px-2 py-0.5 rounded">
                                        {settings.chatbotConfig?.temperature ?? 0.3}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0.0"
                                    max="1.0"
                                    step="0.05"
                                    value={settings.chatbotConfig?.temperature ?? 0.3}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        chatbotConfig: { ...prev.chatbotConfig, temperature: parseFloat(e.target.value) }
                                    }))}
                                    className="w-full accent-primary cursor-pointer"
                                />
                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                    <span>Precise & Factual (0.0)</span>
                                    <span>Balanced (0.5)</span>
                                    <span>Creative (1.0)</span>
                                </div>
                            </div>
                        </div>

                        {/* Service Card 2: AI Blog Generator */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-base text-foreground">AI Blog Generator</h3>
                                        <p className="text-xs text-muted-foreground">Automated publishing & trends at /blogs</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                    settings.blogConfig?.mode === 'auto'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                }`}>
                                    {settings.blogConfig?.mode === 'auto' ? 'Auto Dynamic' : 'Manual Override'}
                                </span>
                            </div>

                            {/* Mode Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Routing Strategy
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSettings(prev => ({
                                            ...prev,
                                            blogConfig: { ...prev.blogConfig, mode: 'auto' }
                                        }))}
                                        className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                                            settings.blogConfig?.mode === 'auto'
                                                ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                                                : 'border-border bg-background hover:bg-accent/40 text-muted-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                                            <Sparkles className="w-3.5 h-3.5 text-primary" /> Auto (Recommended)
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Start with primary high-quota model & auto-failover
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSettings(prev => ({
                                            ...prev,
                                            blogConfig: { ...prev.blogConfig, mode: 'manual' }
                                        }))}
                                        className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                                            settings.blogConfig?.mode === 'manual'
                                                ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                                                : 'border-border bg-background hover:bg-accent/40 text-muted-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                                            <Sliders className="w-3.5 h-3.5 text-primary" /> Manual Override
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Pin a specific model designated by admin
                                        </p>
                                    </button>
                                </div>
                            </div>

                            {/* Manual Model Dropdown */}
                            {settings.blogConfig?.mode === 'manual' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Designated Model
                                    </label>
                                    <select
                                        value={settings.blogConfig?.selectedModel || 'gemini-2.0-flash'}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            blogConfig: { ...prev.blogConfig, selectedModel: e.target.value }
                                        }))}
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {availableModels.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} ({m.tier})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Fallback Checkbox */}
                            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                                <div>
                                    <span className="text-sm font-medium text-foreground block">
                                        Rate-Limit (429) Fallback
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Fall back to next priority model if rate limited
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.blogConfig?.fallbackEnabled ?? true}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        blogConfig: { ...prev.blogConfig, fallbackEnabled: e.target.checked }
                                    }))}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                                />
                            </div>

                            {/* Temperature Control */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                                        Sampling Temperature
                                    </span>
                                    <span className="font-mono font-medium text-foreground bg-accent px-2 py-0.5 rounded">
                                        {settings.blogConfig?.temperature ?? 0.7}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0.0"
                                    max="1.0"
                                    step="0.05"
                                    value={settings.blogConfig?.temperature ?? 0.7}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        blogConfig: { ...prev.blogConfig, temperature: parseFloat(e.target.value) }
                                    }))}
                                    className="w-full accent-primary cursor-pointer"
                                />
                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                    <span>Precise & Factual (0.0)</span>
                                    <span>Balanced (0.5)</span>
                                    <span>Creative (1.0)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Automatic Priority Chain Visualization */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-primary" />
                                    Dynamic Priority & Failover Chain
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Requests seamlessly step down through this tier whenever a 429 quota exhaustion is detected.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                            {(settings.defaultPriorityList || []).map((modelId, index) => (
                                <div
                                    key={modelId}
                                    className="relative flex flex-col p-4 rounded-xl border border-border bg-background shadow-xs hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                            {index + 1}
                                        </span>
                                        <span className="text-[11px] font-mono text-muted-foreground">
                                            {index === 0 ? 'Primary' : `Fallback ${index}`}
                                        </span>
                                    </div>
                                    <span className="font-semibold text-sm text-foreground break-all">
                                        {modelId}
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-1">
                                        {index === 0 && 'High Speed & Generous Quota'}
                                        {index === 1 && 'Ultra Fast & Low Latency'}
                                        {index === 2 && 'High Stability Backup'}
                                        {index === 3 && 'Advanced Reasoning Fallback'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: ANALYTICS & TOKEN TELEMETRY */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {/* Timeframe Selector */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Analytics Timeframe:</span>
                        <div className="inline-flex rounded-lg border border-border p-1 bg-card">
                            {[
                                { id: 'day', label: 'Today (24h)' },
                                { id: 'week', label: 'Past 7 Days' },
                                { id: 'month', label: 'Past 30 Days' },
                                { id: 'all', label: 'All Time' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setTimeframe(item.id);
                                        fetchAnalytics(item.id);
                                    }}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                        timeframe === item.id
                                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* KPI Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Requests */}
                        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-xs font-medium uppercase tracking-wider">Total Requests</span>
                                <Activity className="w-4 h-4 text-primary" />
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                {formatNumber(analytics?.summary?.totalRequests || 0)}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {analytics?.summary?.successRate || '100'}%
                                </span>
                                <span>completion rate</span>
                            </div>
                        </div>

                        {/* Total Tokens */}
                        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-xs font-medium uppercase tracking-wider">Total Tokens</span>
                                <Zap className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                {formatNumber(analytics?.summary?.totalTokens || 0)}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center justify-between">
                                <span>In: {formatNumber(analytics?.summary?.totalInputTokens || 0)}</span>
                                <span>Out: {formatNumber(analytics?.summary?.totalOutputTokens || 0)}</span>
                            </div>
                        </div>

                        {/* Fallback Recoveries */}
                        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-xs font-medium uppercase tracking-wider">Auto-Recoveries</span>
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                {formatNumber(analytics?.summary?.fallbackRecoveries || 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                429 quota spikes transparently rescued
                            </div>
                        </div>

                        {/* Service Activity Split */}
                        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-xs font-medium uppercase tracking-wider">Service Split</span>
                                <Server className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <span>{analytics?.services?.chatbot?.requests || 0}</span>
                                <span className="text-xs font-normal text-muted-foreground">chat /</span>
                                <span>{analytics?.services?.blog?.requests || 0}</span>
                                <span className="text-xs font-normal text-muted-foreground">blog</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Chatbot vs AI Blog generator volume
                            </div>
                        </div>
                    </div>

                    {/* Model Performance Breakdown */}
                    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                        <div className="p-5 border-b border-border/60">
                            <h3 className="font-semibold text-base text-foreground">Model Breakdown & Health</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Performance metrics, volume, rate-limit hits, and recovery distribution across model tiers.
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold border-b border-border/60">
                                    <tr>
                                        <th className="px-5 py-3.5">Model Name</th>
                                        <th className="px-5 py-3.5">Total Requests</th>
                                        <th className="px-5 py-3.5">Total Tokens</th>
                                        <th className="px-5 py-3.5">429 Rate Limits</th>
                                        <th className="px-5 py-3.5">Auto-Recoveries</th>
                                        <th className="px-5 py-3.5 text-right">Avg Latency</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {analytics?.modelStats && analytics.modelStats.length > 0 ? (
                                        analytics.modelStats.map((item) => (
                                            <tr key={item.model} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-5 py-3.5 font-medium text-foreground font-mono text-xs">
                                                    {item.model}
                                                </td>
                                                <td className="px-5 py-3.5 text-muted-foreground">
                                                    {formatNumber(item.requests)}
                                                </td>
                                                <td className="px-5 py-3.5 text-muted-foreground">
                                                    {formatNumber(item.tokens)}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {item.rateLimits > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold text-xs">
                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                            {item.rateLimits}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">0</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {item.recoveries > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                                            <Zap className="w-3.5 h-3.5" />
                                                            {item.recoveries}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">0</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-mono text-xs text-muted-foreground">
                                                    {item.avgDurationMs ? `${item.avgDurationMs}ms` : '—'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-5 py-8 text-center text-muted-foreground text-sm">
                                                No AI execution records found for this timeframe.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: EXECUTION LOGS */}
            {activeTab === 'logs' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Service Filter */}
                            <select
                                value={logServiceFilter}
                                onChange={(e) => handleServiceFilterChange(e.target.value)}
                                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="all">All Services</option>
                                <option value="chatbot">Chatbot</option>
                                <option value="blog">AI Blog</option>
                            </select>

                            {/* Status Filter */}
                            <select
                                value={logStatusFilter}
                                onChange={(e) => handleStatusFilterChange(e.target.value)}
                                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="all">All Statuses</option>
                                <option value="success">Success</option>
                                <option value="fallback">Recovered (Fallback)</option>
                                <option value="rate_limited">Rate Limited (429)</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>

                        <span className="text-xs text-muted-foreground">
                            Showing {logs.length} of {pagination.total || 0} events
                        </span>
                    </div>

                    {/* Logs Table */}
                    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold border-b border-border/60">
                                    <tr>
                                        <th className="px-5 py-3">Timestamp</th>
                                        <th className="px-5 py-3">Service</th>
                                        <th className="px-5 py-3">Model Used</th>
                                        <th className="px-5 py-3">Tokens (In / Out / Tot)</th>
                                        <th className="px-5 py-3">Duration</th>
                                        <th className="px-5 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {logs.length > 0 ? (
                                        logs.map((log) => (
                                            <tr key={log._id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                                        log.service === 'chatbot'
                                                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                    }`}>
                                                        {log.service === 'chatbot' ? <Bot className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                                        {log.service === 'chatbot' ? 'Chatbot' : 'Blog'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 font-mono text-xs text-foreground">
                                                    {log.modelUsed}
                                                </td>
                                                <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                                                    {log.inputTokens} / {log.outputTokens} / <span className="font-semibold text-foreground">{log.totalTokens}</span>
                                                </td>
                                                <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                                                    {log.durationMs ? `${log.durationMs}ms` : '—'}
                                                </td>
                                                <td className="px-5 py-3">
                                                    {getStatusBadge(log.status, log.fallbackFrom)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-5 py-10 text-center text-muted-foreground text-sm">
                                                {loadingLogs ? 'Loading execution logs...' : 'No AI execution logs found for these filters.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 bg-muted/20">
                            <button
                                type="button"
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1 || loadingLogs}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-accent disabled:opacity-40"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Previous
                            </button>
                            <span className="text-xs text-muted-foreground">
                                Page {pagination.page} of {Math.max(1, pagination.pages || 1)}
                            </span>
                            <button
                                type="button"
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.pages || loadingLogs}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-accent disabled:opacity-40"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
