import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPut } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';
import { Settings, Percent, Save, Loader2, RefreshCw, ToggleLeft, ToggleRight, Wrench, Shield, AlertTriangle, Activity, Clock, HardDrive, MessageCircle, Power } from 'lucide-react';
import { cn } from '@/utils/cn';

const SETTINGS_META = {
    platform_fee_percent: {
        label: 'Platform Fee',
        description: 'Percentage cut taken from each completed booking revenue.',
        type: 'percent',
        icon: <Percent size={16} />,
        color: 'emerald',
        min: 0,
        max: 100,
    },
    max_booking_hours: {
        label: 'Max Booking Hours',
        description: 'Maximum hours a single booking session can last.',
        type: 'number',
        icon: <Settings size={16} />,
        color: 'indigo',
        min: 1,
        max: 72,
    },
    cancellation_window_hours: {
        label: 'Cancellation Window',
        description: 'Hours before check-in that a user can cancel for free.',
        type: 'number',
        icon: <Settings size={16} />,
        color: 'amber',
        min: 0,
        max: 72,
    },
    allow_walkin_guest: {
        label: 'Allow Anonymous Walk-ins',
        description: 'Let staff check in guests without a registered account.',
        type: 'boolean',
        icon: <ToggleLeft size={16} />,
        color: 'blue',
    },

    // System Mode - READ ONLY (detected from environment)
    system_mode: {
        label: 'System Mode',
        description: 'Current system operating mode (detected from environment).',
        type: 'readonly',  // ← READ ONLY
        icon: <HardDrive size={16} />,
        color: 'purple',
        options: [
            { value: 'production', label: 'Production (Normal Operation)' },
            { value: 'development', label: 'Development (Testing Mode)' },
        ]
    },

    // Maintenance Mode - TOGGLE (admin controlled)
    maintenance_mode: {
        label: 'Maintenance Mode',
        description: 'Temporarily take the site offline for maintenance.',
        type: 'boolean',
        icon: <Wrench size={16} />,
        color: 'amber',
    },

    // Maintenance Message - TEXT (only shown when maintenance is ON)
    maintenance_message: {
        label: 'Maintenance Message',
        description: 'Message shown to users when maintenance mode is active.',
        type: 'text',
        icon: <MessageCircle size={16} />,
        color: 'amber',
        maxLength: 500
    },
};
const COLOR_MAP = {
    emerald: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        focus: 'focus:border-emerald-500',
        badge: 'bg-emerald-500/10 text-emerald-400',
        glow: 'shadow-emerald-900/20',
        toggle: 'bg-emerald-600',
    },
    indigo: {
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        text: 'text-indigo-400',
        focus: 'focus:border-indigo-500',
        badge: 'bg-indigo-500/10 text-indigo-400',
        glow: 'shadow-indigo-900/20',
        toggle: 'bg-indigo-600',
    },
    amber: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        focus: 'focus:border-amber-500',
        badge: 'bg-amber-500/10 text-amber-400',
        glow: 'shadow-amber-900/20',
        toggle: 'bg-amber-600',
    },
    blue: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        text: 'text-blue-400',
        focus: 'focus:border-blue-500',
        badge: 'bg-blue-500/10 text-blue-400',
        glow: 'shadow-blue-900/20',
        toggle: 'bg-blue-600',
    },
    // ✅ ADD THIS - Missing purple color
    purple: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        text: 'text-purple-400',
        focus: 'focus:border-purple-500',
        badge: 'bg-purple-500/10 text-purple-400',
        glow: 'shadow-purple-900/20',
        toggle: 'bg-purple-600',
    },
};

