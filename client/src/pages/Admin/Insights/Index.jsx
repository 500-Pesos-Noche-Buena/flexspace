import React, { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/utils/Api';
import { 
    TrendingUp, Users, Eye, MousePointer, 
    MapPin, Monitor, Smartphone, Tablet, 
    Globe, Calendar, Activity,
    ArrowUp, ArrowDown, Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const InsightsIndex = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d');

    const fetchInsights = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiGet(`/admin/insights?period=${period}`);
            if (res.success) {
                setData(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch insights', err);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchInsights();
    }, [fetchInsights]);

    const StatCard = ({ title, value, icon: Icon, trend, color }) => (
        <Card className="bg-[#111114] border-white/5 hover:border-indigo-500/30 transition-all">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <Icon size={18} className="text-slate-400" />
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 text-[9px] font-black",
                            trend > 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                            {trend > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                            {Math.abs(trend)}%
                        </div>
                    )}
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</p>
                <p className={cn("text-2xl font-[1000] italic mt-1", color)}>{value}</p>
            </CardContent>
        </Card>
    );

    const PeriodButton = ({ periodId, label }) => (
        <button
            onClick={() => setPeriod(periodId)}
            className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                period === periodId
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                    : "text-slate-500 hover:text-slate-300"
            )}
        >
            {label}
        </button>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="text-indigo-600 animate-spin" size={40} />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-12">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">Analytics Insights</h1>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-[0.3em]">Visitor Analytics & User Behavior</p>
                </div>
                <div className="flex bg-[#111114] border border-white/5 p-1 rounded-2xl">
                    <PeriodButton periodId="24h" label="24h" />
                    <PeriodButton periodId="7d" label="7d" />
                    <PeriodButton periodId="30d" label="30d" />
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title="Visitors" value={data?.visitors || 0} icon={Users} trend={12} color="text-indigo-400" />
                <StatCard title="Page Views" value={data?.pageViews || 0} icon={Eye} trend={8} color="text-emerald-400" />
                <StatCard title="Bounce Rate" value={`${data?.bounceRate || 0}%`} icon={MousePointer} trend={-5} color="text-amber-400" />
                <StatCard title="Avg Session" value={`${Math.floor(data?.avgSessionDuration / 60) || 0}m`} icon={Activity} trend={3} color="text-purple-400" />
            </div>

            {/* Daily Stats Chart */}
            <Card className="bg-[#111114] border-white/5 mb-8">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-indigo-400" />
                            <h3 className="text-sm font-black text-white uppercase tracking-tighter">Daily Traffic</h3>
                        </div>
                        <div className="text-[8px] text-slate-500">Last {period === '7d' ? '7 days' : period === '30d' ? '30 days' : '24 hours'}</div>
                    </div>
                    <div className="flex items-end gap-2 h-48">
                        {data?.dailyStats?.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <div className="relative w-full group">
                                    <div 
                                        className="bg-indigo-500/50 hover:bg-indigo-400 transition-all rounded-t"
                                        style={{ height: `${(day.visitors / 40) * 100}px` }}
                                    />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[8px] px-2 py-1 rounded whitespace-nowrap">
                                        {day.visitors} visitors
                                    </div>
                                </div>
                                <span className="text-[8px] text-slate-500 rotate-45 origin-left">
                                    {new Date(day.date).toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Top Pages */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card className="bg-[#111114] border-white/5">
                    <CardContent className="p-6">
                        <h3 className="text-sm font-black text-white uppercase tracking-tighter mb-4">Top Pages</h3>
                        <div className="space-y-3">
                            {data?.topPages?.map((page, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div>
                                        <p className="text-white text-sm font-bold">{page.path}</p>
                                        <p className="text-[8px] text-slate-500">{page.visitors} visitors</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-emerald-400 font-bold">{page.views} views</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Traffic Sources */}
                <Card className="bg-[#111114] border-white/5">
                    <CardContent className="p-6">
                        <h3 className="text-sm font-black text-white uppercase tracking-tighter mb-4">Traffic Sources</h3>
                        <div className="space-y-3">
                            {data?.trafficSources?.map((source, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Globe size={12} className="text-slate-400" />
                                        <span className="text-slate-400 text-sm">{source.source}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-indigo-500 rounded-full"
                                                style={{ width: `${source.percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-white text-xs font-bold">{source.percentage}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Devices & Browsers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Devices */}
                <Card className="bg-[#111114] border-white/5">
                    <CardContent className="p-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Devices</h3>
                        <div className="space-y-2">
                            {data?.devices?.map((device, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        {device.type === 'Desktop' && <Monitor size={12} className="text-slate-400" />}
                                        {device.type === 'Mobile' && <Smartphone size={12} className="text-slate-400" />}
                                        {device.type === 'Tablet' && <Tablet size={12} className="text-slate-400" />}
                                        <span className="text-slate-400 text-xs">{device.type}</span>
                                    </div>
                                    <span className="text-white text-xs font-bold">{device.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Browsers */}
                <Card className="bg-[#111114] border-white/5">
                    <CardContent className="p-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Browsers</h3>
                        <div className="space-y-2">
                            {data?.browsers?.map((browser, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Globe size={12} className="text-slate-400" />
                                        <span className="text-slate-400 text-xs">{browser.name}</span>
                                    </div>
                                    <span className="text-white text-xs font-bold">{browser.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Countries */}
                <Card className="bg-[#111114] border-white/5">
                    <CardContent className="p-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Top Countries</h3>
                        <div className="space-y-2">
                            {data?.countries?.slice(0, 4).map((country, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={12} className="text-slate-400" />
                                        <span className="text-slate-400 text-xs">{country.name}</span>
                                    </div>
                                    <span className="text-white text-xs font-bold">{country.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* OS */}
                <Card className="bg-[#111114] border-white/5">
                    <CardContent className="p-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Operating Systems</h3>
                        <div className="space-y-2">
                            {data?.os?.map((os, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="text-slate-400 text-xs">{os.name}</span>
                                    <span className="text-white text-xs font-bold">{os.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Note about data source */}
            <div className="text-center text-[8px] text-slate-600">
                <p>Data is simulated. Connect Vercel Analytics API for real-time data.</p>
            </div>
        </div>
    );
};

export default InsightsIndex;