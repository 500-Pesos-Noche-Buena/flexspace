// Space/Bookings/Index.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { 
    Clock, CheckCircle2, User, ReceiptText, LogIn, LogOut, Activity, XCircle, QrCode
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react"; // Use named import to fix the export error

const formatPHTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Manila'
    });
};

const formatPHDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila'
    });
};

const BookingsIndex = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0 });
    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });
    const [selectedQR, setSelectedQR] = useState(null);

    const paramsRef = useRef(currentParams);
    const lastDataFingerprint = useRef("");

    // Sync Ref to ensure interval uses latest search/page
    useEffect(() => {
        paramsRef.current = currentParams;
    }, [currentParams]);

    const fetchData = useCallback(async (params = paramsRef.current, isSilent = false) => {
        try {
            const { page, search } = params;
            const res = await apiGet(`/space/bookings?page=${page}&search=${search}`);
            
            const rowData = res.data?.bookings || [];
            const total = res.data?.total || 0;
            const fetchedStats = res.data?.stats || { total: 0, pending: 0, confirmed: 0 };

            const currentFingerprint = JSON.stringify({ rowData, total, fetchedStats });

            if (currentFingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = currentFingerprint;
                setBookings(rowData);
                setTotalCount(total);
                setStats(fetchedStats);
            }
        } catch {
            if (!isSilent) showToast({ icon: 'error', title: 'Failed to sync bookings' });
        }
    }, []);

    // FIXED: Added handleParamsChange back
    const handleParamsChange = useCallback((params) => {
        setCurrentParams(params);
        setLoading(true);
        fetchData(params).finally(() => setLoading(false));
    }, [fetchData]);

    useEffect(() => {
        let isMounted = true;
        const loadInitial = async () => {
            setLoading(true);
            await fetchData(paramsRef.current, false);
            if (isMounted) setLoading(false);
        };
        
        loadInitial();

        const interval = setInterval(() => {
            if (isMounted && document.visibilityState === 'visible') {
                fetchData(paramsRef.current, true);
            }
        }, 3000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchData]);

    const updateStatus = async (id, action) => {
        try {
            await apiPost(`/space/bookings/${id}/${action}`);
            showToast({ icon: 'success', title: `Booking ${action}ed` });
            fetchData(paramsRef.current, false);
        } catch {
            showToast({ icon: 'error', title: 'Action failed' });
        }
    };

    const formatScanTime = (date) => {
        if (!date) return '--:--';
        return new Date(date).toLocaleTimeString('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Manila'
        });
    };

    const columns = [
       {
    header: "Ref & Time",
    cell: (row) => (
        <div className="flex flex-col">
            <span className="text-white font-black italic uppercase tracking-tighter">
                #{row.ticket_number || 'N/A'}
            </span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                {row.is_open_time
                    ? `ALL DAY: ${formatPHDate(row.start_time)}`
                    : `START: ${formatPHTime(row.start_time)}`
                }
            </span>
        </div>
    )
},
        {
            header: "Customer",
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-indigo-400 border border-white/5">
                        <User size={14} />
                    </div>
                    <p className="text-xs text-white font-bold">{row.user_id?.name || 'Guest'}</p>
                </div>
            )
        },
        {
            header: "Scan Logs",
            cell: (row) => (
                <div className="text-[10px] space-y-1">
                    <div className="flex items-center gap-1 text-emerald-500 font-bold tracking-tighter">
                        <LogIn size={10} /> {row.check_in_at ? formatScanTime(row.check_in_at) : '--:--'}
                    </div>
                    <div className="flex items-center gap-1 text-indigo-500 font-bold tracking-tighter">
                        <LogOut size={10} /> {row.check_out_at ? formatScanTime(row.check_out_at) : '--:--'}
                    </div>
                </div>
            )
        },
        {
            header: "Status",
            cell: (row) => {
                const styles = {
                    pending: "bg-amber-500/10 text-amber-500",
                    confirmed: "bg-emerald-500/10 text-emerald-500",
                    active: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/20",
                    rejected: "bg-red-500/10 text-red-500",
                    cancelled: "bg-slate-800 text-slate-500"
                };
                return (
                    <div className={cn("px-2 py-1 rounded text-[9px] font-black uppercase inline-flex items-center gap-1", styles[row.status])}>
                        {row.status === 'active' && <Activity size={10} className="animate-pulse" />}
                        {row.status}
                    </div>
                );
            }
        },
        {
            header: "Actions",
            cell: (row) => (
                <div className="flex gap-2">
                    {row.status === 'pending' && (
                        <>
                            <button onClick={() => updateStatus(row._id, 'confirm')} className="p-2 bg-emerald-600/20 text-emerald-500 rounded-lg border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all"><CheckCircle2 size={14} /></button>
                            <button onClick={() => updateStatus(row._id, 'reject')} className="p-2 bg-red-600/20 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-600 hover:text-white transition-all"><XCircle size={14} /></button>
                        </>
                    )}
                    {row.status === 'confirmed' && (
                        <button 
                            onClick={() => setSelectedQR(row)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/40"
                        >
                            <QrCode size={12} /> Show QR
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Live Hub Traffic</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest italic">Monitoring real-time check-ins.</p>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><ReceiptText size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Bookings</p>
                        <p className="text-2xl font-black text-white italic">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-[2.5rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Clock size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Waiting</p>
                        <p className="text-2xl font-black text-white italic">{stats.pending}</p>
                    </div>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2.5rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle2 size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Approved</p>
                        <p className="text-2xl font-black text-white italic">{stats.confirmed}</p>
                    </div>
                </div>
            </div>

            <DataTable 
                columns={columns} 
                data={bookings} 
                loading={loading} 
                totalCount={totalCount} 
                onParamsChange={handleParamsChange} 
            />

            {/* QR Modal Overlay */}
            {selectedQR && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                    <div className="bg-[#111114] border border-white/10 p-8 rounded-[3rem] max-w-sm w-full text-center relative shadow-2xl">
                        <button 
                            onClick={() => setSelectedQR(null)} 
                            className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
                        >
                            <XCircle size={24} />
                        </button>
                        
                        <h2 className="text-white font-black italic uppercase mb-2 tracking-tight">Entry Ticket</h2>
                        <p className="text-xs text-slate-500 mb-6 uppercase tracking-widest">
                            {selectedQR.ticket_number} — {selectedQR.user_id?.name || 'Guest'}
                        </p>
                        
                        <div className="bg-white p-5 rounded-[2rem] inline-block mb-6 shadow-xl">
                            <QRCodeSVG 
                                value={selectedQR.qr_code_token || "no-token"} 
                                size={220} 
                                level="H" 
                                includeMargin={false}
                            />
                        </div>
                        
                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-tighter animate-pulse">
                            Waiting for scan to check-in...
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingsIndex;