// pages/Settings/Index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPut } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';
import { Settings, Percent, Loader2, RefreshCw, ToggleLeft, Wrench, HardDrive, MessageCircle, Monitor, Palette, Layout } from 'lucide-react';
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
        adminOnly: true,
    },
    max_booking_hours: {
        label: 'Max Booking Hours',
        description: 'Maximum hours a single booking session can last.',
        type: 'number',
        icon: <Settings size={16} />,
        color: 'indigo',
        min: 1,
        max: 72,
        adminOnly: true,
    },
    cancellation_window_hours: {
        label: 'Cancellation Window',
        description: 'Hours before check-in that a user can cancel for free.',
        type: 'number',
        icon: <Settings size={16} />,
        color: 'amber',
        min: 0,
        max: 72,
        adminOnly: true,
    },
    allow_walkin_guest: {
        label: 'Allow Anonymous Walk-ins',
        description: 'Let staff check in guests without a registered account.',
        type: 'boolean',
        icon: <ToggleLeft size={16} />,
        color: 'blue',
        adminOnly: true,
    },
    theme_mode: {
        label: 'Theme Mode',
        description: 'Choose your preferred theme appearance.',
        type: 'select',
        icon: <Monitor size={16} />,
        color: 'purple',
        options: [
            { value: 'light', label: 'Light Mode' },
            { value: 'dark', label: 'Dark Mode' },
            { value: 'system', label: 'System Default' },
        ],
        adminOnly: false,
    },
    theme_color: {
        label: 'Accent Color',
        description: 'Choose your preferred accent color for the dashboard.',
        type: 'select',
        icon: <Palette size={16} />,
        color: 'pink',
        options: [
            { value: 'indigo', label: 'Indigo (Default)' },
            { value: 'emerald', label: 'Emerald' },
            { value: 'purple', label: 'Purple' },
            { value: 'blue', label: 'Blue' },
            { value: 'rose', label: 'Rose' },
            { value: 'amber', label: 'Amber' },
        ],
        adminOnly: false,
    },
    // sidebar_collapsed: {
    //     label: 'Sidebar Style',
    //     description: 'Choose sidebar layout preference.',
    //     type: 'select',
    //     icon: <Layout size={16} />,
    //     color: 'cyan',
    //     options: [
    //         { value: 'false', label: '📖 Expanded Sidebar' },
    //         { value: 'true', label: '📎 Collapsed Sidebar' },
    //     ],
    //     adminOnly: false,
    // },
    system_mode: {
        label: 'System Mode',
        description: 'Current system operating mode (detected from environment).',
        type: 'readonly',
        icon: <HardDrive size={16} />,
        color: 'purple',
        adminOnly: true,
    },
    maintenance_mode: {
        label: 'Maintenance Mode',
        description: 'Temporarily take the site offline for maintenance.',
        type: 'boolean',
        icon: <Wrench size={16} />,
        color: 'amber',
        adminOnly: true,
    },
    maintenance_message: {
        label: 'Maintenance Message',
        description: 'Message shown to users when maintenance mode is active.',
        type: 'text',
        icon: <MessageCircle size={16} />,
        color: 'amber',
        maxLength: 500,
        adminOnly: true,
    },
};

