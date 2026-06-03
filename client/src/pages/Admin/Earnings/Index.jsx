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
    Calendar,
    Eye,
    X
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { showToast } from '@/components/ui/SweetAlert2';
import { useTheme } from '@/hooks/useTheme';
import { Modal } from '@/components/ui/Modal';

const AdminEarnings = () => {
    const { themeColor } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');
    const [expanded, setExpanded] = useState({});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [availableMonths, setAvailableMonths] = useState([]);
    const [showCollectModal, setShowCollectModal] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState(null);
    const [collecting, setCollecting] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [ownerDetails, setOwnerDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    
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

    const fetchEarnings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiGet(`/admin/earnings?month=${selectedDate}`);
            if (res.success) {
                setData(res.data);
                if (res.availableMonths && res.availableMonths.length > 0) {
                    setAvailableMonths(res.availableMonths);
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
    }, []);

    useEffect(() => {
        if (selectedDate) {
            fetchEarnings();
        }
    }, [selectedDate]);

    const handleMarkCollected = async () => {
        if (!selectedOwner) return;
        
        setCollecting(true);
        try {
            await apiPost('/admin/earnings/mark-collected', {
                owner_id: selectedOwner._id,
                month: selectedDate,
                amount: selectedOwner.pendingFee
            });
            showToast({ 
                icon: 'success', 
                title: 'Payment Recorded', 
                text: `Marked ₱${selectedOwner.pendingFee.toFixed(2)} as collected from ${selectedOwner.ownerName}` 
            });
            setShowCollectModal(false);
            setSelectedOwner(null);
            fetchEarnings();
        } catch (err) {
            console.error(err);
            showToast({ icon: 'error', title: 'Failed to mark as collected' });
        } finally {
            setCollecting(false);
        }
    };

    const handleViewDetails = async (owner) => {
        setSelectedOwner(owner);
        setDetailsLoading(true);
        setShowDetailsModal(true);
        
        try {
            const res = await apiGet(`/admin/earnings/owner/${owner._id}/${selectedDate}`);
            if (res.success) {
                setOwnerDetails(res.data);
            }
        } catch (err) {
            console.error(err);
            showToast({ icon: 'error', title: 'Failed to load owner details' });
        } finally {
            setDetailsLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const totalFees = data?.totalAdminCut || 0;
    const totalPending = data?.totalPendingFees || 0;
    const totalCollected = data?.totalCollectedFees || 0;

    const selectedMonthLabel = availableMonths.find(m => m.value === selectedDate)?.label || 'Select Month';
    const color = getThemeColorClass();

    const columns = [
        {
            header: "Space Owner",
            cell: (o) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-black text-sm">{o.ownerName?.charAt(0)}</span>
                    </div>
                    <div>
                        <p className="text-foreground font-black text-sm uppercase italic tracking-tight">{o.ownerName}</p>
                        <p className="text-[9px] text-muted-foreground">{o.ownerEmail}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Total Bookings",
            cell: (o) => (
                <p className="text-foreground font-black text-sm">{o.totalBookings}</p>
            )
        },
        {
            header: "Total Fee (₱)",
            cell: (o) => (
                <p className="text-foreground font-black text-sm">₱{o.totalFee?.toFixed(2)}</p>
            )
        },
        {
            header: "Collected (₱)",
            cell: (o) => (
                <p className="text-emerald-600 dark:text-emerald-400 font-black text-sm">₱{o.collectedFee?.toFixed(2)}</p>
            )
        },
        {
            header: "Pending (₱)",
            cell: (o) => (
                <div className="flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400" />
                    <p className="text-amber-600 dark:text-amber-400 font-black text-sm">₱{o.pendingFee?.toFixed(2)}</p>
                </div>
            )
        },
        {
            header: "Status",
            cell: (o) => {
                if (o.pendingFee === 0) {
                    return (
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase">PAID</span>
                        </div>
                    );
                }
                return (
                    <div className="flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400 animate-pulse" />
                        <span className="text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase">PENDING</span>
                    </div>
                );
            }
        },
        {
            header: "Actions",
            cell: (o) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleViewDetails(o)}
                        className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
                        title="View Details"
                    >
                        <Eye size={14} />
                    </button>
                    {o.pendingFee > 0 && (
                        <button
                            onClick={() => {
                                setSelectedOwner(o);
                                setShowCollectModal(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                        >
                            Mark Paid
                        </button>
                    )}
                    <button
                        onClick={() => toggleExpand(o._id)}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all bg-muted rounded-lg border border-border"
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
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-foreground rounded-full animate-pulse" />
                    </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">
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
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground uppercase italic">Owner Financial Summary</h1>
                    <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-widest">
                        Track who owes platform fees each month
                    </p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {availableMonths.length > 0 && (
                        <div className="relative flex-1 md:flex-none">
                            <button
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className="w-full md:w-64 bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between group hover:border-primary/30 transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-primary" />
                                    <span className="text-foreground text-xs font-black uppercase tracking-wider">
                                        {selectedMonthLabel}
                                    </span>
                                </div>
                                <ChevronDown size={14} className={cn(
                                    "text-muted-foreground transition-transform duration-300",
                                    showDatePicker && "rotate-180"
                                )} />
                            </button>
                            
                            {showDatePicker && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm"
                                        onClick={() => setShowDatePicker(false)}
                                    />
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl z-20 max-h-80 overflow-y-auto shadow-2xl">
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
                                                            ? `bg-${color}-600/20 text-primary` 
                                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
                        onClick={fetchEarnings}
                        className="p-3 bg-muted rounded-2xl border border-border hover:bg-muted/80 transition-all active:scale-95 group shrink-0"
                    >
                        <RefreshCw className="w-4 h-4 text-primary group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                <StatCard 
                    title="Total Platform Fees" 
                    value={`₱${totalFees.toFixed(2)}`} 
                    icon={<Banknote size={16} className="text-primary" />} 
                    trend="This Month" 
                    themeColor={color}
                />
                <StatCard 
                    title="Collected" 
                    value={`₱${totalCollected.toFixed(2)}`} 
                    icon={<CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />} 
                    trend="Paid" 
                    themeColor={color}
                />
                <StatCard 
                    title="Pending Collection" 
                    value={`₱${totalPending.toFixed(2)}`} 
                    icon={<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />} 
                    trend="Awaiting Payment" 
                    themeColor={color}
                />
                <StatCard 
                    title="Commission Rate" 
                    value={`${data?.feePercent || 30}%`} 
                    icon={<Banknote size={16} className="text-purple-600 dark:text-purple-400" />} 
                    trend="Platform Fee" 
                    themeColor={color}
                />
            </div>

            {/* DataTable - Owner Summary */}
            <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-2xl">
                <div className="px-4 sm:px-6 py-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">
                        Owner Financial Summary - {selectedMonthLabel}
                    </h3>
                    <div className="text-[9px] font-black text-primary flex items-center gap-1.5 uppercase tracking-tighter">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
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
                        <div className="bg-card border-border rounded-2xl p-5 space-y-3 shadow-lg">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <span className="text-primary font-black text-sm">{o.ownerName?.charAt(0)}</span>
                                    </div>
                                    <div>
                                        <p className="text-foreground font-black text-sm">{o.ownerName}</p>
                                        <p className="text-[9px] text-muted-foreground">{o.ownerEmail}</p>
                                    </div>
                                </div>
                                <button onClick={() => toggleExpand(o._id)} className="p-2">
                                    {expanded[o._id] ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                                </button>
                            </div>
                            
                            {expanded[o._id] && o.spaces && (
                                <div className="space-y-2 pt-2 border-t border-border">
                                    <p className="text-[8px] text-muted-foreground font-black uppercase">Spaces Breakdown</p>
                                    {o.spaces.map((space, idx) => (
                                        <div key={idx} className="flex justify-between text-[9px]">
                                            <span className="text-muted-foreground">{space.name}</span>
                                            <span className="text-primary">₱{space.fee}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div className="flex justify-between">
                                <span className="text-[10px] text-muted-foreground">Total Bookings:</span>
                                <span className="text-foreground font-black">{o.totalBookings}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[10px] text-muted-foreground">Total Fee:</span>
                                <span className="text-foreground font-black">₱{o.totalFee?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[10px] text-muted-foreground">Collected:</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-black">₱{o.collectedFee?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <AlertTriangle size={10} className="text-amber-600 dark:text-amber-400" /> Pending:
                                </span>
                                <span className="text-amber-600 dark:text-amber-400 font-black">₱{o.pendingFee?.toFixed(2)}</span>
                            </div>
                            
                            {o.pendingFee > 0 && (
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => handleViewDetails(o)}
                                        className="flex-1 py-2 bg-primary/20 text-primary font-black text-[9px] uppercase rounded-xl hover:bg-primary hover:text-white transition-all"
                                    >
                                        <Eye size={12} className="inline mr-1" /> View Details
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedOwner(o);
                                            setShowCollectModal(true);
                                        }}
                                        className="flex-1 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[9px] uppercase rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                                    >
                                        Mark Paid
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                />
            </div>
            
            {/* Mark as Collected Modal */}
            <Modal open={showCollectModal} onClose={() => setShowCollectModal(false)} title="Record Payment" size="sm">
                <div className="space-y-4 py-4 text-center">
                    <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-black text-foreground">Confirm Payment Received</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Are you sure you want to mark this as paid?
                        </p>
                    </div>
                    
                    <div className="bg-muted rounded-xl p-3">
                        <p className="text-[10px] text-muted-foreground font-black uppercase mb-1">Owner</p>
                        <p className="text-foreground font-bold">{selectedOwner?.ownerName}</p>
                        <p className="text-[8px] text-muted-foreground">{selectedOwner?.ownerEmail}</p>
                    </div>
                    
                    <div className="bg-muted rounded-xl p-3">
                        <p className="text-[10px] text-muted-foreground font-black uppercase mb-1">Amount to Record</p>
                        <p className="text-2xl font-black text-primary">₱{selectedOwner?.pendingFee?.toFixed(2)}</p>
                        <p className="text-[8px] text-muted-foreground mt-1">Month: {selectedMonthLabel}</p>
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setShowCollectModal(false)}
                            className="flex-1 py-3 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleMarkCollected}
                            disabled={collecting}
                            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {collecting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Confirm Payment
                        </button>
                    </div>
                </div>
            </Modal>
            
            {/* Owner Details Modal */}
            <Modal open={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Owner Details" size="lg">
                {detailsLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 size={32} className="animate-spin text-primary" />
                    </div>
                ) : ownerDetails ? (
                    <div className="space-y-4">
                        {/* Owner Info */}
                        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                                    <span className="text-primary font-black text-lg">
                                        {ownerDetails.owner?.name?.charAt(0)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-black text-foreground">{ownerDetails.owner?.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{ownerDetails.owner?.email}</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-muted rounded-xl p-3 text-center">
                                <p className="text-[8px] text-muted-foreground uppercase">Total Fee</p>
                                <p className="text-sm font-black text-foreground">₱{ownerDetails.summary?.totalFee}</p>
                            </div>
                            <div className="bg-muted rounded-xl p-3 text-center">
                                <p className="text-[8px] text-muted-foreground uppercase">Collected</p>
                                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">₱{ownerDetails.summary?.collectedFee}</p>
                            </div>
                            <div className="bg-muted rounded-xl p-3 text-center">
                                <p className="text-[8px] text-muted-foreground uppercase">Pending</p>
                                <p className="text-sm font-black text-amber-600 dark:text-amber-400">₱{ownerDetails.summary?.pendingFee}</p>
                            </div>
                        </div>
                        
                        {/* Transactions List */}
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Transactions</p>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {ownerDetails.transactions?.map((tx, idx) => (
                                    <div key={idx} className="bg-muted rounded-xl p-3 border border-border">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] font-black text-foreground">{tx.order_number}</p>
                                                <p className="text-[8px] text-muted-foreground">{tx.space_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-primary">₱{tx.platform_fee}</p>
                                                <span className={cn(
                                                    "text-[7px] px-1.5 py-0.5 rounded-full",
                                                    tx.fee_status === 'collected' 
                                                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                                        : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                )}>
                                                    {tx.fee_status}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-[7px] text-muted-foreground mt-1">
                                            {new Date(tx.booking_date).toLocaleDateString()} • {tx.payment_method}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
};

// StatCard component
const StatCard = ({ title, value, icon, trend, themeColor }) => (
    <div className="bg-card p-5 rounded-4xl border border-border group hover:border-primary/30 transition-all duration-500 shadow-xl">
        <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-muted rounded-xl group-hover:bg-primary/10 transition-all duration-500 border border-border">{icon}</div>
        </div>
        <h4 className="text-xl font-black text-foreground mb-0.5 truncate italic tracking-tighter">{value}</h4>
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">{title}</p>
        <div className="text-[8px] font-black text-primary flex items-center gap-1.5 uppercase tracking-tighter">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {trend}
        </div>
    </div>
);

export default AdminEarnings;