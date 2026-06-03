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
import { StatCard } from '@/components/StatCard';
import { EditableList } from '@/components/EditableList';
import { useTheme } from '@/hooks/useTheme';

let globalPollingInstance = null;

const InsightsIndex = () => {
    const { themeColor } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d');
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState(null);
    
    const paramsRef = useRef({ period });
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

    const PeriodButton = ({ periodId, label }) => {
        const color = getThemeColorClass();
        return (
            <button
                onClick={() => { setPeriod(periodId); setEditing(false); }}
                className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    period === periodId
                        ? `bg-${color}-600 text-white shadow-lg shadow-${color}-900/40`
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                {label}
            </button>
        );
    };

    const color = getThemeColorClass();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="text-primary animate-spin" size={40} />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-12">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-foreground tracking-tighter uppercase italic">Analytics Insights</h1>
                    <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-[0.3em]">Visitor Analytics & User Behavior</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-card border border-border p-1 rounded-2xl">
                        <PeriodButton periodId="24h" label="24h" />
                        <PeriodButton periodId="7d" label="7d" />
                        <PeriodButton periodId="30d" label="30d" />
                    </div>
                    {editing ? (
                        <>
                            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 gap-2 text-white">
                                <Save size={14} /> Save
                            </Button>
                            <Button onClick={() => { setEditing(false); setEditData(JSON.parse(JSON.stringify(data))); }} variant="outline" className="gap-2">
                                <X size={14} /> Cancel
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => setEditing(true)} className={`bg-${color}-600 hover:bg-${color}-500 gap-2 text-white`}>
                            <Edit2 size={14} /> Edit Numbers
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard 
                    title="Visitors" 
                    value={data?.visitors || 0} 
                    icon={Users} 
                    trend={12} 
                    color="text-primary" 
                    field="visitors"
                    editing={editing}
                    editValue={editData?.visitors}
                    onEditChange={updateMainStat}
                />
                <StatCard 
                    title="Page Views" 
                    value={data?.pageViews || 0} 
                    icon={Eye} 
                    trend={8} 
                    color="text-emerald-600 dark:text-emerald-400" 
                    field="pageViews"
                    editing={editing}
                    editValue={editData?.pageViews}
                    onEditChange={updateMainStat}
                />
                <StatCard 
                    title="Bounce Rate" 
                    value={`${data?.bounceRate || 0}%`} 
                    icon={MousePointer} 
                    trend={-5} 
                    color="text-amber-600 dark:text-amber-400" 
                    field="bounceRate"
                    editing={editing}
                    editValue={editData?.bounceRate}
                    onEditChange={updateMainStat}
                />
                <StatCard 
                    title="Avg Session" 
                    value={`${Math.floor((data?.avgSessionDuration || 0) / 60)}m`} 
                    icon={Activity} 
                    trend={3} 
                    color="text-purple-600 dark:text-purple-400" 
                    field="avgSessionDuration"
                    editing={editing}
                    editValue={editData?.avgSessionDuration}
                    onEditChange={updateMainStat}
                />
            </div>

            {/* Daily Stats Chart */}
            <Card className="bg-card border-border mb-8 shadow-lg">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-primary" />
                            <h3 className="text-sm font-black text-foreground uppercase tracking-tighter">Daily Traffic</h3>
                        </div>
                        <div className="text-[8px] text-muted-foreground">Last {period === '7d' ? '7 days' : period === '30d' ? '30 days' : '24 hours'}</div>
                    </div>
                    <div className="flex items-end gap-2 h-48">
                        {data?.dailyStats?.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <div className="relative w-full group">
                                    <div className={`bg-primary/50 hover:bg-primary transition-all rounded-t`} style={{ height: `${(day.visitors / 40) * 100}px` }} />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-card text-foreground text-[8px] px-2 py-1 rounded whitespace-nowrap border border-border">
                                        {day.visitors} visitors
                                    </div>
                                </div>
                                <span className="text-[8px] text-muted-foreground rotate-45 origin-left">
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
                    editing={editing}
                    onUpdate={updateArrayItem}
                    onAdd={addArrayItem}
                    onRemove={removeArrayItem}
                    renderItem={(page, i) => (
                        editing ? (
                            <>
                                <input type="text" value={page.path} onChange={(e) => updateArrayItem("topPages", i, "path", e.target.value)} className="flex-1 px-2 py-1 bg-background border border-border rounded text-foreground text-xs" />
                                <input type="number" value={page.views} onChange={(e) => updateArrayItem("topPages", i, "views", parseInt(e.target.value))} className="w-16 px-2 py-1 bg-background border border-border rounded text-foreground text-xs" />
                                <input type="number" value={page.visitors} onChange={(e) => updateArrayItem("topPages", i, "visitors", parseInt(e.target.value))} className="w-16 px-2 py-1 bg-background border border-border rounded text-foreground text-xs" />
                            </>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <div><p className="text-foreground text-sm font-bold">{page.path}</p><p className="text-[8px] text-muted-foreground">{page.visitors} visitors</p></div>
                                <p className="text-emerald-600 dark:text-emerald-400 font-bold">{page.views} views</p>
                            </div>
                        )
                    )}
                />

                <EditableList
                    title="Traffic Sources"
                    items={editData?.trafficSources}
                    arrayName="trafficSources"
                    defaultItem={{ source: "New", percentage: 0, visitors: 0 }}
                    editing={editing}
                    onUpdate={updateArrayItem}
                    onAdd={addArrayItem}
                    onRemove={removeArrayItem}
                    renderItem={(source, i) => (
                        editing ? (
                            <>
                                <input type="text" value={source.source} onChange={(e) => updateArrayItem("trafficSources", i, "source", e.target.value)} className="flex-1 px-2 py-1 bg-background border border-border rounded text-foreground text-xs" />
                                <input type="number" value={source.percentage} onChange={(e) => updateArrayItem("trafficSources", i, "percentage", parseInt(e.target.value))} className="w-20 px-2 py-1 bg-background border border-border rounded text-foreground text-xs" />
                            </>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-2"><Globe size={12} className="text-muted-foreground" /><span className="text-muted-foreground text-sm">{source.source}</span></div>
                                <div className="flex items-center gap-4"><div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${source.percentage}%` }} /></div><span className="text-foreground text-xs font-bold">{source.percentage}%</span></div>
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
                    editing={editing}
                    onUpdate={updateArrayItem}
                    onAdd={addArrayItem}
                    onRemove={removeArrayItem}
                    renderItem={(device, i) => (
                        editing ? (
                            <>
                                <input type="text" value={device.type} onChange={(e) => updateArrayItem("devices", i, "type", e.target.value)} className="flex-1 px-2 py-1 bg-background border border-border rounded text-foreground text-xs" />
                                <input type="number" value={device.percentage} onChange={(e) => updateArrayItem("devices", i, "percentage", parseInt(e.target.value))} className="w-16 px-2 py-1 bg-background border border-border rounded text-foreground text-xs" />
                            </>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-2">
                                    {device.type === 'Desktop' && <Monitor size={12} className="text-muted-foreground" />}
                                    {device.type === 'Mobile' && <Smartphone size={12} className="text-muted-foreground" />}
                                    {device.type === 'Tablet' && <Tablet size={12} className="text-muted-foreground" />}
                                    <span className="text-muted-foreground text-xs">{device.type}</span>
                                </div>
                                <span className="text-foreground text-xs font-bold">{device.percentage}%</span>
                            </div>
                        )
                    )}
                />

                <EditableList
                    title="Browsers"
                    items={editData?.browsers}
                    arrayName="browsers"
                    defaultItem={{ name: "New", visitors: 0, percentage: 0 }}
                    editing={editing}
                    onUpdate={updateArrayItem}
                    onAdd={addArrayItem}
                    onRemove={removeArrayItem}
                    renderItem={(browser, i) => (
                        editing ? (
                            <>
                                <input type="text" value={browser.name} onChange={(e) => updateArrayItem("browsers", i, "name", e.target.value)} className="flex-1 px-2 py-1 bg-background border border-border rounded text-foreground text-xs" />
                                <input type="number" value={browser.percentage} onChange={(e) => updateArrayItem("browsers", i, "percentage", parseInt(e.target.value))} className="w-16 px-2 py-1 bg-background border border-border rounded text-foreground text-xs" />
                            </>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-2"><Globe size={12} className="text-muted-foreground" /><span className="text-muted-foreground text-xs">{browser.name}</span></div>
                                <span className="text-foreground text-xs font-bold">{browser.percentage}%</span>
                            </div>
                        )
                    )}
                />

                <EditableList
                    title="Top Countries"
                    items={editData?.countries}
                    arrayName="countries"
                    defaultItem={{ code: "XX", name: "New", visitors: 0, percentage: 0 }}
                    editing={editing}
                    onUpdate={updateArrayItem}
                    onAdd={addArrayItem}
                    onRemove={removeArrayItem}
                    renderItem={(country, i) => (
                        editing ? (
                            <>
                                <input type="text" value={country.name} onChange={(e) => updateArrayItem("countries", i, "name", e.target.value)} className="flex-1 px-2 py-1 bg-background border border-border rounded text-foreground text-xs" />
                                <input type="number" value={country.percentage} onChange={(e) => updateArrayItem("countries", i, "percentage", parseInt(e.target.value))} className="w-16 px-2 py-1 bg-background border border-border rounded text-foreground text-xs" />
                            </>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-2"><MapPin size={12} className="text-muted-foreground" /><span className="text-muted-foreground text-xs">{country.name}</span></div>
                                <span className="text-foreground text-xs font-bold">{country.percentage}%</span>
                            </div>
                        )
                    )}
                />

                <EditableList
                    title="Operating Systems"
                    items={editData?.os}
                    arrayName="os"
                    defaultItem={{ name: "New", visitors: 0, percentage: 0 }}
                    editing={editing}
                    onUpdate={updateArrayItem}
                    onAdd={addArrayItem}
                    onRemove={removeArrayItem}
                    renderItem={(os, i) => (
                        editing ? (
                            <>
                                <input type="text" value={os.name} onChange={(e) => updateArrayItem("os", i, "name", e.target.value)} className="flex-1 px-2 py-1 bg-background border border-border rounded text-foreground text-xs" />
                                <input type="number" value={os.percentage} onChange={(e) => updateArrayItem("os", i, "percentage", parseInt(e.target.value))} className="w-16 px-2 py-1 bg-background border border-border rounded text-foreground text-xs" />
                            </>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <span className="text-muted-foreground text-xs">{os.name}</span>
                                <span className="text-foreground text-xs font-bold">{os.percentage}%</span>
                            </div>
                        )
                    )}
                />
            </div>
        </div>
    );
};

export default InsightsIndex;