const AdminSettings = () => {
    const [settings, setSettings] = useState({});
    const [original, setOriginal] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState({});

    // Anti-DDoS Status State
    const [ddosStatus, setDdosStatus] = useState({
        isUnderAttack: false,
        attackDuration: null,
        activeIPS: 0,
        serverLoadLastMinute: 0
    });
    const [ddosLoading, setDdosLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiGet('/admin/settings');
            if (res.success) {
                const map = {};
                (res.data || []).forEach(s => { map[s.key] = s.value; });
                setSettings(map);
                setOriginal(map);
            }
        } catch {
            showToast({ icon: 'error', title: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDdosStatus = useCallback(async () => {
        try {
            const res = await apiGet('/health/antiddos-status');
            if (res) {
                setDdosStatus({
                    isUnderAttack: res.isUnderAttack || false,
                    attackDuration: res.attackDuration || null,
                    activeIPS: res.activeIPS || 0,
                    serverLoadLastMinute: res.serverLoadLastMinute || 0
                });
            }
        } catch (err) {
            console.error('Failed to fetch DDoS status:', err);
        } finally {
            setDdosLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
        fetchDdosStatus();

        // Poll for real-time DDoS status every 5 seconds
        const interval = setInterval(() => {
            fetchDdosStatus();
        }, 5000);

        return () => clearInterval(interval);
    }, [fetchSettings, fetchDdosStatus]);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async (key) => {
        setSaving(prev => ({ ...prev, [key]: true }));
        try {
            const res = await apiPut('/admin/settings', { key, value: settings[key] });
            if (res.success) {
                setOriginal(prev => ({ ...prev, [key]: settings[key] }));
                showToast({ icon: 'success', title: 'Setting updated' });
            }
        } catch {
            showToast({ icon: 'error', title: 'Failed to save setting' });
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    const isDirty = (key) => settings[key] !== original[key];

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
                Loading System Config...
            </p>
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

            {/* Header */}
            <div className="flex items-end justify-between mb-10">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">System Settings</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
                        Global configuration — changes apply immediately.
                    </p>
                </div>
                <button
                    onClick={() => { fetchSettings(); fetchDdosStatus(); }}
                    className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all active:scale-95 group"
                >
                    <RefreshCw className="w-4 h-4 text-indigo-500 group-hover:rotate-180 transition-transform duration-500" />
                </button>
            </div>

            {/* ========== ANTI-DDoS STATUS CARD ========== */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <Shield size={16} className="text-red-400" />
                    </div>
                    <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">Security Status</h2>
                    {ddosLoading && <Loader2 size={14} className="text-slate-500 animate-spin ml-2" />}
                </div>

                <div className={cn(
                    "border rounded-4xl p-6 transition-all duration-500",
                    ddosStatus.isUnderAttack
                        ? "bg-red-500/5 border-red-500/30 shadow-lg shadow-red-900/20"
                        : "bg-[#111114] border-white/5"
                )}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-3 h-3 rounded-full animate-pulse",
                                ddosStatus.isUnderAttack ? "bg-red-500" : "bg-emerald-500"
                            )} />
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                ddosStatus.isUnderAttack ? "text-red-400" : "text-emerald-400"
                            )}>
                                {ddosStatus.isUnderAttack ? "⚠️ ATTACK DETECTED" : "✅ SYSTEM NORMAL"}
                            </span>
                        </div>
                        {ddosStatus.isUnderAttack && ddosStatus.attackDuration && (
                            <span className="text-[8px] text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
                                Ongoing for: {ddosStatus.attackDuration}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="bg-black/30 rounded-2xl p-4 text-center">
                            <Activity size={18} className="text-indigo-400 mx-auto mb-2" />
                            <p className="text-[8px] text-slate-500 uppercase tracking-wider">Server Load</p>
                            <p className="text-xl font-black text-white">{ddosStatus.serverLoadLastMinute}</p>
                            <p className="text-[7px] text-slate-600">requests/min</p>
                        </div>
                        <div className="bg-black/30 rounded-2xl p-4 text-center">
                            <AlertTriangle size={18} className="text-amber-400 mx-auto mb-2" />
                            <p className="text-[8px] text-slate-500 uppercase tracking-wider">Attack Mode</p>
                            <p className={cn(
                                "text-xl font-black",
                                ddosStatus.isUnderAttack ? "text-red-400" : "text-emerald-400"
                            )}>
                                {ddosStatus.isUnderAttack ? "ACTIVE" : "INACTIVE"}
                            </p>
                            <p className="text-[7px] text-slate-600">
                                {ddosStatus.isUnderAttack ? "Strict limits enabled" : "Normal operation"}
                            </p>
                        </div>
                        <div className="bg-black/30 rounded-2xl p-4 text-center">
                            <Clock size={18} className="text-blue-400 mx-auto mb-2" />
                            <p className="text-[8px] text-slate-500 uppercase tracking-wider">Active IPs</p>
                            <p className="text-xl font-black text-white">{ddosStatus.activeIPS}</p>
                            <p className="text-[7px] text-slate-600">temporarily blocked</p>
                        </div>
                    </div>

                    {ddosStatus.isUnderAttack && (
                        <div className="mt-4 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                            <p className="text-[9px] text-red-400 text-center font-bold uppercase tracking-wider">
                                ⚠️ High traffic detected - Rate limiting is now strict (30 req/min per IP)
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Settings Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(SETTINGS_META).map(([key, meta]) => {
                    const c = COLOR_MAP[meta.color];
                    const value = settings[key];
                    const dirty = isDirty(key);
                    const isSavingThis = saving[key];

                    return (
                        <div
                            key={key}
                            className={cn(
                                "bg-[#111114] border rounded-4xl p-6 transition-all duration-300 shadow-xl",
                                dirty ? `${c.border} shadow-lg ${c.glow}` : "border-white/5"
                            )}
                        >
                            {/* Card header */}
                            <div className="flex items-start justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", c.bg, c.border, c.text)}>
                                        {meta.icon}
                                    </div>
                                    <div>
                                        <p className="text-white font-black text-sm uppercase italic tracking-tight">
                                            {meta.label}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                            {key}
                                        </p>
                                    </div>
                                </div>

                                {dirty && (
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg animate-pulse", c.badge)}>
                                        Unsaved
                                    </span>
                                )}
                            </div>

                            <p className="text-[11px] text-slate-500 font-medium mb-5 leading-relaxed">
                                {meta.description}
                            </p>

                            {/* Input - Handle different types */}
{meta.type === 'readonly' ? (
    // Readonly display (for system_mode)
    <div className="mb-5">
        <div className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between">
                <span className="text-white font-black text-sm uppercase">
                    {(() => {
                        const env = import.meta.env.VITE_ENV || 'production';
                        if (env === 'development') return 'Development (Testing Mode)';
                        return 'Production (Normal Operation)';
                    })()}
                </span>
                <div className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                    import.meta.env.VITE_ENV === 'development' ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                )}>
                    {import.meta.env.VITE_ENV === 'development' ? 'DEV' : 'PROD'}
                </div>
            </div>
            <p className="text-[8px] text-slate-500 mt-2">
                Detected from VITE_ENV environment variable
            </p>
        </div>
    </div>
) : meta.type === 'boolean' ? (
    // Boolean toggle (for maintenance_mode)
    <div className="flex items-center justify-between mb-5">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            {value ? 'Enabled' : 'Disabled'}
        </span>
        <button
            onClick={() => handleChange(key, !value)}
            className={cn(
                "relative w-14 h-7 rounded-full transition-all duration-300 border",
                value ? `${c.toggle} border-transparent` : "bg-white/5 border-white/10"
            )}
        >
            <span className={cn(
                "absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300",
                value ? "left-8" : "left-1"
            )} />
        </button>
    </div>
) : meta.type === 'text' ? (
    // Text input
    <div className="relative mb-5">
        <input
            type="text"
            maxLength={meta.maxLength}
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            className={cn(
                "w-full bg-black/40 border rounded-2xl px-4 py-3 text-white font-black text-sm outline-none transition-all",
                dirty ? `${c.border} ${c.focus}` : "border-white/10 focus:border-white/30"
            )}
            placeholder="Enter maintenance message..."
        />
        {meta.maxLength && (
            <p className="text-[7px] text-slate-500 text-right mt-1">{value?.length || 0}/{meta.maxLength}</p>
        )}
    </div>
) : meta.type === 'select' ? (
    // Select dropdown
    <div className="mb-5">
        <select
            value={value || 'production'}
            onChange={(e) => handleChange(key, e.target.value)}
            className={cn(
                "w-full bg-black/40 border rounded-2xl px-4 py-3 text-white font-black text-sm outline-none transition-all",
                dirty ? `${c.border} ${c.focus}` : "border-white/10 focus:border-white/30"
            )}
        >
            {meta.options.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-black">
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
) : meta.type === 'percent' ? (
    // Percent input
    <div className="relative mb-5">
        <input
            type="number"
            min={meta.min}
            max={meta.max}
            step="0.01"
            value={value ?? ''}
            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
            className={cn(
                "w-full bg-black/40 border rounded-2xl px-4 py-3 text-white font-black text-lg outline-none transition-all",
                dirty ? `${c.border} ${c.focus}` : "border-white/10 focus:border-white/30"
            )}
        />
        <span className={cn("absolute right-4 top-1/2 -translate-y-1/2 font-black text-lg", c.text)}>%</span>
    </div>
) : (
    // Number input
    <div className="relative mb-5">
        <input
            type="number"
            min={meta.min}
            max={meta.max}
            value={value ?? ''}
            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
            className={cn(
                "w-full bg-black/40 border rounded-2xl px-4 py-3 text-white font-black text-lg outline-none transition-all",
                dirty ? `${c.border} ${c.focus}` : "border-white/10 focus:border-white/30"
            )}
        />
        {meta.type === 'number' && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-xs text-slate-600 uppercase tracking-widest">
                hrs
            </span>
        )}
    </div>
)}

                            {/* Save button */}
                            <button
                                onClick={() => handleSave(key)}
                                disabled={!dirty || isSavingThis}
                                className={cn(
                                    "w-full py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg",
                                    dirty
                                        ? `${c.toggle} text-white hover:opacity-90 shadow-lg ${c.glow}`
                                        : "bg-white/5 text-slate-600 cursor-not-allowed",
                                    isSavingThis && "opacity-50"
                                )}
                            >
                                {isSavingThis
                                    ? <><Loader2 size={13} className="animate-spin" /> Saving...</>
                                    : <><Save size={13} /> Save Change</>
                                }
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminSettings;