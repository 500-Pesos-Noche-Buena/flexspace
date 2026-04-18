import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { DataTable } from '@/components/ui/DataTable';
import {
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Banknote,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Calendar
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { showToast } from '@/components/ui/SweetAlert2';

const AdminEarnings = () => {

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');
    const [expanded, setExpanded] = useState({});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [availableMonths, setAvailableMonths] = useState([]);
    
    const fetchEarnings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiGet(`/admin/earnings?month=${selectedDate}`);
            if (res.success) {
                setData(res.data);
                // Extract available months from the response
                if (res.availableMonths && res.availableMonths.length > 0) {
                    setAvailableMonths(res.availableMonths);
                    // Set first month as default if no selected date
                    if (!selectedDate && res.availableMonths.length > 0) {
                        setSelectedDate(res.availableMonths[0].value);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            showToast({ icon: 'error', title: 'Failed to load earnings' });
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchEarnings();
    }, []); // Only fetch once to get available months

    // Fetch data when selected date changes
    useEffect(() => {
        if (selectedDate) {
            const fetchDataForDate = async () => {
                setLoading(true);
                try {
                    const res = await apiGet(`/admin/earnings?month=${selectedDate}`);
                    if (res.success) setData(res.data);
                } catch (err) {
                    console.error(err);
                    showToast({ icon: 'error', title: 'Failed to load earnings' });
                } finally {
                    setLoading(false);
                }
            };
            fetchDataForDate();
        }
    }, [selectedDate]);

    const handleCollect = async (owner) => {
        try {
            await apiPost('/admin/earnings/collect', {
                owner_id: owner._id,
                month: selectedDate,
                amount: owner.pendingFee
            });
            showToast({ icon: 'success', title: `Collected ₱${owner.pendingFee.toFixed(2)} from ${owner.ownerName}` });
            // Refresh current data
            const res = await apiGet(`/admin/earnings?month=${selectedDate}`);
            if (res.success) setData(res.data);
        } catch (err) {
            console.error(err);
            showToast({ icon: 'error', title: 'Collection failed' });
        }
    };

    const toggleExpand = (id) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const totalFees = data?.ownerSummaries?.reduce(
        (a, b) => a + (b.totalFee || 0), 0
    ) || 0;

    const totalPending = data?.ownerSummaries?.reduce(
        (a, b) => a + (b.pendingFee || 0), 0
    ) || 0;

    const totalCollected = data?.ownerSummaries?.reduce(
        (a, b) => a + (b.collectedFee || 0), 0
    ) || 0;

    const selectedMonthLabel = availableMonths.find(m => m.value === selectedDate)?.label || 'Select Month';

    const columns = [
        {
            header: "Owner",
            cell: (o) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <span className="text-indigo-400 font-black text-sm">{o.ownerName?.charAt(0)}</span>
                    </div>
                    <div>
                        <p className="text-white font-black text-sm uppercase italic tracking-tight">{o.ownerName}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{o.totalBookings} bookings</p>
                    </div>
                </div>
            )
        },
        {
            header: "Total Fee",
            cell: (o) => (
                <div>
                    <p className="text-white font-black text-sm">₱{o.totalFee?.toFixed(2)}</p>
                </div>
            )
        },
        {
            header: "Pending",
            cell: (o) => (
                <div className="flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-yellow-500 animate-pulse" />
                    <p className="text-yellow-400 font-black text-sm">₱{o.pendingFee?.toFixed(2)}</p>
                </div>
            )
        },
        {
            header: "Collected",
            cell: (o) => (
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <p className="text-emerald-400 font-black text-sm">₱{o.collectedFee?.toFixed(2)}</p>
                </div>
            )
        },
        {
            header: "Action",
            cell: (o) => (
                <div className="flex items-center gap-2">
                    {o.pendingFee > 0 ? (
                        <button
                            onClick={() => handleCollect(o)}
                            className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider rounded-xl hover:bg-emerald-500 hover:text-black hover:border-emerald-500 transition-all active:scale-95"
                        >
                            Collect
                        </button>
                    ) : (
                        <span className="text-emerald-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            COLLECTED
                        </span>
                    )}
                    <button
                        onClick={() => toggleExpand(o._id)}
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-90 bg-white/5 rounded-xl border border-white/5"
                    >
                        {expanded[o._id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            )
        }
    ];

    if (loading && !data) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
                    Loading Financial Data...
                </p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            
            {/* Header */}
            <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase italic">Earnings Overview</h1>
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-widest">Financial monitoring & commission management.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Month Filter Dropdown - Only shows months with data */}
                    {availableMonths.length > 0 && (
                        <div className="relative flex-1 md:flex-none">
                            <button
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className="w-full md:w-64 bg-[#111114] border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between group hover:border-indigo-500/30 transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-indigo-500" />
                                    <span className="text-white text-xs font-black uppercase tracking-wider">
                                        {selectedMonthLabel}
                                    </span>
                                </div>
                                <ChevronDown size={14} className={cn(
                                    "text-slate-400 transition-transform duration-300",
                                    showDatePicker && "rotate-180"
                                )} />
                            </button>
                            
                            {showDatePicker && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm"
                                        onClick={() => setShowDatePicker(false)}
                                    />
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#111114] border border-white/10 rounded-2xl z-20 max-h-80 overflow-y-auto shadow-2xl">
                                        <div className="p-2">
                                            {availableMonths.map(month => (
                                                <button
                                                    key={month.value}
                                                    onClick={() => {
                                                        setSelectedDate(month.value);
                                                        setShowDatePicker(false);
                                                    }}
                                                    className={cn(
                                                        "w-full px-4 py-3 text-left text-xs font-black uppercase tracking-wider transition-all rounded-xl",
                                                        selectedDate === month.value 
                                                            ? "bg-indigo-600/20 text-indigo-400" 
                                                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                                                    )}
                                                >
                                                    {month.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    
                    <button 
                        onClick={() => {
                            const fetchCurrentData = async () => {
                                setLoading(true);
                                try {
                                    const res = await apiGet(`/admin/earnings?month=${selectedDate}`);
                                    if (res.success) setData(res.data);
                                } catch (err) {
                                    console.error(err);
                                } finally {
                                    setLoading(false);
                                }
                            };
                            fetchCurrentData();
                        }}
                        className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all active:scale-95 group shrink-0"
                    >
                        <RefreshCw className="w-4 h-4 text-indigo-500 group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                <StatCard 
                    title="Total Revenue" 
                    value={`₱${totalFees.toFixed(2)}`} 
                    icon={<Banknote size={16} className="text-emerald-500" />} 
                    trend="All Time" 
                />
                <StatCard 
                    title="Pending Collection" 
                    value={`₱${totalPending.toFixed(2)}`} 
                    icon={<AlertTriangle size={16} className="text-yellow-500" />} 
                    trend="Awaiting" 
                />
                <StatCard 
                    title="Collected" 
                    value={`₱${totalCollected.toFixed(2)}`} 
                    icon={<CheckCircle2 size={16} className="text-indigo-500" />} 
                    trend="Completed" 
                />
                <StatCard 
                    title="Commission Rate" 
                    value={`${data?.feePercent || 0}%`} 
                    icon={<Banknote size={16} className="text-purple-500" />} 
                    trend="Platform Fee" 
                />
            </div>

            {/* DataTable */}
            <div className="bg-[#111114] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="px-4 sm:px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                        Owner Financial Summary
                    </h3>
                    <div className="text-[9px] font-black text-indigo-500 flex items-center gap-1.5 uppercase tracking-tighter">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                        Live Data
                    </div>
                </div>
                
                <DataTable
                    columns={columns}
                    data={data?.ownerSummaries || []}
                    loading={loading}
                    totalCount={data?.ownerSummaries?.length || 0}
                    onParamsChange={() => {}}
                    renderMobileCard={(o) => (
                        <div className="bg-[#111114] border border-white/5 rounded-2xl p-5 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                        <span className="text-indigo-400 font-black text-sm">{o.ownerName?.charAt(0)}</span>
                                    </div>
                                    <div>
                                        <p className="text-white font-black text-sm">{o.ownerName}</p>
                                        <p className="text-[9px] text-slate-500">{o.totalBookings} bookings</p>
                                    </div>
                                </div>
                                <button onClick={() => toggleExpand(o._id)} className="p-2">
                                    {expanded[o._id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                            </div>
                            
                            {expanded[o._id] && (
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <div className="flex justify-between">
                                        <span className="text-[10px] text-slate-500">Booking Details:</span>
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex justify-between">
                                <span className="text-[10px] text-slate-500">Total:</span>
                                <span className="text-white font-black">₱{o.totalFee?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <AlertTriangle size={10} className="text-yellow-500" /> Pending:
                                </span>
                                <span className="text-yellow-400 font-black">₱{o.pendingFee?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <CheckCircle2 size={10} className="text-emerald-500" /> Collected:
                                </span>
                                <span className="text-emerald-400 font-black">₱{o.collectedFee?.toFixed(2)}</span>
                            </div>
                            {o.pendingFee > 0 && (
                                <button
                                    onClick={() => handleCollect(o)}
                                    className="w-full mt-2 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[10px] uppercase tracking-wider rounded-xl active:scale-95"
                                >
                                    Collect ₱{o.pendingFee.toFixed(2)}
                                </button>
                            )}
                        </div>
                    )}
                />
            </div>
        </div>
    );
};

// StatCard component
const StatCard = ({ title, value, icon, trend }) => (
    <div className="bg-[#111114] p-5 rounded-4xl border border-white/5 group hover:border-indigo-500/30 transition-all duration-500 shadow-xl">
        <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-white/5 rounded-xl group-hover:bg-indigo-500/10 transition-all duration-500 border border-white/5">{icon}</div>
        </div>
        <h4 className="text-xl font-black text-white mb-0.5 truncate italic tracking-tighter">{value}</h4>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">{title}</p>
        <div className="text-[8px] font-black text-indigo-500 flex items-center gap-1.5 uppercase tracking-tighter">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            {trend}
        </div>
    </div>
);

export default AdminEarnings;