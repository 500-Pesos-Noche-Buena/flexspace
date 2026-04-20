import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '@/utils/Api';
import { 
    Receipt, TrendingUp, Wallet, ArrowUpRight, History, 
    Calendar, Search, Loader2, Zap, Ticket, Gift, Percent
} from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from '@/utils/cn';

const PERIODS = [
    { id: 'daily',   label: 'Today' },
    { id: 'weekly',  label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly',  label: 'Yearly' },
];

const EarningsTracker = () => {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [period,  setPeriod]  = useState('daily');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo,   setDateTo]   = useState('');
    const [search,   setSearch]   = useState('');
    const [page,     setPage]     = useState(1);

    const paramsRef = useRef({ period, dateFrom, dateTo, search, page });

    const fetchEarnings = useCallback(async () => {
        setLoading(true);
        try {
            const { period, dateFrom, dateTo, search, page } = paramsRef.current;
            const params = new URLSearchParams({ period, page, search });
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo)   params.append('dateTo',   dateTo);

            const res = await apiGet(`/space/earnings?${params.toString()}`);
            if (res.success) setData(res.data);
        } catch (err) {
            console.error("Failed to load earnings", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Sync ref and refetch whenever filters change
    useEffect(() => {
        paramsRef.current = { period, dateFrom, dateTo, search, page };
        fetchEarnings();
    }, [period, dateFrom, dateTo, search, page, fetchEarnings]);

    // Clear period selection when manual date range is set
    const handleDateFrom = (v) => { setDateFrom(v); setPeriod(''); setPage(1); };
    const handleDateTo   = (v) => { setDateTo(v);   setPeriod(''); setPage(1); };
    const handlePeriod   = (p) => { setPeriod(p); setDateFrom(''); setDateTo(''); setPage(1); };

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
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase italic">Earnings Tracker</h1>
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-widest">Financial performance & payout history</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="text-[9px] font-black text-emerald-500 flex items-center gap-1.5 uppercase tracking-tighter bg-emerald-500/10 px-3 py-1.5 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        Live Data
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-8 flex flex-wrap items-center gap-3">
                {/* Period pills */}
                <div className="flex bg-[#111114] border border-white/5 p-1 rounded-2xl shadow-2xl">
                    {PERIODS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => handlePeriod(p.id)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                period === p.id
                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Date range */}
                <div className="flex items-center gap-2 bg-[#111114] border border-white/5 rounded-2xl px-4 py-2 hover:border-emerald-500/30 transition-all duration-300">
                    <Calendar size={13} className="text-emerald-500" />
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => handleDateFrom(e.target.value)}
                        className="bg-transparent text-white text-xs outline-none scheme-dark placeholder:text-slate-600 font-medium"
                        placeholder="From"
                    />
                    <span className="text-slate-600 text-xs">→</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => handleDateTo(e.target.value)}
                        className="bg-transparent text-white text-xs outline-none scheme-dark placeholder:text-slate-600 font-medium"
                        placeholder="To"
                    />
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-[#111114] border border-white/5 rounded-2xl px-4 py-2 flex-1 min-w-50 hover:border-emerald-500/30 transition-all duration-300">
                    <Search size={13} className="text-emerald-500" />
                    <input
                        type="text"
                        placeholder="Search ticket or guest..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="bg-transparent text-white text-xs outline-none placeholder:text-slate-600 w-full font-medium"
                    />
                </div>
            </div>

            {/* Stats Grid - 5 cards now */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard
                    title="Gross Revenue"
                    value={`₱${(data?.totalRevenue || 0).toLocaleString()}`}
                    icon={<TrendingUp size={20} />}
                    trend="Total Sales"
                    color="emerald"
                />
                <StatCard
                    title="Net Earnings"
                    value={`₱${(data?.netEarnings || 0).toLocaleString()}`}
                    icon={<Wallet size={20} />}
                    trend="Your Share"
                    color="indigo"
                />
                <StatCard
                    title={`Platform Fee (${data?.feePercent ?? 3}%)`}
                    value={`₱${(data?.platformFee || 0).toLocaleString()}`}
                    icon={<Percent size={20} />}
                    trend="Commission"
                    color="rose"
                />
                <StatCard
                    title="Voucher Discounts"
                    value={`₱${(data?.totalVoucherDiscount || 0).toLocaleString()}`}
                    icon={<Ticket size={20} />}
                    trend={`${data?.bookingsWithVouchers || 0} bookings`}
                    color="purple"
                />
                <StatCard
                    title="Total Discount Given"
                    value={`₱${(data?.totalDiscountGiven || 0).toLocaleString()}`}
                    icon={<Gift size={20} />}
                    trend="Lifetime"
                    color="amber"
                />
            </div>

            {/* Transactions Table */}
            <div className="bg-[#111114] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <History size={16} className="text-slate-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                            Transaction History
                        </h3>
                    </div>
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                        {data?.total || 0} records
                    </div>
                </div>

                <DataTable
                    columns={[
                        {
                            header: "Reference",
                            cell: (r) => (
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                        <span className="text-[8px] font-black text-indigo-400">#</span>
                                    </div>
                                    <span className="font-mono text-indigo-400 font-black text-xs tracking-tighter">
                                        {r.reference}
                                    </span>
                                </div>
                            )
                        },
                        {
                            header: "Guest",
                            cell: (r) => (
                                <div>
                                    <p className="text-white font-black text-xs uppercase italic tracking-tight">{r.guest}</p>
                                    {r.hasVoucher && (
                                        <span className="text-[8px] text-emerald-500 font-black uppercase">Voucher used</span>
                                    )}
                                </div>
                            )
                        },
                        {
                            header: "Space",
                            cell: (r) => (
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{r.space}</span>
                            )
                        },
                        {
                            header: "Amount",
                            cell: (r) => (
                                <div>
                                    {r.discount > 0 ? (
                                        <>
                                            <span className="text-slate-500 text-[8px] line-through block">
                                                ₱{(r.originalAmount || r.amount).toLocaleString()}
                                            </span>
                                            <span className="text-emerald-400 font-black text-sm">
                                                ₱{r.amount.toLocaleString()}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-emerald-400 font-black text-sm">
                                            ₱{r.amount.toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            )
                        },
                        {
                            header: "Discount",
                            cell: (r) => (
                                r.discount > 0 ? (
                                    <span className="text-amber-400 font-black text-xs">
                                        -₱{r.discount.toLocaleString()}
                                    </span>
                                ) : (
                                    <span className="text-slate-600 text-[9px]">—</span>
                                )
                            )
                        },
                        {
                            header: "Type",
                            cell: (r) => (
                                <span className={cn(
                                    "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter border",
                                    r.type === 'walkin'
                                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                )}>
                                    {r.type}
                                </span>
                            )
                        },
                        {
                            header: "Date",
                            cell: (r) => (
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={10} className="text-slate-600" />
                                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                        {new Date(r.date).toLocaleDateString('en-PH', {
                                            month: 'short', 
                                            day: 'numeric',
                                            year: '2-digit'
                                        })}
                                    </span>
                                </div>
                            )
                        }
                    ]}
                    data={data?.transactions || []}
                    loading={loading}
                    totalCount={data?.total || 0}
                    onParamsChange={(p) => setPage(p.page || 1)}
                    renderMobileCard={(r) => (
                        <div className="bg-[#111114] border border-white/5 rounded-2xl p-5 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                            <span className="text-indigo-400 font-black text-xs">#</span>
                                        </div>
                                        <p className="font-mono text-indigo-400 font-black text-xs">{r.reference}</p>
                                    </div>
                                    <p className="text-white font-black text-sm mt-2">{r.guest}</p>
                                    <p className="text-[9px] text-slate-500">{r.space}</p>
                                    {r.hasVoucher && (
                                        <p className="text-[8px] text-emerald-500 font-black mt-1">Voucher applied</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    {r.discount > 0 && (
                                        <p className="text-slate-500 text-[8px] line-through">
                                            ₱{(r.originalAmount || r.amount + r.discount).toLocaleString()}
                                        </p>
                                    )}
                                    <p className="text-emerald-400 font-black text-lg">
                                        ₱{r.amount.toLocaleString()}
                                    </p>
                                    {r.discount > 0 && (
                                        <p className="text-amber-400 text-[8px] font-black">-₱{r.discount}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={10} className="text-slate-600" />
                                    <span className="text-slate-500 text-[9px] font-bold">
                                        {new Date(r.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <span className={cn(
                                    "px-2 py-1 rounded-lg text-[8px] font-black uppercase",
                                    r.type === 'walkin'
                                        ? "bg-purple-500/10 text-purple-400"
                                        : "bg-blue-500/10 text-blue-400"
                                )}>
                                    {r.type}
                                </span>
                            </div>
                        </div>
                    )}
                />
            </div>
        </div>
    );
};

// Enhanced StatCard with more colors
const StatCard = ({ title, value, icon, trend, color }) => {
    const colorClasses = {
        emerald: {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            hover: 'group-hover:border-emerald-500/30',
            icon: 'text-emerald-500',
            iconHover: 'group-hover:bg-emerald-500 group-hover:text-black',
            pulse: 'bg-emerald-500'
        },
        indigo: {
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
            hover: 'group-hover:border-indigo-500/30',
            icon: 'text-indigo-500',
            iconHover: 'group-hover:bg-indigo-500 group-hover:text-white',
            pulse: 'bg-indigo-500'
        },
        rose: {
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/20',
            hover: 'group-hover:border-rose-500/30',
            icon: 'text-rose-500',
            iconHover: 'group-hover:bg-rose-500 group-hover:text-white',
            pulse: 'bg-rose-500'
        },
        purple: {
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            hover: 'group-hover:border-purple-500/30',
            icon: 'text-purple-500',
            iconHover: 'group-hover:bg-purple-500 group-hover:text-white',
            pulse: 'bg-purple-500'
        },
        amber: {
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            hover: 'group-hover:border-amber-500/30',
            icon: 'text-amber-500',
            iconHover: 'group-hover:bg-amber-500 group-hover:text-black',
            pulse: 'bg-amber-500'
        }
    };

    const c = colorClasses[color] || colorClasses.emerald;

    return (
        <div className={cn(
            "relative overflow-hidden bg-[#0a0a0c] border border-white/3 p-6 rounded-4xl flex flex-col justify-between group hover:transition-all duration-500 shadow-2xl",
            c.hover
        )}>
            <div className="flex justify-between items-start mb-4">
                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500",
                    c.bg,
                    c.border,
                    c.iconHover
                )}>
                    <div className={cn("transition-all duration-500", c.icon)}>
                        {icon}
                    </div>
                </div>
                <div className={cn(
                    "text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter",
                    c.bg,
                    c.icon
                )}>
                    <div className="flex items-center gap-1">
                        <div className={cn("w-1 h-1 rounded-full animate-pulse", c.pulse)} />
                        {trend}
                    </div>
                </div>
            </div>
            <div>
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">{title}</p>
                <p className="text-2xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform duration-300">
                    {value}
                </p>
            </div>
            <Zap size={80} className="absolute -right-6 -bottom-6 opacity-5 rotate-12 group-hover:rotate-25 transition-transform duration-700" />
        </div>
    );
};

export default EarningsTracker;