import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { UserPlus, Clock, Banknote, QrCode, BadgeCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/SweetAlert2';
import { cn } from '@/utils/cn';

// ─── Live Billing Timer ───────────────────────────────────────────────────────
const LiveBillingTimer = ({ checkInAt, checkOutAt, rateHour, onAmountUpdate, booking }) => {
    const [elapsed, setElapsed] = useState('00:00:00');
    const [amount, setAmount] = useState(0);

    const hasVoucher = booking?.voucher_discount > 0;
    const voucherDiscount = booking?.voucher_discount || 0;
    const isOpenTime = booking?.is_open_time;
    const isFrozen = !!checkOutAt;

    const formatTime = (date) => {
        if (!date) return '--:--';
        return new Date(date).toLocaleTimeString('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Manila'
        });
    };

    // For OPEN TIME (true) - Timer counts based on check_in_at to check_out_at
    useEffect(() => {
        if (!isOpenTime) return;
        if (!checkInAt) return;

        if (isFrozen) {
            const seconds = Math.max(0, Math.floor((new Date(checkOutAt) - new Date(checkInAt)) / 1000));
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            const hoursSpent = seconds / 3600;
            let total = hoursSpent * (rateHour || 0);

            if (hasVoucher && total > 0) total = Math.max(0, total - voucherDiscount);

            setElapsed(`${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
            setAmount(total);
            if (onAmountUpdate) onAmountUpdate(total);
            return;
        }

        const calculate = (toTime) => {
            const seconds = Math.max(0, Math.floor((new Date(toTime) - new Date(checkInAt)) / 1000));
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            const hoursSpent = seconds / 3600;
            let total = hoursSpent * (rateHour || 0);

            if (hasVoucher && total > 0) total = Math.max(0, total - voucherDiscount);

            setElapsed(`${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
            setAmount(total);
            if (onAmountUpdate) onAmountUpdate(total);
        };

        calculate(Date.now());
        const id = setInterval(() => calculate(Date.now()), 1000);
        return () => clearInterval(id);
    }, [checkInAt, checkOutAt, rateHour, hasVoucher, voucherDiscount, isOpenTime, isFrozen, onAmountUpdate]);

    // OPEN TIME (true) - Show counting timer
    if (isOpenTime) {
        if (!checkInAt) {
            return (
                <div className="mt-4 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-center">
                    <p className="text-amber-400 font-black uppercase text-[9px] tracking-widest">Waiting for check-in...</p>
                </div>
            );
        }

        return (
            <div className={cn("mt-4 p-4 rounded-2xl border transition-all duration-500", checkOutAt ? "bg-emerald-500/10 border-emerald-500/20" : "bg-indigo-500/10 border-indigo-500/20")}>
                {hasVoucher && !checkOutAt && (
                    <div className="mb-3 p-2 bg-emerald-500/20 rounded-xl text-center">
                        <p className="text-emerald-400 font-black uppercase text-[8px] tracking-widest">Voucher Applied: {booking.voucher_applied} (-₱{voucherDiscount.toFixed(2)})</p>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <div className="text-left">
                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">{checkOutAt ? 'Total Duration' : 'Session Time'}</p>
                        <p className={cn("text-lg font-[1000] italic tracking-tighter tabular-nums", checkOutAt ? "text-emerald-400" : "text-indigo-400")}>{elapsed}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">{checkOutAt ? 'Total Bill' : 'Running Total'} · ₱{rateHour}/hr</p>
                        <p className={cn("text-lg font-[1000] italic tracking-tighter tabular-nums", checkOutAt ? "text-emerald-400" : "text-indigo-400")}>₱{amount.toFixed(2)}</p>
                    </div>
                </div>
                {checkOutAt && <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest text-center mt-3 animate-pulse">Session Complete - Ready for Payment</p>}
            </div>
        );
    }

    // HOURLY BOOKING (false) - Show scheduled times, NO timer
    // Calculate based on scheduled start_time and end_time
    const scheduledStart = booking?.start_time;
    const scheduledEnd = booking?.end_time;

    let scheduledHours = 0;
    let scheduledTotal = 0;

    if (scheduledStart && scheduledEnd) {
        const diffMs = new Date(scheduledEnd) - new Date(scheduledStart);
        scheduledHours = diffMs / (1000 * 60 * 60);
        scheduledTotal = scheduledHours * (rateHour || 0);
    }

    return (
        <div className="mt-4 p-4 rounded-2xl border border-slate-500/20 bg-slate-500/10">
            <div className="flex items-center justify-between">
                <div className="text-left">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Scheduled Time</p>
                    <p className="text-md font-black text-white">
                        {formatTime(scheduledStart)} - {formatTime(scheduledEnd)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Rate</p>
                    <p className="text-md font-black text-emerald-400">₱{rateHour}/hr</p>
                </div>
            </div>
            {scheduledTotal > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-500/20">
                    <p className="text-[8px] text-slate-400 text-center">
                        Scheduled total: ₱{scheduledTotal.toFixed(2)} ({scheduledHours.toFixed(1)} hrs)
                    </p>
                </div>
            )}
            {booking?.status === 'pending_payment' && booking?.total_amount > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-500/20">
                    <p className="text-[8px] text-emerald-400 text-center font-black">Total: ₱{booking.total_amount.toFixed(2)}</p>
                </div>
            )}
        </div>
    );
};

// ─── Payment Panel ────────────────────────────────────────────────────────────
const PaymentPanel = ({ booking, totalAmount, onComplete, isSubmitting }) => {
    const [method, setMethod] = useState('cash');
    const [received, setReceived] = useState('');

    const numericReceived = parseFloat(received) || 0;
    const change = numericReceived - totalAmount;
    const cashValid = numericReceived >= totalAmount;
    const qrPaymentImage = booking?.space_id?.qr_payment_image;

    return (
        <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-white/10">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Payment</p>
                <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase">Total Due</span>
                    <span className="text-2xl font-[1000] italic text-white tracking-tighter">
                        ₱{totalAmount.toFixed(2)}
                    </span>
                </div>
            </div>

            <div className="flex gap-2 p-4">
                <button onClick={() => setMethod('cash')} className={cn(
                    "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border transition-all",
                    method === 'cash'
                        ? "bg-emerald-500 border-emerald-500 text-black shadow-lg shadow-emerald-900/30"
                        : "border-white/10 text-slate-500 hover:border-white/20"
                )}>
                    <Banknote size={13} /> Cash
                </button>
                <button onClick={() => setMethod('qr')} className={cn(
                    "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border transition-all",
                    method === 'qr'
                        ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-900/30"
                        : "border-white/10 text-slate-500 hover:border-white/20"
                )}>
                    <QrCode size={13} /> GCash / QR
                </button>
            </div>

            {method === 'cash' && (
                <div className="px-4 pb-4 space-y-3">
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1.5 tracking-widest">Cash Received</p>
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
                            cashValid ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
                        )}>
                            <span className={cn(
                                "text-[10px] font-black uppercase flex items-center gap-1.5",
                                cashValid ? "text-emerald-400" : "text-red-400"
                            )}>
                                {cashValid ? <><BadgeCheck size={11} /> Change</> : <><AlertCircle size={11} /> Short by</>}
                            </span>
                            <span className={cn(
                                "text-xl font-[1000] italic tracking-tighter",
                                cashValid ? "text-emerald-400" : "text-red-400"
                            )}>
                                ₱{cashValid ? change.toFixed(2) : (totalAmount - numericReceived).toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {method === 'qr' && (
                <div className="px-4 pb-4 text-center">
                    {qrPaymentImage ? (
                        <>
                            <div className="bg-white p-3 rounded-2xl inline-block mb-3 shadow-xl">
                                <img src={qrPaymentImage} alt="QR Payment" className="w-44 h-44 object-contain" />
                            </div>
                            <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-1">Customer scans to pay</p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">GCash / QRPh / Maya</p>
                        </>
                    ) : (
                        <div className="py-6">
                            <QrCode size={32} className="mx-auto mb-2 text-slate-700" />
                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">No QR image set for this space.</p>
                        </div>
                    )}
                </div>
            )}

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
                    {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Processing...</> : <><BadgeCheck size={14} /> Confirm & Complete Session</>}
                </button>
            </div>
        </div>
    );
};

// ─── Receipt Screen ──────────────────────────────────────────────────────────
const ReceiptScreen = ({ booking, onClose }) => (
    <div className="text-center py-2">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-400" />
        </div>
        <h3 className="text-white font-[1000] italic uppercase tracking-tight text-lg mb-1">Session Closed!</h3>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-5">Payment recorded successfully</p>

        <div className="bg-white/5 rounded-2xl border border-white/10 divide-y divide-white/5 text-left mb-5">
            <div className="flex justify-between px-4 py-3">
                <span className="text-[10px] text-slate-500 font-black uppercase">Ticket</span>
                <span className="text-[10px] text-white font-black italic">#{booking?.ticket_number}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
                <span className="text-[10px] text-slate-500 font-black uppercase">Guest</span>
                <span className="text-[10px] text-white font-black">{booking?.guest_name || 'Guest'}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
                <span className="text-[10px] text-slate-500 font-black uppercase">Space</span>
                <span className="text-[10px] text-white font-black">{booking?.space_id?.name}</span>
            </div>
            <div className="flex justify-between px-4 py-3 bg-white/5">
                <span className="text-[10px] font-black uppercase text-white">Total Paid</span>
                <span className="text-lg font-[1000] italic text-emerald-400">₱{(booking?.total_amount || 0).toFixed(2)}</span>
            </div>
        </div>

        <button onClick={onClose} className="w-full py-3 bg-white/5 border border-white/10 text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-white/10 transition-all">
            Close
        </button>
    </div>
);

// ─── Main Walkins Component ───────────────────────────────────────────────────
const WalkinsIndex = () => {
    const [walkins, setWalkins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [spaces, setSpaces] = useState([]);
    const [guestSuggestions, setGuestSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [checkoutSession, setCheckoutSession] = useState(null);
    const [receiptData, setReceiptData] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

    const [formData, setFormData] = useState({
        space_id: '',
        name: '',
        email: '',
        is_open_time: true,  // Default: Open Time (timer counts)
        start_time: '',
        end_time: ''
    });

    const paramsRef = useRef({ page: 1, search: '' });
    const lastFP = useRef('');

    const fetchData = useCallback(async (isSilent = false) => {
        try {
            const res = await apiGet(`/space/walkins?search=${paramsRef.current.search}`);
            const rows = res.data || [];
            const fp = JSON.stringify(rows);
            if (fp === lastFP.current) return;
            lastFP.current = fp;
            setWalkins(rows);
            setCheckoutSession(prev => {
                if (!prev) return null;
                const fresh = rows.find(b => b._id === prev._id);
                return fresh || prev;
            });
        } catch {
            // silent
        }
    }, []);

    const fetchSpaces = useCallback(async () => {
        try {
            const res = await apiGet('/space/spaces');
            setSpaces(res.data || []);
        } catch { }
    }, []);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            await fetchData(false);
            if (mounted) setLoading(false);
        };
        load();
        fetchSpaces();
        const id = setInterval(() => {
            if (mounted && document.visibilityState === 'visible')
                fetchData(true);
        }, 5000);
        return () => {
            mounted = false;
            clearInterval(id);
        };
    }, [fetchData, fetchSpaces]);

    const handleParamsChange = useCallback((p) => {
        paramsRef.current = { ...paramsRef.current, ...p };
        fetchData(false);
    }, [fetchData]);

    const handleCheckIn = async (e) => {
        e.preventDefault();
        try {
            const res = await apiPost('/space/walkins/store', formData);
            if (res.success) {
                showToast({ icon: 'success', title: 'Walk-in Started' });
                setOpenModal(false);
                setFormData({ space_id: '', name: '', email: '', is_open_time: true });
                fetchData(false);
            }
        } catch (err) {
            showToast({ icon: 'error', title: err?.message || 'Check-in failed' });
        }
    };

    const handleStopTimer = async (id) => {
        setIsCalculating(true);
        try {
            // Use walkin-specific endpoint
            const res = await apiPost(`/space/walkins/${id}/calculate`);
            if (res.success) {
                const updatedBooking = res.data?.booking;
                setWalkins(prev => prev.map(w => w._id === id ? updatedBooking : w));
                if (checkoutSession?._id === id) {
                    setCheckoutSession(updatedBooking);
                }
                showToast({ icon: 'success', title: 'Session frozen - Ready for payment' });
            }
            fetchData(false);
        } catch (e) {
            showToast({ icon: 'error', title: e?.message || 'Failed to stop session' });
        } finally {
            setIsCalculating(false);
        }
    };

    const handleFinalCheckout = async (paymentDetails) => {
        setIsSubmitting(true);
        try {
            // Use walkin-specific endpoint
            const res = await apiPost(`/space/walkins/${checkoutSession._id}/checkout`, {
                payment_method: paymentDetails.method,
                amount_received: paymentDetails.amount_received,
            });
            if (res.success) {
                setReceiptData(res.data?.booking || res.data);
                fetchData(false);
            }
        } catch (e) {
            showToast({ icon: 'error', title: e?.message || 'Checkout failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGuestSearch = async (value) => {
        setFormData({ ...formData, name: value });
        if (value.trim().length < 2) {
            setGuestSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        try {
            const res = await apiGet(`/space/walkins/guests?search=${value}`);
            setGuestSuggestions(res.data || []);
            setShowSuggestions(true);
        } catch {
            setGuestSuggestions([]);
        }
    };

    const selectGuest = (guest) => {
        setFormData({ ...formData, name: guest.guest_name });
        setShowSuggestions(false);
        setGuestSuggestions([]);
    };

    const columns = [
        {
            header: "Customer",
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black border border-emerald-500/20 uppercase">
                        {row.guest_name?.charAt(0)}
                    </div>
                    <div>
                        <p className="text-white font-bold leading-none">{row.guest_name}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-widest">{row.space_id?.name}</p>
                        {row.is_open_time ? (
                            <span className="text-[8px] text-indigo-400 font-black uppercase">Open Time (Timer)</span>
                        ) : (
                            <span className="text-[8px] text-slate-500 font-black uppercase">Hourly Booking</span>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: "Live Session",
            cell: (row) => (
                <LiveBillingTimer
                    checkInAt={row.check_in_at}
                    checkOutAt={row.check_out_at}
                    rateHour={row.space_id?.rate_hour}
                    onAmountUpdate={() => { }}
                    booking={row}
                />
            )
        },
        {
            header: "Actions",
            cell: (row) => (
                <div className="flex gap-2">
                    {row.status === 'active' ? (
                        <button
                            onClick={() => handleStopTimer(row._id)}
                            disabled={isCalculating}
                            className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                        >
                            {isCalculating ? <Loader2 size={12} className="animate-spin" /> : 'Stop Session'}
                        </button>
                    ) : row.status === 'pending_payment' ? (
                        <button
                            onClick={() => setCheckoutSession(row)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-900/20 hover:scale-105 transition-all"
                        >
                            Pay ₱{row.total_amount?.toFixed(2)}
                        </button>
                    ) : null}
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Walk-ins</h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Live Hub Traffic.</p>
                </div>
                <button
                    onClick={() => setOpenModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
                >
                    <UserPlus size={14} /> New Check-in
                </button>
            </div>

            <DataTable
                columns={columns}
                data={walkins}
                loading={loading}
                totalCount={walkins.length}
                onParamsChange={handleParamsChange}
            />

            {/* MODAL 1: MANUAL ENTRY */}
            <Modal open={openModal} onClose={() => setOpenModal(false)} title="Manual Check-in">
                <form onSubmit={handleCheckIn} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Target Space</label>
                        <select
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-emerald-500 outline-none transition-all"
                            value={formData.space_id}
                            onChange={(e) => setFormData({ ...formData, space_id: e.target.value })}
                        >
                            <option value="" className="bg-[#111114]">Select Space</option>
                            {spaces.map(s => <option key={s._id} value={s._id} className="bg-[#111114] text-white">{s.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Guest Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                placeholder="Josiah"
                                autoComplete="off"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-emerald-500 outline-none transition-all"
                                value={formData.name}
                                onChange={(e) => handleGuestSearch(e.target.value)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                onFocus={() => guestSuggestions.length > 0 && setShowSuggestions(true)}
                            />
                            {showSuggestions && guestSuggestions.length > 0 && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a1a1f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 px-4 pt-3 pb-1">Past Guests</p>
                                    {guestSuggestions.map((guest, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => selectGuest(guest)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left border-t border-white/5 first:border-0"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs uppercase border border-emerald-500/20 shrink-0">
                                                {guest.guest_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-white text-xs font-bold">{guest.guest_name}</p>
                                                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">
                                                    {guest.space_id?.name} · Last visit {new Date(guest.created_at).toLocaleDateString('en-PH')}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Open Time Checkbox */}
                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                Open Time (Timer counts up)
                            </span>
                            <p className="text-[8px] text-slate-500 mt-1">Check-in now, pay by actual time spent</p>
                        </div>
                        <input
                            type="checkbox"
                            className="w-5 h-5 accent-emerald-500"
                            checked={formData.is_open_time}
                            onChange={(e) => setFormData({ ...formData, is_open_time: e.target.checked })}
                        />
                    </div>

                    {/* Time Selection for Hourly Booking (only when unchecked) */}
                    {!formData.is_open_time && (
                        <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300 p-4 bg-white/5 border border-white/10 rounded-2xl">
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Start Time</label>
                                <input
                                    type="time"
                                    value={formData.start_time || ''}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    className="w-full mt-2 px-4 py-3 rounded-2xl bg-black/50 border border-white/10 focus:border-emerald-500 outline-none text-sm font-bold text-white"
                                    required={!formData.is_open_time}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">End Time</label>
                                <input
                                    type="time"
                                    value={formData.end_time || ''}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    className="w-full mt-2 px-4 py-3 rounded-2xl bg-black/50 border border-white/10 focus:border-emerald-500 outline-none text-sm font-bold text-white"
                                    required={!formData.is_open_time}
                                />
                            </div>
                        </div>
                    )}

                    {/* Info text based on selection */}
                    {formData.is_open_time ? (
                        <p className="text-[8px] text-emerald-500 text-center -mt-2">
                            ✅ Open Time: Timer will start now. Pay for actual time spent.
                        </p>
                    ) : (
                        <p className="text-[8px] text-amber-500 text-center -mt-2">
                            ⏰ Hourly Booking: Customer pays for scheduled hours (even if they leave early)
                        </p>
                    )}

                    <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-3xl font-black uppercase text-[10px] hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40">
                        Start Session
                    </button>
                </form>
            </Modal>

            {/* MODAL 2: CHECKOUT & RECEIPT */}
            <Modal
                open={!!checkoutSession}
                onClose={() => { setCheckoutSession(null); setReceiptData(null); }}
                title={receiptData ? "Receipt" : "Payment Settlement"}
            >
                {receiptData ? (
                    <ReceiptScreen booking={receiptData} onClose={() => { setCheckoutSession(null); setReceiptData(null); }} />
                ) : checkoutSession && (
                    <PaymentPanel
                        booking={checkoutSession}
                        totalAmount={checkoutSession.total_amount}
                        onComplete={handleFinalCheckout}
                        isSubmitting={isSubmitting}
                    />
                )}
            </Modal>
        </div>
    );
};

export default WalkinsIndex;