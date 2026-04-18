// Space/Bookings/Index.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import {
    Clock, CheckCircle2, User, ReceiptText, LogIn, LogOut, Activity,
    XCircle, QrCode, Banknote, Loader2, BadgeCheck, AlertCircle, Users
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatPHTime = (dateStr) => new Date(dateStr).toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila'
});
const formatPHDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila'
});

// ─── Live Billing Timer ───────────────────────────────────────────────────────
// Ticks every second while active. Freezes instantly when checkOutAt is set.
const LiveBillingTimer = ({ checkInAt, checkOutAt, rateHour, isOpenTime, onAmountUpdate }) => {
    const [elapsed, setElapsed] = useState('00:00:00');
    const [amount,  setAmount]  = useState(0);

    useEffect(() => {
        if (!checkInAt) return;

        const calculate = (toTime) => {
            const seconds       = Math.max(0, Math.floor((new Date(toTime) - new Date(checkInAt)) / 1000));
            const hrs           = Math.floor(seconds / 3600);
            const mins          = Math.floor((seconds % 3600) / 60);
            const secs          = seconds % 60;
            const ratePerSecond = (rateHour || 0) / 3600;
            const total         = isOpenTime ? (rateHour || 0) : seconds * ratePerSecond;

            setElapsed(`${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`);
            setAmount(total);
            if (onAmountUpdate) onAmountUpdate(total);
        };

        // Frozen — just show final value, no interval
        if (checkOutAt) { calculate(checkOutAt); return; }

        // Ticking
        calculate(Date.now());
        const id = setInterval(() => calculate(Date.now()), 1000);
        return () => clearInterval(id);
    }, [checkInAt, checkOutAt, rateHour, isOpenTime]);

    // Open-time: show flat fee banner instead of ticking clock
    if (isOpenTime) return (
        <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-purple-400 mb-2 text-center">
                Open Time Session
            </p>
            <div className="flex justify-between items-center">
                <span className="text-xs text-purple-300 font-bold uppercase">Flat Rate</span>
                <span className={cn(
                    "text-xl font-[1000] italic tracking-tighter",
                    checkOutAt ? "text-emerald-400" : "text-purple-300"
                )}>₱{(rateHour || 0).toFixed(2)}</span>
            </div>
            {checkOutAt && (
                <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest text-center mt-2 animate-pulse">
                    Session Complete
                </p>
            )}
        </div>
    );

    return (
        <div className={cn(
            "mt-4 p-4 rounded-2xl border transition-all duration-500",
            checkOutAt
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-indigo-500/10 border-indigo-500/20"
        )}>
            <div className="flex items-center justify-between">
                <div className="text-left">
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">
                        {checkOutAt ? 'Total Duration' : 'Session Time'}
                    </p>
                    <p className={cn(
                        "text-lg font-[1000] italic tracking-tighter tabular-nums",
                        checkOutAt ? "text-emerald-400" : "text-indigo-400"
                    )}>{elapsed}</p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">
                        {checkOutAt ? 'Total Bill' : 'Running Total'} · ₱{rateHour}/hr
                    </p>
                    <p className={cn(
                        "text-lg font-[1000] italic tracking-tighter tabular-nums",
                        checkOutAt ? "text-emerald-400" : "text-indigo-400"
                    )}>₱{amount.toFixed(2)}</p>
                </div>
            </div>
            {checkOutAt && (
                <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest text-center mt-3 animate-pulse">
                    Session Complete
                </p>
            )}
        </div>
    );
};

