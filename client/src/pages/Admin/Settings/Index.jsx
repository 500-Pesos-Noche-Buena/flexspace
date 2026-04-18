import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPut } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';
import { Settings, Percent, Save, Loader2, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/utils/cn';

const SETTINGS_META = {
    platform_fee_percent: {
        label:       'Platform Fee',
        description: 'Percentage cut taken from each completed booking revenue.',
        type:        'percent',
        icon:        <Percent size={16} />,
        color:       'emerald',
        min:         0,
        max:         100,
    },
    max_booking_hours: {
        label:       'Max Booking Hours',
        description: 'Maximum hours a single booking session can last.',
        type:        'number',
        icon:        <Settings size={16} />,
        color:       'indigo',
        min:         1,
        max:         72,
    },
    cancellation_window_hours: {
        label:       'Cancellation Window',
        description: 'Hours before check-in that a user can cancel for free.',
        type:        'number',
        icon:        <Settings size={16} />,
        color:       'amber',
        min:         0,
        max:         72,
    },
    allow_walkin_guest: {
        label:       'Allow Anonymous Walk-ins',
        description: 'Let staff check in guests without a registered account.',
        type:        'boolean',
        icon:        <ToggleLeft size={16} />,
        color:       'blue',
    },
};

const COLOR_MAP = {
    emerald: {
        bg:     'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text:   'text-emerald-400',
        focus:  'focus:border-emerald-500',
        badge:  'bg-emerald-500/10 text-emerald-400',
        glow:   'shadow-emerald-900/20',
        toggle: 'bg-emerald-600',
    },
    indigo: {
        bg:     'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        text:   'text-indigo-400',
        focus:  'focus:border-indigo-500',
        badge:  'bg-indigo-500/10 text-indigo-400',
        glow:   'shadow-indigo-900/20',
        toggle: 'bg-indigo-600',
    },
    amber: {
        bg:     'bg-amber-500/10',
        border: 'border-amber-500/20',
        text:   'text-amber-400',
        focus:  'focus:border-amber-500',
        badge:  'bg-amber-500/10 text-amber-400',
        glow:   'shadow-amber-900/20',
        toggle: 'bg-amber-600',
    },
    blue: {
        bg:     'bg-blue-500/10',
        border: 'border-blue-500/20',
        text:   'text-blue-400',
        focus:  'focus:border-blue-500',
        badge:  'bg-blue-500/10 text-blue-400',
        glow:   'shadow-blue-900/20',
        toggle: 'bg-blue-600',
    },
};

const AdminSettings = () => {
    const [settings,    setSettings]    = useState({});
    const [original,    setOriginal]    = useState({});
    const [loading,     setLoading]     = useState(true);
    const [saving,      setSaving]      = useState({});

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiGet('/admin/settings');
            if (res.success) {
                // Convert array [{key, value}] to map { key: value }
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

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

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
                    onClick={fetchSettings}
                    className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all active:scale-95 group"
                >
                    <RefreshCw className="w-4 h-4 text-indigo-500 group-hover:rotate-180 transition-transform duration-500" />
                </button>
            </div>

            {/* Settings Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(SETTINGS_META).map(([key, meta]) => {
                    const c       = COLOR_MAP[meta.color];
                    const value   = settings[key];
                    const dirty   = isDirty(key);
                    const isSavingThis = saving[key];

                    return (
                        <div
                            key={key}
                            className={cn(
                                "bg-[#111114] border rounded-[2rem] p-6 transition-all duration-300 shadow-xl",
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

                            {/* Input */}
                            {meta.type === 'boolean' ? (
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
                            ) : (
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
                                    {meta.type === 'percent' && (
                                        <span className={cn(
                                            "absolute right-4 top-1/2 -translate-y-1/2 font-black text-lg",
                                            c.text
                                        )}>%</span>
                                    )}
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