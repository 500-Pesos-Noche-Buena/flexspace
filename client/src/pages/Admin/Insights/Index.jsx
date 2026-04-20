import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPut } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';
import { 
    TrendingUp, Users, Eye, MousePointer, 
    MapPin, Monitor, Smartphone, Tablet, 
    Globe, Calendar, Activity,
    ArrowUp, ArrowDown, Loader2, Edit2, Save, X, Plus, Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

let globalPollingInstance = null;

const InsightsIndex = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d');
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState(null);
    
    const paramsRef = useRef({ period });
    const lastDataFingerprint = useRef("");

    useEffect(() => {
        paramsRef.current = { period };
    }, [period]);

    const fetchInsights = useCallback(async (params = paramsRef.current, isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const { period } = params;
            const res = await apiGet(`/admin/insights?period=${period}`);
            
            const fetchedData = res.data || {};
            const currentFingerprint = JSON.stringify(fetchedData);

            if (currentFingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = currentFingerprint;
                setData(fetchedData);
                if (!editing) {
                    setEditData(JSON.parse(JSON.stringify(fetchedData)));
                }
            }
        } catch (err) {
            if (isInitial) {
                console.error('Failed to fetch insights', err);
                showToast({ icon: 'error', title: 'Failed to sync analytics' });
            }
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [editing]);

    // Real-time polling
    useEffect(() => {
        if (globalPollingInstance) clearInterval(globalPollingInstance);
        
        fetchInsights(paramsRef.current, true);
        
        globalPollingInstance = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchInsights(paramsRef.current, false);
            }
        }, 3000);
        
        return () => {
            clearInterval(globalPollingInstance);
            globalPollingInstance = null;
        };
    }, [fetchInsights]);

    const handleSave = async () => {
        try {
            const saveData = {
                visitors: editData?.visitors || 0,
                pageViews: editData?.pageViews || 0,
                bounceRate: editData?.bounceRate || 0,
                avgSessionDuration: editData?.avgSessionDuration || 0,
                topPages: Array.isArray(editData?.topPages) ? editData.topPages : [],
                trafficSources: Array.isArray(editData?.trafficSources) ? editData.trafficSources : [],
                countries: Array.isArray(editData?.countries) ? editData.countries : [],
                devices: Array.isArray(editData?.devices) ? editData.devices : [],
                browsers: Array.isArray(editData?.browsers) ? editData.browsers : [],
                os: Array.isArray(editData?.os) ? editData.os : [],
                dailyStats: Array.isArray(editData?.dailyStats) ? editData.dailyStats : []
            };
            
            const res = await apiPut('/admin/analytics', { period, ...saveData });
            if (res.success) {
                setData(saveData);
                setEditing(false);
                showToast({ icon: 'success', title: 'Analytics updated!' });
            }
        } catch (err) {
            console.error('Save error:', err);
            showToast({ icon: 'error', title: 'Update failed' });
        }
    };

    const updateMainStat = (field, value) => {
        setEditData({ ...editData, [field]: parseInt(value) || 0 });
    };

    const updateArrayItem = (arrayName, index, field, value) => {
        const newArray = [...(editData[arrayName] || [])];
        newArray[index] = { ...newArray[index], [field]: value };
        setEditData({ ...editData, [arrayName]: newArray });
    };

    const addArrayItem = (arrayName, defaultItem) => {
        const newArray = [...(editData[arrayName] || []), { ...defaultItem }];
        setEditData({ ...editData, [arrayName]: newArray });
    };

    const removeArrayItem = (arrayName, index) => {
        const newArray = editData[arrayName].filter((_, i) => i !== index);
        setEditData({ ...editData, [arrayName]: newArray });
    };

    const StatCard = ({ title, value, icon: Icon, trend, color, field }) => (
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
                {editing && field ? (
                    <input
                        type="number"
                        value={editData?.[field] || 0}
                        onChange={(e) => updateMainStat(field, e.target.value)}
                        className="mt-2 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xl font-[1000] italic focus:border-indigo-500 outline-none"
                    />
                ) : (
                    <p className={cn("text-2xl font-[1000] italic mt-1", color)}>{value}</p>
                )}
            </CardContent>
        </Card>
    );

    const PeriodButton = ({ periodId, label }) => (
        <button
            onClick={() => { setPeriod(periodId); setEditing(false); }}
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

    const EditableList = ({ title, items, arrayName, renderItem, defaultItem }) => (
        <Card className="bg-[#111114] border-white/5">
            <CardContent className="p-6">
                <h3 className="text-sm font-black text-white uppercase tracking-tighter mb-4">{title}</h3>
                <div className="space-y-2">
                    {items?.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                            {renderItem(item, i)}
                            {editing && (
                                <button
                                    onClick={() => removeArrayItem(arrayName, i)}
                                    className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                    {editing && (
                        <button
                            onClick={() => addArrayItem(arrayName, defaultItem)}
                            className="w-full py-2 mt-2 bg-white/5 text-slate-400 rounded-lg text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-1"
                        >
                            <Plus size={12} /> Add
                        </button>
                    )}
                </div>
            </CardContent>
        </Card>
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
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">Analytics Insights</h1>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-[0.3em]">Visitor Analytics & User Behavior</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-[#111114] border border-white/5 p-1 rounded-2xl">
                        <PeriodButton periodId="24h" label="24h" />
                        <PeriodButton periodId="7d" label="7d" />
                        <PeriodButton periodId="30d" label="30d" />
                    </div>
                    {editing ? (
                        <>
                            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 gap-2">
                                <Save size={14} /> Save
                            </Button>
                            <Button onClick={() => { setEditing(false); setEditData(JSON.parse(JSON.stringify(data))); }} variant="outline" className="gap-2">
                                <X size={14} /> Cancel
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => setEditing(true)} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                            <Edit2 size={14} /> Edit Numbers
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title="Visitors" value={data?.visitors || 0} icon={Users} trend={12} color="text-indigo-400" field="visitors" />
                <StatCard title="Page Views" value={data?.pageViews || 0} icon={Eye} trend={8} color="text-emerald-400" field="pageViews" />
                <StatCard title="Bounce Rate" value={`${data?.bounceRate || 0}%`} icon={MousePointer} trend={-5} color="text-amber-400" field="bounceRate" />
                <StatCard title="Avg Session" value={`${Math.floor((data?.avgSessionDuration || 0) / 60)}m`} icon={Activity} trend={3} color="text-purple-400" field="avgSessionDuration" />
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
                                    <div className="bg-indigo-500/50 hover:bg-indigo-400 transition-all rounded-t" style={{ height: `${(day.visitors / 40) * 100}px` }} />
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
                <EditableList
                    title="Top Pages"
                    items={editData?.topPages}
                    arrayName="topPages"
                    defaultItem={{ path: "/new", views: 0, visitors: 0 }}
                    renderItem={(page, i) => (
                        editing ? (
                            <>
                                <input type="text" value={page.path} onChange={(e) => updateArrayItem("topPages", i, "path", e.target.value)} className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                                <input type="number" value={page.views} onChange={(e) => updateArrayItem("topPages", i, "views", parseInt(e.target.value))} className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                                <input type="number" value={page.visitors} onChange={(e) => updateArrayItem("topPages", i, "visitors", parseInt(e.target.value))} className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                            </>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <div><p className="text-white text-sm font-bold">{page.path}</p><p className="text-[8px] text-slate-500">{page.visitors} visitors</p></div>
                                <p className="text-emerald-400 font-bold">{page.views} views</p>
                            </div>
                        )
                    )}
                />

                <EditableList
                    title="Traffic Sources"
                    items={editData?.trafficSources}
                    arrayName="trafficSources"
                    defaultItem={{ source: "New", percentage: 0, visitors: 0 }}
                    renderItem={(source, i) => (
                        editing ? (
                            <>
                                <input type="text" value={source.source} onChange={(e) => updateArrayItem("trafficSources", i, "source", e.target.value)} className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                                <input type="number" value={source.percentage} onChange={(e) => updateArrayItem("trafficSources", i, "percentage", parseInt(e.target.value))} className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                            </>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-2"><Globe size={12} className="text-slate-400" /><span className="text-slate-400 text-sm">{source.source}</span></div>
                                <div className="flex items-center gap-4"><div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${source.percentage}%` }} /></div><span className="text-white text-xs font-bold">{source.percentage}%</span></div>
                            </div>
                        )
                    )}
                />
            </div>

            {/* Devices & Browsers & Countries & OS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <EditableList
                    title="Devices"
                    items={editData?.devices}
                    arrayName="devices"
                    defaultItem={{ type: "New", visitors: 0, percentage: 0 }}
                    renderItem={(device, i) => (
                        editing ? (
                            <>
                                <input type="text" value={device.type} onChange={(e) => updateArrayItem("devices", i, "type", e.target.value)} className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                                <input type="number" value={device.percentage} onChange={(e) => updateArrayItem("devices", i, "percentage", parseInt(e.target.value))} className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                            </>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-2">
                                    {device.type === 'Desktop' && <Monitor size={12} className="text-slate-400" />}
                                    {device.type === 'Mobile' && <Smartphone size={12} className="text-slate-400" />}
                                    {device.type === 'Tablet' && <Tablet size={12} className="text-slate-400" />}
                                    <span className="text-slate-400 text-xs">{device.type}</span>
                                </div>
                                <span className="text-white text-xs font-bold">{device.percentage}%</span>
                            </div>
                        )
                    )}
                />

                <EditableList
                    title="Browsers"
                    items={editData?.browsers}
                    arrayName="browsers"
                    defaultItem={{ name: "New", visitors: 0, percentage: 0 }}
                    renderItem={(browser, i) => (
                        editing ? (
                            <>
                                <input type="text" value={browser.name} onChange={(e) => updateArrayItem("browsers", i, "name", e.target.value)} className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                                <input type="number" value={browser.percentage} onChange={(e) => updateArrayItem("browsers", i, "percentage", parseInt(e.target.value))} className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                            </>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-2"><Globe size={12} className="text-slate-400" /><span className="text-slate-400 text-xs">{browser.name}</span></div>
                                <span className="text-white text-xs font-bold">{browser.percentage}%</span>
                            </div>
                        )
                    )}
                />

                <EditableList
                    title="Top Countries"
                    items={editData?.countries}
                    arrayName="countries"
                    defaultItem={{ code: "XX", name: "New", visitors: 0, percentage: 0 }}
                    renderItem={(country, i) => (
                        editing ? (
                            <>
                                <input type="text" value={country.name} onChange={(e) => updateArrayItem("countries", i, "name", e.target.value)} className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                                <input type="number" value={country.percentage} onChange={(e) => updateArrayItem("countries", i, "percentage", parseInt(e.target.value))} className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                            </>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-2"><MapPin size={12} className="text-slate-400" /><span className="text-slate-400 text-xs">{country.name}</span></div>
                                <span className="text-white text-xs font-bold">{country.percentage}%</span>
                            </div>
                        )
                    )}
                />

                <EditableList
                    title="Operating Systems"
                    items={editData?.os}
                    arrayName="os"
                    defaultItem={{ name: "New", visitors: 0, percentage: 0 }}
                    renderItem={(os, i) => (
                        editing ? (
                            <>
                                <input type="text" value={os.name} onChange={(e) => updateArrayItem("os", i, "name", e.target.value)} className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                                <input type="number" value={os.percentage} onChange={(e) => updateArrayItem("os", i, "percentage", parseInt(e.target.value))} className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs" />
                            </>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <span className="text-slate-400 text-xs">{os.name}</span>
                                <span className="text-white text-xs font-bold">{os.percentage}%</span>
                            </div>
                        )
                    )}
                />
            </div>
        </div>
    );
};

export default InsightsIndex;