// ─── Payment Panel ────────────────────────────────────────────────────────────
const PaymentPanel = ({ booking, totalAmount, onComplete, isSubmitting }) => {
    const [method,   setMethod]   = useState('cash');
    const [received, setReceived] = useState('');

    const numericReceived = parseFloat(received) || 0;
    const change          = numericReceived - totalAmount;
    const cashValid       = numericReceived >= totalAmount;
    const qrPaymentImage  = booking?.space_id?.qr_payment_image;

    return (
        <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/5 overflow-hidden">
            {/* Total header */}
            <div className="px-5 pt-5 pb-3 border-b border-white/10">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Payment</p>
                <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase">Total Due</span>
                    <span className="text-2xl font-[1000] italic text-white tracking-tighter">
                        ₱{totalAmount.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Method toggle */}
            <div className="flex gap-2 p-4">
                <button
                    onClick={() => setMethod('cash')}
                    className={cn(
                        "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border transition-all",
                        method === 'cash'
                            ? "bg-emerald-500 border-emerald-500 text-black shadow-lg shadow-emerald-900/30"
                            : "border-white/10 text-slate-500 hover:border-white/20"
                    )}
                >
                    <Banknote size={13} /> Cash
                </button>
                <button
                    onClick={() => setMethod('qr')}
                    className={cn(
                        "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border transition-all",
                        method === 'qr'
                            ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-900/30"
                            : "border-white/10 text-slate-500 hover:border-white/20"
                    )}
                >
                    <QrCode size={13} /> GCash / QR
                </button>
            </div>

            {/* Cash input */}
            {method === 'cash' && (
                <div className="px-4 pb-4 space-y-3">
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1.5 tracking-widest">
                            Cash Received
                        </p>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg select-none">₱</span>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                className="w-full bg-black/50 border border-white/10 pl-8 pr-4 py-3 rounded-xl text-white font-black text-lg focus:border-emerald-500 outline-none transition-all"
                                placeholder="0.00"
                                value={received}
                                onChange={(e) => setReceived(e.target.value)}
                            />
                        </div>
                    </div>

                    {numericReceived > 0 && (
                        <div className={cn(
                            "p-3 rounded-xl border flex justify-between items-center",
                            cashValid
                                ? "bg-emerald-500/10 border-emerald-500/20"
                                : "bg-red-500/10 border-red-500/20"
                        )}>
                            <span className={cn(
                                "text-[10px] font-black uppercase flex items-center gap-1.5",
                                cashValid ? "text-emerald-400" : "text-red-400"
                            )}>
                                {cashValid
                                    ? <><BadgeCheck size={11} /> Change</>
                                    : <><AlertCircle size={11} /> Short by</>
                                }
                            </span>
                            <span className={cn(
                                "text-xl font-[1000] italic tracking-tighter",
                                cashValid ? "text-emerald-400" : "text-red-400"
                            )}>
                                ₱{cashValid
                                    ? change.toFixed(2)
                                    : (totalAmount - numericReceived).toFixed(2)
                                }
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* QR / GCash */}
            {method === 'qr' && (
                <div className="px-4 pb-4 text-center">
                    {qrPaymentImage ? (
                        <>
                            <div className="bg-white p-3 rounded-2xl inline-block mb-3 shadow-xl">
                                <img
                                    src={qrPaymentImage}
                                    alt="QR Payment"
                                    className="w-44 h-44 object-contain"
                                />
                            </div>
                            <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-1">
                                Customer scans to pay
                            </p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                                GCash / QRPh / Maya
                            </p>
                        </>
                    ) : (
                        <div className="py-6">
                            <QrCode size={32} className="mx-auto mb-2 text-slate-700" />
                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                                No QR image set for this space.
                            </p>
                            <p className="text-[9px] text-slate-700 mt-1">
                                Add one in Space settings.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Confirm */}
            <div className="px-4 pb-5">
                <button
                    disabled={isSubmitting || (method === 'cash' && !cashValid)}
                    onClick={() => onComplete({ method, amount_received: numericReceived })}
                    className={cn(
                        "w-full py-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl",
                        method === 'cash'
                            ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20 text-white"
                            : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20 text-white",
                        (isSubmitting || (method === 'cash' && !cashValid)) && "opacity-30 cursor-not-allowed"
                    )}
                >
                    {isSubmitting
                        ? <><Loader2 size={14} className="animate-spin" /> Processing...</>
                        : <><BadgeCheck size={14} /> Confirm & Complete Session</>
                    }
                </button>
            </div>
        </div>
    );
};

// ─── Receipt ──────────────────────────────────────────────────────────────────
// Reads from the freshly-updated booking returned by the checkout API response
const ReceiptScreen = ({ booking, onClose }) => (
    <div className="text-center py-2">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-400" />
        </div>
        <h3 className="text-white font-[1000] italic uppercase tracking-tight text-lg mb-1">Session Closed!</h3>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-5">
            Payment recorded successfully
        </p>

        <div className="bg-white/5 rounded-2xl border border-white/10 divide-y divide-white/5 text-left mb-5">
            <div className="flex justify-between px-4 py-3">
                <span className="text-[10px] text-slate-500 font-black uppercase">Ticket</span>
                <span className="text-[10px] text-white font-black italic">#{booking?.ticket_number}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
                <span className="text-[10px] text-slate-500 font-black uppercase">Guest</span>
                <span className="text-[10px] text-white font-black">
                    {booking?.user_id?.name || booking?.guest_name || 'Guest'}
                </span>
            </div>
            <div className="flex justify-between px-4 py-3">
                <span className="text-[10px] text-slate-500 font-black uppercase">Space</span>
                <span className="text-[10px] text-white font-black">{booking?.space_id?.name}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
                <span className="text-[10px] text-slate-500 font-black uppercase">Total Paid</span>
                <span className="text-[10px] text-emerald-400 font-[1000] italic">
                    ₱{(booking?.total_amount || 0).toFixed(2)}
                </span>
            </div>
        </div>

        <button
            onClick={onClose}
            className="w-full py-3 bg-white/5 border border-white/10 text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-white/10 transition-all"
        >
            Close
        </button>
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const BookingsIndex = () => {
    const [bookings,      setBookings]      = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [totalCount,    setTotalCount]    = useState(0);
    const [stats,         setStats]         = useState({ total: 0, pending: 0, confirmed: 0 });
    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });
    const [bookingType, setBookingType] = useState('all');

    // Modal state
    const [selectedQR,    setSelectedQR]    = useState(null);
    const [liveAmount,    setLiveAmount]    = useState(0);    
    const [isCalculating, setIsCalculating] = useState(false);
    const [isSubmitting,  setIsSubmitting]  = useState(false);
    const [showReceipt,   setShowReceipt]   = useState(false);
    const [receiptData,   setReceiptData]   = useState(null); 

    const paramsRef           = useRef(currentParams);
    const lastDataFingerprint = useRef("");

    useEffect(() => { paramsRef.current = currentParams; }, [currentParams]);

    const fetchData = useCallback(async (params = paramsRef.current, isSilent = false) => {
        try {
            const { page, search } = params;
            const res = await apiGet(`/space/bookings?page=${page}&search=${search}&type=${bookingType}`);
            const rowData = res.data?.bookings || [];
            const total   = res.data?.total    || 0;
            const fetched = res.data?.stats    || { total: 0, pending: 0, confirmed: 0 };
            const fp      = JSON.stringify({ rowData, total, fetched });

            if (fp !== lastDataFingerprint.current) {
                lastDataFingerprint.current = fp;
                setBookings(rowData);
                setTotalCount(total);
                setStats(fetched);

                // Keep the open modal in sync with the latest DB state
                setSelectedQR(prev => {
                    if (!prev) return null;
                    const fresh = rowData.find(b => b._id === prev._id);
                    return fresh || prev;
                });
            }
        } catch {
            if (!isSilent) showToast({ icon: 'error', title: 'Failed to sync bookings' });
        }
    }, [bookingType]);

    useEffect(() => {
        fetchData(paramsRef.current, false);
    }, [bookingType, fetchData]);

    const handleParamsChange = useCallback((params) => {
        setCurrentParams(params);
        setLoading(true);
        fetchData(params).finally(() => setLoading(false));
    }, [fetchData]);

    useEffect(() => {
        let mounted = true;
        const load  = async () => {
            setLoading(true);
            await fetchData(paramsRef.current, false);
            if (mounted) setLoading(false);
        };
        load();
        const id = setInterval(() => {
            if (mounted && document.visibilityState === 'visible')
                fetchData(paramsRef.current, true);
        }, 3000);
        return () => { mounted = false; clearInterval(id); };
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

    const openModal = (row) => {
        setSelectedQR(row);
        setLiveAmount(0);
        setShowReceipt(false);
        setReceiptData(null);
    };

    const closeModal = () => {
        setSelectedQR(null);
        setLiveAmount(0);
        setIsCalculating(false);
        setIsSubmitting(false);
        setShowReceipt(false);
        setReceiptData(null);
    };

    // Step 1 — hit /calculate, freeze timer, move to pending_payment
    const handleCalculate = async () => {
        if (!selectedQR) return;
        setIsCalculating(true);
        try {
            const res = await apiPost(`/space/bookings/${selectedQR._id}/calculate`);
            // Use the booking returned by the API — it has the correct total_amount + check_out_at
            const updatedBooking = res.data?.booking;
            if (updatedBooking) setSelectedQR(updatedBooking);
            setLiveAmount(res.data?.total_amount ?? liveAmount);
            showToast({ icon: 'success', title: 'Session frozen — collect payment' });
            await fetchData(paramsRef.current, true);
        } catch (e) {
            showToast({ icon: 'error', title: e?.message || 'Could not calculate bill' });
        } finally {
            setIsCalculating(false);
        }
    };

    // Step 2 — hit /checkout, show receipt with data from API response
    const handleCheckout = async ({ method, amount_received }) => {
        if (!selectedQR) return;
        setIsSubmitting(true);
        try {
            const res = await apiPost(`/space/bookings/${selectedQR._id}/checkout`, {
                payment_method: method,
                amount_received,
            });
            // Use the completed booking from the API response — guaranteed to have total_amount
            setReceiptData(res.data?.booking || selectedQR);
            setShowReceipt(true);
            await fetchData(paramsRef.current, false);
        } catch (e) {
            showToast({ icon: 'error', title: e?.message || 'Checkout failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatScanTime = (d) => d
        ? new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })
        : '--:--';

    // ─── Columns ──────────────────────────────────────────────────────────────
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
                            : `START: ${formatPHTime(row.start_time)}`}
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
                    <p className="text-xs text-white font-bold">
                        {row.user_id?.name || row.guest_name || 'Guest'}
                    </p>
                </div>
            )
        },
        {
            header: "Scan Logs",
            cell: (row) => (
                <div className="text-[10px] space-y-1">
                    <div className="flex items-center gap-1 text-emerald-500 font-bold tracking-tighter">
                        <LogIn size={10} /> {formatScanTime(row.check_in_at)}
                    </div>
                    <div className="flex items-center gap-1 text-indigo-500 font-bold tracking-tighter">
                        <LogOut size={10} /> {formatScanTime(row.check_out_at)}
                    </div>
                </div>
            )
        },
        {
            header: "Status",
            cell: (row) => {
                const styles = {
                    pending:         "bg-amber-500/10 text-amber-500",
                    confirmed:       "bg-emerald-500/10 text-emerald-500",
                    active:          "bg-indigo-500/20 text-indigo-400 border border-indigo-500/20",
                    pending_payment: "bg-orange-500/20 text-orange-400 border border-orange-500/20",
                    completed:       "bg-teal-500/10 text-teal-400",
                    rejected:        "bg-red-500/10 text-red-500",
                    cancelled:       "bg-slate-800 text-slate-500"
                };
                return (
                    <div className={cn("px-2 py-1 rounded text-[9px] font-black uppercase inline-flex items-center gap-1", styles[row.status])}>
                        {row.status === 'active'          && <Activity size={10} className="animate-pulse" />}
                        {row.status === 'pending_payment' && <Banknote size={10} className="animate-pulse" />}
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
                            <button onClick={() => updateStatus(row._id, 'confirm')}
                                className="p-2 bg-emerald-600/20 text-emerald-500 rounded-lg border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all">
                                <CheckCircle2 size={14} />
                            </button>
                            <button onClick={() => updateStatus(row._id, 'reject')}
                                className="p-2 bg-red-600/20 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-600 hover:text-white transition-all">
                                <XCircle size={14} />
                            </button>
                        </>
                    )}
                    {['confirmed', 'active', 'pending_payment'].includes(row.status) && (
                        <button
                            onClick={() => openModal(row)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg",
                                row.status === 'pending_payment'
                                    ? "bg-orange-600 hover:bg-orange-500 shadow-orange-900/40"
                                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40"
                            )}
                        >
                            {row.status === 'pending_payment'
                                ? <><Banknote size={12} /> Collect</>
                                : <><QrCode size={12} /> Show QR</>}
                        </button>
                    )}
                </div>
            )
        }
    ];

    // ─── Modal logic helpers ──────────────────────────────────────────────────
    const booking        = selectedQR;
    const isActive       = booking?.status === 'active';
    const isPendingPayDB = booking?.status === 'pending_payment';
    // After calculate: booking is updated in state with new status + total_amount
    const showPayment    = isPendingPayDB;
    // Total to pass to PaymentPanel: prefer DB value (it was saved), fall back to live timer
    const totalDue       = isPendingPayDB ? (booking?.total_amount || 0) : liveAmount;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Live Hub Traffic</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest italic">Monitoring real-time check-ins.</p>
            </div>

           {/* Stats Grid */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    {/* 1. Active Now - The heartbeat of the hub */}
    <div className="bg-indigo-500/5 border border-indigo-500/10 p-5 rounded-4xl flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <Activity size={20} className="animate-pulse" />
        </div>
        <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Active Sessions</p>
            <p className="text-xl font-[1000] text-white italic tracking-tighter">{stats.active || 0}</p>
        </div>
    </div>

    {/* 2. Walk-ins vs Online */}
    <div className="bg-[#111114] border border-white/5 p-5 rounded-4xl flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400">
                <Users size={20} />
            </div>
            <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Traffic Mix</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-xs font-black text-indigo-400">W: {stats.walkin}</span>
                    <span className="text-xs font-black text-emerald-400">O: {stats.online}</span>
                </div>
            </div>
        </div>
    </div>

    {/* 3. Pending Approvals */}
    <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-4xl flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Clock size={20} />
        </div>
        <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Pending</p>
            <p className="text-xl font-[1000] text-white italic tracking-tighter">{stats.pending || 0}</p>
        </div>
    </div>

    {/* 4. Daily Revenue */}
    <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-4xl flex items-center gap-4 shadow-lg shadow-emerald-900/5">
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Banknote size={20} />
        </div>
        <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Today's Revenue</p>
            <p className="text-xl font-[1000] text-emerald-400 italic tracking-tighter">
                ₱{(stats.revenue || 0).toLocaleString()}
            </p>
        </div>
    </div>
</div>

            <div className="flex items-center gap-2 mb-6 bg-white/5 p-1.5 rounded-3xl border border-white/5 w-fit">
                {[
                    { id: 'all', label: 'All' },
                    { id: 'online', label: 'Online' },
                    { id: 'walkin', label: 'Walk-ins' }
                ].map((type) => (
                    <button
                        key={type.id}
                        onClick={() => setBookingType(type.id)}
                        className={cn(
                            "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            bookingType === type.id 
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40" 
                                : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            <DataTable
                columns={columns}
                data={bookings}
                loading={loading}
                totalCount={totalCount}
                onParamsChange={handleParamsChange}
            />

            {/* ── Modal ── */}
            {booking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                    <div className="bg-[#111114] border border-white/10 p-8 rounded-[3rem] max-w-sm w-full text-center relative shadow-2xl overflow-y-auto max-h-[92vh]">
                        <button onClick={closeModal}
                            className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                            <XCircle size={24} />
                        </button>

                        {/* Receipt */}
                        {showReceipt ? (
                            <ReceiptScreen booking={receiptData} onClose={closeModal} />
                        ) : (
                            <>
                                <h2 className="text-white font-black italic uppercase mb-1 tracking-tight">Entry Ticket</h2>
                                <p className="text-xs text-slate-500 mb-1 uppercase tracking-widest">
                                    {booking.ticket_number} — {booking.user_id?.name || booking.guest_name || 'Guest'}
                                </p>
                                <p className="text-[9px] text-slate-600 mb-4 uppercase tracking-widest font-bold">
                                    {booking.space_id?.name}
                                </p>

                                {/* Show QR only while session still running */}
                                {!showPayment && (
                                    <div className="bg-white p-5 rounded-4xl inline-block mb-4 shadow-xl">
                                        <QRCodeSVG
                                            value={booking.qr_code_token || "no-token"}
                                            size={180}
                                            level="H"
                                            includeMargin={false}
                                        />
                                    </div>
                                )}

                                {/* Active session — show timer + calculate button */}
                                {isActive && booking.check_in_at && (
                                    <>
                                        <LiveBillingTimer
                                            checkInAt={booking.check_in_at}
                                            checkOutAt={booking.check_out_at}
                                            rateHour={booking.space_id?.rate_hour || 0}
                                            isOpenTime={booking.is_open_time}
                                            onAmountUpdate={setLiveAmount}
                                        />
                                        <button
                                            onClick={handleCalculate}
                                            disabled={isCalculating}
                                            className="w-full mt-5 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-xl shadow-orange-900/20 flex items-center justify-center gap-2 disabled:opacity-40"
                                        >
                                            {isCalculating
                                                ? <><Loader2 size={14} className="animate-spin" /> Calculating...</>
                                                : <><BadgeCheck size={14} /> Close Session & Calculate Bill</>
                                            }
                                        </button>
                                    </>
                                )}

                                {/* Pending payment — frozen timer + payment panel */}
                                {showPayment && booking.check_in_at && (
                                    <>
                                        <LiveBillingTimer
                                            checkInAt={booking.check_in_at}
                                            checkOutAt={booking.check_out_at}  // frozen
                                            rateHour={booking.space_id?.rate_hour || 0}
                                            isOpenTime={booking.is_open_time}
                                            onAmountUpdate={() => {}}           // no-op — already frozen
                                        />
                                        <PaymentPanel
                                            booking={booking}
                                            totalAmount={totalDue}
                                            onComplete={handleCheckout}
                                            isSubmitting={isSubmitting}
                                        />
                                    </>
                                )}

                                {/* Confirmed but not yet checked in */}
                                {!isActive && !showPayment && (
                                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-tighter animate-pulse mt-2">
                                        Waiting for scan to check-in...
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingsIndex;