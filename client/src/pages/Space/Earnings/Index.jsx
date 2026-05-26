import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, downloadFile } from '@/utils/Api';
import {
    Receipt, TrendingUp, Wallet, ArrowUpRight, History,
    Calendar, Search, Loader2, Zap, Ticket, Gift, Percent,
    Download, FileText, FileSpreadsheet, Printer, Package,
    Coffee, ShoppingBag, DollarSign, BarChart3, PieChart
} from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from '@/utils/cn';
import { showToast } from '@/components/ui/SweetAlert2';

const PERIODS = [
    { id: 'daily', label: 'Today' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' },
];

const EarningsTracker = () => {
    const [data, setData] = useState(null);
    const [posStats, setPosStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('daily');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);

    const paramsRef = useRef({ period, dateFrom, dateTo, search, page });

    // Fetch both earnings and POS stats
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { period, dateFrom, dateTo, search, page } = paramsRef.current;
            const params = new URLSearchParams({ period, page, search });
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);

            // Fetch earnings data
            const earningsRes = await apiGet(`/space/earnings?${params.toString()}`);
            if (earningsRes.success) setData(earningsRes.data);

            // Fetch POS income stats
            const posRes = await apiGet('/space/income/stats');
            if (posRes.success) setPosStats(posRes.data);

        } catch (err) {
            console.error("Failed to load data", err);
            showToast({ icon: 'error', title: 'Failed to load earnings data' });
        } finally {
            setLoading(false);
        }
    }, []);

    // Sync ref and refetch whenever filters change
    useEffect(() => {
        paramsRef.current = { period, dateFrom, dateTo, search, page };
        fetchData();
    }, [period, dateFrom, dateTo, search, page, fetchData]);

    // Clear period selection when manual date range is set
    const handleDateFrom = (v) => { setDateFrom(v); setPeriod(''); setPage(1); };
    const handleDateTo = (v) => { setDateTo(v); setPeriod(''); setPage(1); };
    const handlePeriod = (p) => { setPeriod(p); setDateFrom(''); setDateTo(''); setPage(1); };

    // ============================================
    // EXPORT TO CSV
    // ============================================
    const exportToCSV = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams({ period });
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);
            if (search) params.append('search', search);

            const filename = `earnings_${period}_${Date.now()}.csv`;
            await downloadFile(`/space/earnings/export/csv?${params.toString()}`, filename);

            showToast({ icon: 'success', title: 'CSV exported successfully' });
        } catch (err) {
            console.error('Export CSV error:', err);
            showToast({ icon: 'error', title: 'Failed to export CSV' });
        } finally {
            setExporting(false);
        }
    };

    // ============================================
    // EXPORT TO PDF (FIXED - opens print dialog with clean report)
    // ============================================
    const exportToPDF = () => {
        setExporting(true);
        try {
            const reportHtml = generateReportHTML();
            const printWindow = window.open('', '_blank', 'width=1000,height=800,toolbar=yes,scrollbars=yes');

            if (!printWindow) {
                showToast({ icon: 'error', title: 'Popup blocked! Please allow popups for this site' });
                setExporting(false);
                return;
            }

            printWindow.document.write(reportHtml);
            printWindow.document.close();

            printWindow.onload = () => {
                printWindow.print();
            };

            showToast({ icon: 'success', title: 'PDF report opened' });
        } catch (err) {
            console.error('Export PDF error:', err);
            showToast({ icon: 'error', title: 'Failed to generate PDF' });
        } finally {
            setExporting(false);
        }
    };

    // ============================================
    // Generate HTML for PDF/Print (WITH POS STATS)
    // ============================================
    const generateReportHTML = () => {
        const totalRevenue = data?.totalRevenue || 0;
        const netEarnings = data?.netEarnings || 0;
        const platformFee = data?.platformFee || 0;
        const totalVoucherDiscount = data?.totalVoucherDiscount || 0;
        const feePercent = data?.feePercent || 3;
        
        // POS Stats
        const posDaily = posStats?.daily || { total: 0, count: 0 };
        const posWeekly = posStats?.weekly || { total: 0, count: 0 };
        const posMonthly = posStats?.monthly || { total: 0, count: 0 };
        const posTotal = posStats?.total || { total: 0, count: 0 };

        const transactionsHTML = (data?.transactions || []).map(t => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${t.reference || 'N/A'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${t.guest || 'Guest'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${t.space || 'N/A'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₱${(t.amount || 0).toLocaleString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${t.discount > 0 ? `-₱${t.discount.toLocaleString()}` : '—'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-transform: capitalize;">${t.type || 'unknown'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${t.date ? new Date(t.date).toLocaleDateString() : 'N/A'}</td>
        </tr>
        `).join('');

        const periodText = period.toUpperCase();
        const dateRange = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : periodText;

        return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Complete Earnings Report - ${dateRange}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #111827; background: white; }
            @media print { body { padding: 20px; } .no-break { page-break-inside: avoid; } }
            h1 { color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 24px; font-size: 28px; }
            .header { text-align: center; margin-bottom: 32px; }
            .header h2 { margin: 8px 0; color: #374151; font-size: 20px; }
            .header p { color: #6b7280; font-size: 12px; margin: 4px 0; }
            .section-title { font-size: 18px; font-weight: bold; margin: 32px 0 16px 0; color: #374151; border-left: 4px solid #10b981; padding-left: 12px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
            .summary-card { background: #f9fafb; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #e5e7eb; }
            .summary-card h3 { font-size: 11px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
            .summary-card .amount { font-size: 24px; font-weight: bold; color: #10b981; }
            .summary-card .net { color: #6366f1; }
            .pos-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
            .pos-card { background: #f0fdf4; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0; }
            .pos-card .label { font-size: 10px; color: #059669; font-weight: 600; }
            .pos-card .value { font-size: 18px; font-weight: bold; color: #047857; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
            th { background: #f9fafb; padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
            td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
            .text-right { text-align: right; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📊 Complete Earnings Report</h1>
            <h2>FlexSpace Iloilo</h2>
            <p>Period: ${dateRange}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>

        <!-- Booking Earnings Summary -->
        <div class="section-title">🏢 Booking Earnings</div>
        <div class="summary">
            <div class="summary-card"><h3>Gross Revenue</h3><div class="amount">₱${totalRevenue.toLocaleString()}</div></div>
            <div class="summary-card"><h3>Platform Fee (${feePercent}%)</h3><div class="amount">₱${platformFee.toLocaleString()}</div></div>
            <div class="summary-card"><h3>Net Earnings</h3><div class="amount net">₱${netEarnings.toLocaleString()}</div></div>
            <div class="summary-card"><h3>Voucher Discounts</h3><div class="amount">₱${totalVoucherDiscount.toLocaleString()}</div></div>
        </div>

        <!-- POS Sales Summary -->
        <div class="section-title">🛒 POS Sales Summary</div>
        <div class="pos-grid">
            <div class="pos-card"><div class="label">Today</div><div class="value">₱${(posDaily.total || 0).toLocaleString()}</div><div style="font-size:9px">${posDaily.count || 0} orders</div></div>
            <div class="pos-card"><div class="label">This Week</div><div class="value">₱${(posWeekly.total || 0).toLocaleString()}</div><div style="font-size:9px">${posWeekly.count || 0} orders</div></div>
            <div class="pos-card"><div class="label">This Month</div><div class="value">₱${(posMonthly.total || 0).toLocaleString()}</div><div style="font-size:9px">${posMonthly.count || 0} orders</div></div>
            <div class="pos-card"><div class="label">All Time</div><div class="value">₱${(posTotal.total || 0).toLocaleString()}</div><div style="font-size:9px">${posTotal.count || 0} orders</div></div>
        </div>

        <!-- Combined Total -->
        <div class="summary" style="margin-top: 24px;">
            <div class="summary-card" style="background: #ecfdf5; border-color: #a7f3d0;">
                <h3>💰 TOTAL REVENUE (Booking + POS)</h3>
                <div class="amount" style="font-size: 32px;">₱${(totalRevenue + (posMonthly.total || 0)).toLocaleString()}</div>
                <div style="font-size: 10px; margin-top: 8px;">Booking: ₱${totalRevenue.toLocaleString()} | POS: ₱${(posMonthly.total || 0).toLocaleString()}</div>
            </div>
        </div>

        <div class="section-title">📋 Transaction History</div>
        <table>
            <thead><tr><th>Reference</th><th>Guest</th><th>Space</th><th class="text-right">Amount</th><th class="text-right">Discount</th><th>Type</th><th>Date</th></tr></thead>
            <tbody>${transactionsHTML || '<tr><td colspan="7" style="text-align:center; padding:40px;">No transactions found</td></tr>'}</tbody>
        </table>

        <div class="footer">
            <p>This is a computer-generated document. No signature required.</p>
            <p>© ${new Date().getFullYear()} FlexSpace Iloilo. All rights reserved.</p>
        </div>
    </body>
    </html>`;
    };

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

    // Get current period stats for POS
    const currentPosStats = posStats?.[period === 'daily' ? 'daily' : period === 'weekly' ? 'weekly' : 'monthly'] || { total: 0, count: 0 };
    const totalRevenue = data?.totalRevenue || 0;
    const posRevenue = currentPosStats.total || 0;
    const combinedRevenue = totalRevenue + posRevenue;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10 no-print">

            {/* Header */}
            <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase italic">Complete Financial Dashboard</h1>
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-widest">Booking earnings + POS sales combined</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={exportToCSV}
                        disabled={exporting}
                        className="text-[9px] font-black text-emerald-500 flex items-center gap-1.5 uppercase tracking-tighter bg-emerald-500/10 px-3 py-1.5 rounded-full hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                    >
                        {exporting ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />}
                        CSV
                    </button>
                    <button
                        onClick={exportToPDF}
                        disabled={exporting}
                        className="text-[9px] font-black text-indigo-500 flex items-center gap-1.5 uppercase tracking-tighter bg-indigo-500/10 px-3 py-1.5 rounded-full hover:bg-indigo-500/20 transition-all disabled:opacity-50"
                    >
                        {exporting ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                        PDF
                    </button>
                    <div className="text-[9px] font-black text-emerald-500 flex items-center gap-1.5 uppercase tracking-tighter bg-emerald-500/10 px-3 py-1.5 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        Live Data
                    </div>
                </div>
            </div>

            {/* Combined Total Revenue Banner */}
            <div className="mb-6 bg-linear-to-r from-emerald-600/20 to-indigo-600/20 border border-emerald-500/30 rounded-2xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                            <DollarSign size={24} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Total Revenue (This Period)</p>
                            <p className="text-2xl font-[1000] text-white italic tracking-tighter">₱{combinedRevenue.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex gap-4 text-[9px]">
                        <div className="text-center">
                            <p className="text-slate-500">Bookings</p>
                            <p className="text-white font-bold">₱{totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div className="text-center">
                            <p className="text-slate-500">POS Sales</p>
                            <p className="text-white font-bold">₱{posRevenue.toLocaleString()}</p>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div className="text-center">
                            <p className="text-slate-500">Orders</p>
                            <p className="text-white font-bold">{(data?.totalOrders || 0) + (currentPosStats.count || 0)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-8 flex flex-wrap items-center gap-3">
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

            {/* Stats Grid - Booking Earnings */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Receipt size={14} className="text-emerald-400" />
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Booking Earnings</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Gross Revenue" value={`₱${(data?.totalRevenue || 0).toLocaleString()}`} icon={<TrendingUp size={20} />} trend="Total Sales" color="emerald" />
                    <StatCard title="Net Earnings" value={`₱${(data?.netEarnings || 0).toLocaleString()}`} icon={<Wallet size={20} />} trend="Your Share" color="indigo" />
                    <StatCard title={`Platform Fee (${data?.feePercent ?? 3}%)`} value={`₱${(data?.platformFee || 0).toLocaleString()}`} icon={<Percent size={20} />} trend="Commission" color="rose" />
                    <StatCard title="Voucher Discounts" value={`₱${(data?.totalVoucherDiscount || 0).toLocaleString()}`} icon={<Ticket size={20} />} trend={`${data?.bookingsWithVouchers || 0} bookings`} color="purple" />
                </div>
            </div>

            {/* POS Sales Stats */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag size={14} className="text-indigo-400" />
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">POS Sales (Products)</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Today's POS" value={`₱${(posStats?.daily?.total || 0).toLocaleString()}`} icon={<Coffee size={20} />} trend={`${posStats?.daily?.count || 0} orders`} color="emerald" />
                    <StatCard title="Weekly POS" value={`₱${(posStats?.weekly?.total || 0).toLocaleString()}`} icon={<Package size={20} />} trend={`${posStats?.weekly?.count || 0} orders`} color="indigo" />
                    <StatCard title="Monthly POS" value={`₱${(posStats?.monthly?.total || 0).toLocaleString()}`} icon={<BarChart3 size={20} />} trend={`${posStats?.monthly?.count || 0} orders`} color="purple" />
                    <StatCard title="Lifetime POS" value={`₱${(posStats?.total?.total || 0).toLocaleString()}`} icon={<DollarSign size={20} />} trend={`${posStats?.total?.count || 0} orders`} color="amber" />
                </div>
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
                    <div className="flex items-center gap-3">
                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                            {data?.total || 0} records
                        </div>
                        <button
                            onClick={exportToPDF}
                            className="text-[8px] font-black text-slate-400 hover:text-white transition-all flex items-center gap-1"
                        >
                            <Printer size={10} />
                            Print
                        </button>
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

// Enhanced StatCard
const StatCard = ({ title, value, icon, trend, color }) => {
    const colorClasses = {
        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-500', pulse: 'bg-emerald-500' },
        indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: 'text-indigo-500', pulse: 'bg-indigo-500' },
        rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: 'text-rose-500', pulse: 'bg-rose-500' },
        purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: 'text-purple-500', pulse: 'bg-purple-500' },
        amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-500', pulse: 'bg-amber-500' }
    };
    const c = colorClasses[color] || colorClasses.emerald;

    return (
        <div className={cn("relative overflow-hidden bg-[#0a0a0c] border border-white/3 p-6 rounded-4xl group hover:transition-all duration-500 shadow-2xl", c.border)}>
            <div className="flex justify-between items-start mb-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500", c.bg, c.border)}>
                    <div className={c.icon}>{icon}</div>
                </div>
                <div className={cn("text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter", c.bg, c.icon)}>
                    <div className="flex items-center gap-1">
                        <div className={cn("w-1 h-1 rounded-full animate-pulse", c.pulse)} />
                        {trend}
                    </div>
                </div>
            </div>
            <div>
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">{title}</p>
                <p className="text-2xl font-black text-white tracking-tighter">{value}</p>
            </div>
        </div>
    );
};

export default EarningsTracker;