const COLOR_MAP = {
    emerald: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', focus: 'focus:border-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', glow: 'shadow-emerald-900/20', toggle: 'bg-emerald-500 dark:bg-emerald-600' },
    indigo: { bg: 'bg-indigo-500/10 dark:bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', focus: 'focus:border-indigo-500', badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', glow: 'shadow-indigo-900/20', toggle: 'bg-indigo-500 dark:bg-indigo-600' },
    amber: { bg: 'bg-amber-500/10 dark:bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', focus: 'focus:border-amber-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', glow: 'shadow-amber-900/20', toggle: 'bg-amber-500 dark:bg-amber-600' },
    blue: { bg: 'bg-blue-500/10 dark:bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-600 dark:text-blue-400', focus: 'focus:border-blue-500', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', glow: 'shadow-blue-900/20', toggle: 'bg-blue-500 dark:bg-blue-600' },
    purple: { bg: 'bg-purple-500/10 dark:bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-600 dark:text-purple-400', focus: 'focus:border-purple-500', badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', glow: 'shadow-purple-900/20', toggle: 'bg-purple-500 dark:bg-purple-600' },
    pink: { bg: 'bg-pink-500/10 dark:bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-600 dark:text-pink-400', focus: 'focus:border-pink-500', badge: 'bg-pink-500/10 text-pink-600 dark:text-pink-400', glow: 'shadow-pink-900/20', toggle: 'bg-pink-500 dark:bg-pink-600' },
    cyan: { bg: 'bg-cyan-500/10 dark:bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', focus: 'focus:border-cyan-500', badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400', glow: 'shadow-cyan-900/20', toggle: 'bg-cyan-500 dark:bg-cyan-600' },
    rose: { bg: 'bg-rose-500/10 dark:bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', focus: 'focus:border-rose-500', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', glow: 'shadow-rose-900/20', toggle: 'bg-rose-500 dark:bg-rose-600' },
};

const SettingsIndex = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [settings, setSettings] = useState({});
    const [original, setOriginal] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState({});

    const filteredSettingsMeta = Object.entries(SETTINGS_META).filter(
        ([, meta]) => isAdmin || !meta.adminOnly
    );

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            if (isAdmin) {
                const res = await apiGet('/admin/settings');
                if (res.success) {
                    const map = {};
                    (res.data || []).forEach(s => { map[s.key] = s.value; });
                    setSettings(map);
                    setOriginal(map);
                }
            } else {
                // Load theme settings from localStorage for space owners
                const savedTheme = localStorage.getItem('theme_mode') || 'dark';
                const savedColor = localStorage.getItem('theme_color') || 'indigo';
                const savedSidebar = localStorage.getItem('sidebar_collapsed') || 'false';
                setSettings({
                    theme_mode: savedTheme,
                    theme_color: savedColor,
                    sidebar_collapsed: savedSidebar === 'true',
                });
                setOriginal({
                    theme_mode: savedTheme,
                    theme_color: savedColor,
                    sidebar_collapsed: savedSidebar === 'true',
                });
            }
        } catch {
            showToast({ icon: 'error', title: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleChange = async (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));

        // Apply theme changes immediately and save
        if (key === 'theme_mode') {
            localStorage.setItem('theme_mode', value);
            applyTheme(value, settings.theme_color || 'indigo');
            window.dispatchEvent(new Event('theme-changed'));
            
            // Save for admin
            if (isAdmin) {
                await saveSetting(key, value);
            } else {
                showToast({ icon: 'success', title: 'Theme mode updated instantly' });
            }
        } else if (key === 'theme_color') {
            localStorage.setItem('theme_color', value);
            applyTheme(settings.theme_mode || 'dark', value);
            window.dispatchEvent(new Event('theme-changed'));
            
            // Save for admin
            if (isAdmin) {
                await saveSetting(key, value);
            } else {
                showToast({ icon: 'success', title: 'Theme color updated instantly' });
            }
        } else if (key === 'sidebar_collapsed') {
            localStorage.setItem('sidebar_collapsed', value);
            window.dispatchEvent(new Event('sidebar-toggle'));
            
            if (!isAdmin) {
                showToast({ icon: 'success', title: 'Sidebar preference saved' });
            }
        } else {
            // For other settings, just update state without auto-saving
            // User still needs to click save for admin settings
        }
    };

    const saveSetting = async (key, value) => {
        setSaving(prev => ({ ...prev, [key]: true }));
        try {
            const res = await apiPut('/admin/settings', { key, value });
            if (res.success) {
                setOriginal(prev => ({ ...prev, [key]: value }));
                showToast({ icon: 'success', title: `${SETTINGS_META[key]?.label || key} updated` });
                return true;
            }
        } catch {
            showToast({ icon: 'error', title: 'Failed to save setting' });
            return false;
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    const applyTheme = (mode, color) => {
        const root = document.documentElement;

        if (mode === 'dark') {
            root.classList.add('dark');
        } else if (mode === 'light') {
            root.classList.remove('dark');
        } else if (mode === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (isDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }

        // Use the same CSS variables as your dashboard
        root.style.setProperty('--theme-primary', `var(--${color}-500)`);
        root.style.setProperty('--theme-primary-dark', `var(--${color}-600)`);
        root.style.setProperty('--theme-primary-light', `var(--${color}-400)`);
    };

    const handleSave = async (key) => {
        await saveSetting(key, settings[key]);
    };

    const isDirty = (key) => settings[key] !== original[key];

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">
                Loading Settings...
            </p>
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <div className="flex items-end justify-between mb-10">
                <div>
                    <h1 className="text-2xl font-black text-foreground uppercase italic tracking-tighter">
                        {isAdmin ? 'System Settings' : 'Space Settings'}
                    </h1>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">
                        {isAdmin
                            ? 'Global configuration — changes apply immediately.'
                            : 'Customize your workspace appearance and preferences.'}
                    </p>
                </div>
                <button
                    onClick={() => fetchSettings()}
                    className="p-3 bg-accent rounded-2xl border border-border hover:bg-accent/80 transition-all active:scale-95 group"
                >
                    <RefreshCw className="w-4 h-4 text-primary group-hover:rotate-180 transition-transform duration-500" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSettingsMeta.map(([key, meta]) => {
                    const c = COLOR_MAP[meta.color];
                    const value = settings[key];
                    const dirty = isDirty(key);
                    const isSavingThis = saving[key];
                    
                    // Check if this is a theme setting that auto-saves
                    const isThemeSetting = ['theme_mode', 'theme_color', 'sidebar_collapsed'].includes(key);
                    const showSaveButton = isAdmin && !isThemeSetting;

                    return (
                        <div
                            key={key}
                            className={cn(
                                "bg-card border rounded-4xl p-6 transition-all duration-300 shadow-xl",
                                dirty ? `${c.border} shadow-lg ${c.glow}` : "border-border"
                            )}
                        >
                            <div className="flex items-start justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", c.bg, c.border, c.text)}>
                                        {meta.icon}
                                    </div>
                                    <div>
                                        <p className="text-foreground font-black text-sm uppercase italic tracking-tight">
                                            {meta.label}
                                        </p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                            {key}
                                        </p>
                                    </div>
                                </div>
                                {dirty && showSaveButton && (
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg animate-pulse", c.badge)}>
                                        Unsaved
                                    </span>
                                )}
                            </div>

                            <p className="text-[11px] text-muted-foreground font-medium mb-5 leading-relaxed">
                                {meta.description}
                            </p>

                            {meta.type === 'readonly' ? (
                                <div className="mb-5">
                                    <div className="w-full bg-muted border border-border rounded-2xl px-4 py-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-foreground font-black text-sm uppercase">
                                                {import.meta.env.VITE_ENV === 'development' ? 'Development (Testing Mode)' : 'Production (Normal Operation)'}
                                            </span>
                                            <div className={cn(
                                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                                                import.meta.env.VITE_ENV === 'development' ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                            )}>
                                                {import.meta.env.VITE_ENV === 'development' ? 'DEV' : 'PROD'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : meta.type === 'select' ? (
                                <div className="mb-5">
                                    <select
                                        value={value ?? (key === 'theme_mode' ? 'dark' : key === 'theme_color' ? 'indigo' : 'false')}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                        className={cn(
                                            "w-full bg-background border rounded-2xl px-4 py-3 text-foreground font-black text-sm outline-none transition-all cursor-pointer",
                                            dirty ? `${c.border} ${c.focus}` : "border-border focus:border-primary/30"
                                        )}
                                    >
                                        {meta.options.map(opt => (
                                            <option key={opt.value} value={opt.value} className="bg-background">
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : meta.type === 'boolean' ? (
                                <div className="flex items-center justify-between mb-5">
                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                                        {value ? 'Enabled' : 'Disabled'}
                                    </span>
                                    <button
                                        onClick={() => handleChange(key, !value)}
                                        className={cn(
                                            "relative w-14 h-7 rounded-full transition-all duration-300 border",
                                            value ? `${c.toggle} border-transparent` : "bg-muted border-border"
                                        )}
                                    >
                                        <span className={cn(
                                            "absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300",
                                            value ? "left-8" : "left-1"
                                        )} />
                                    </button>
                                </div>
                            ) : meta.type === 'text' ? (
                                <div className="relative mb-5">
                                    <input
                                        type="text"
                                        maxLength={meta.maxLength}
                                        value={value || ''}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                        className={cn(
                                            "w-full bg-background border rounded-2xl px-4 py-3 text-foreground font-black text-sm outline-none transition-all",
                                            dirty ? `${c.border} ${c.focus}` : "border-border focus:border-primary/30"
                                        )}
                                        placeholder="Enter maintenance message..."
                                    />
                                    {meta.maxLength && (
                                        <p className="text-[7px] text-muted-foreground text-right mt-1">{value?.length || 0}/{meta.maxLength}</p>
                                    )}
                                </div>
                            ) : meta.type === 'percent' ? (
                                <div className="relative mb-5">
                                    <input
                                        type="number"
                                        min={meta.min}
                                        max={meta.max}
                                        step="0.01"
                                        value={value ?? ''}
                                        onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                                        className={cn(
                                            "w-full bg-background border rounded-2xl px-4 py-3 text-foreground font-black text-lg outline-none transition-all",
                                            dirty ? `${c.border} ${c.focus}` : "border-border focus:border-primary/30"
                                        )}
                                    />
                                    <span className={cn("absolute right-4 top-1/2 -translate-y-1/2 font-black text-lg", c.text)}>%</span>
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
                                            "w-full bg-background border rounded-2xl px-4 py-3 text-foreground font-black text-lg outline-none transition-all",
                                            dirty ? `${c.border} ${c.focus}` : "border-border focus:border-primary/30"
                                        )}
                                    />
                                    {meta.type === 'number' && (
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-xs text-muted-foreground uppercase tracking-widest">
                                            hrs
                                        </span>
                                    )}
                                </div>
                            )}

                            {showSaveButton && (
                                <button
                                    onClick={() => handleSave(key)}
                                    disabled={!dirty || isSavingThis}
                                    className={cn(
                                        "w-full py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg",
                                        dirty
                                            ? `${c.toggle} text-white hover:opacity-90 shadow-lg ${c.glow}`
                                            : "bg-muted text-muted-foreground cursor-not-allowed",
                                        isSavingThis && "opacity-50"
                                    )}
                                >
                                    {isSavingThis
                                        ? <><Loader2 size={13} className="animate-spin" /> Saving...</>
                                        : <><Settings size={13} /> Save Change</>
                                    }
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SettingsIndex;