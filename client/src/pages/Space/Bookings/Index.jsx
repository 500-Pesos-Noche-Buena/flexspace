// Space/Bookings/Index.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import {
    Clock, CheckCircle2, User, ReceiptText, LogIn, LogOut, Activity,
    XCircle, QrCode, Banknote, Loader2, BadgeCheck, AlertCircle, Users, UserPlus, Star
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from '@/components/ui/Modal';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatPHTime = (dateStr) => new Date(dateStr).toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila'
});
const formatPHDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila'
});

// ─── Live Billing Timer ───────────────────────────────────────────────────────
const LiveBillingTimer = ({ checkInAt, checkOutAt, rateHour, onAmountUpdate, booking }) => {
    const [elapsed, setElapsed] = useState('00:00:00');
    const [amount, setAmount] = useState(0);

    const hasVoucher = booking?.voucher_discount > 0;
    const voucherDiscount = booking?.voucher_discount || 0;

    useEffect(() => {
        if (!checkInAt) return;

        const calculate = (toTime) => {
            const seconds = Math.max(0, Math.floor((new Date(toTime) - new Date(checkInAt)) / 1000));
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;

            // Calculate based on actual time spent (per hour for ALL bookings)
            const hoursSpent = seconds / 3600;
            let total = hoursSpent * (rateHour || 0);

            // Apply voucher discount if available
            if (hasVoucher && total > 0) {
                total = Math.max(0, total - voucherDiscount);
            }

            setElapsed(`${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
            setAmount(total);
            if (onAmountUpdate) onAmountUpdate(total);
        };

        if (checkOutAt) {
            calculate(checkOutAt);
            return;
        }

        calculate(Date.now());
        const id = setInterval(() => calculate(Date.now()), 1000);
        return () => clearInterval(id);
    }, [checkInAt, checkOutAt, rateHour, hasVoucher, voucherDiscount, onAmountUpdate]);

    return (
        <div className={cn(
            "mt-4 p-4 rounded-2xl border transition-all duration-500",
            checkOutAt
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-indigo-500/10 border-indigo-500/20"
        )}>
            {hasVoucher && !checkOutAt && (
                <div className="mb-3 p-2 bg-emerald-500/20 rounded-xl text-center">
                    <p className="text-emerald-400 font-black uppercase text-[8px] tracking-widest">
                        Voucher Applied: {booking.voucher_applied} (-₱{voucherDiscount.toFixed(2)})
                    </p>
                </div>
            )}

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
const PaymentPanel = ({ booking, liveTotalAmount, onComplete, isSubmitting, onApplyVoucher }) => {
    const [method, setMethod] = useState('cash');
    const [received, setReceived] = useState('');
    const [voucherCode, setVoucherCode] = useState('');
    const [applyingVoucher, setApplyingVoucher] = useState(false);
    const [voucherDiscount, setVoucherDiscount] = useState(0);
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [currentTotal, setCurrentTotal] = useState(liveTotalAmount || 0);

    // Get QR code from multiple possible paths
    const qrPaymentImage =
        booking?.space_id?.user_id?.business_payment_qr ||  // Space owner's QR
        booking?.space_id?.business_payment_qr ||           // Direct space QR
        booking?.business_payment_qr ||                     // Booking's own QR
        null;

    // Debug log to see what's available
    useEffect(() => {
        console.log('🔍 PaymentPanel - Debug QR paths:', {
            'booking?.space_id?.user_id?.business_payment_qr': booking?.space_id?.user_id?.business_payment_qr,
            'booking?.space_id?.business_payment_qr': booking?.space_id?.business_payment_qr,
            'booking?.business_payment_qr': booking?.business_payment_qr,
            'Full booking object': booking,
            'Space ID': booking?.space_id,
            'User ID within space': booking?.space_id?.user_id
        });
    }, [booking]);

    // Update current total when liveTotalAmount changes
    useEffect(() => {
        if (liveTotalAmount > 0) {
            setCurrentTotal(liveTotalAmount);
        }
    }, [liveTotalAmount]);

    const numericReceived = parseFloat(received) || 0;
    const change = numericReceived - currentTotal;
    const cashValid = numericReceived >= currentTotal;

    // Check if voucher was already applied to this booking
    const hasExistingVoucher = booking?.voucher_discount > 0;
    const existingDiscount = booking?.voucher_discount || 0;
    const originalAmount = hasExistingVoucher ? (currentTotal + existingDiscount) : currentTotal;

    // Calculate final total with new voucher discount
    const finalTotal = hasExistingVoucher ? currentTotal : Math.max(0, currentTotal - voucherDiscount);

    const handleApplyVoucher = async () => {
        if (!voucherCode.trim()) {
            showToast({ icon: 'warning', title: 'Please enter a voucher code' });
            return;
        }

        setApplyingVoucher(true);
        try {
            const res = await apiPost(`/space/bookings/${booking._id}/apply-voucher`, {
                voucherCode: voucherCode.trim().toUpperCase()
            });

            if (res.success) {
                setVoucherDiscount(res.data.discount_amount);
                setAppliedVoucher({
                    code: voucherCode.trim().toUpperCase(),
                    discount: res.data.discount_amount
                });
                setCurrentTotal(res.data.total_amount);
                showToast({
                    icon: 'success',
                    title: `Voucher applied! Save ₱${res.data.discount_amount}`
                });
                if (onApplyVoucher) onApplyVoucher(res.data.booking);
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Invalid voucher code' });
        } finally {
            setApplyingVoucher(false);
        }
    };

    const handleRemoveVoucher = () => {
        setAppliedVoucher(null);
        setVoucherDiscount(0);
        setCurrentTotal(liveTotalAmount);
        setVoucherCode('');
    };

    // Construct full image URL
    const getFullImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${path}`;
    };

    return (
        <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/5 overflow-hidden">
            {/* Total header */}
            <div className="px-5 pt-5 pb-3 border-b border-white/10">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Payment</p>

                {/* Show original price if voucher applied */}
                {(hasExistingVoucher || appliedVoucher) && (
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] text-slate-500">Original amount</span>
                        <span className="text-[10px] text-slate-500 line-through">
                            ₱{(hasExistingVoucher ? originalAmount : currentTotal + voucherDiscount).toFixed(2)}
                        </span>
                    </div>
                )}

                {/* Voucher discount */}
                {(hasExistingVoucher || appliedVoucher) && (
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[8px] text-emerald-400 font-bold uppercase">Voucher discount</span>
                        <span className="text-[10px] text-emerald-400 font-bold">
                            -₱{(hasExistingVoucher ? existingDiscount : voucherDiscount).toFixed(2)}
                        </span>
                    </div>
                )}

                <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase">Total Due</span>
                    <span className="text-2xl font-[1000] italic text-white tracking-tighter">
                        ₱{(hasExistingVoucher ? currentTotal : finalTotal).toFixed(2)}
                    </span>
                </div>

                {/* Show voucher code if applied */}
                {(hasExistingVoucher || appliedVoucher) && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="flex justify-between items-center">
                            <span className="text-[8px] text-emerald-400 font-black uppercase">Voucher Applied</span>
                            <span className="text-[8px] font-mono text-emerald-400">
                                {hasExistingVoucher ? booking.voucher_applied : appliedVoucher?.code}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Voucher Input Section - Only show if no voucher applied yet */}
            {!hasExistingVoucher && !appliedVoucher && (
                <div className="px-4 pt-4 pb-2 border-b border-white/10">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2">
                        Have a voucher?
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Enter voucher code"
                            value={voucherCode}
                            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                            className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-mono uppercase focus:border-indigo-500 outline-none"
                        />
                        <button
                            onClick={handleApplyVoucher}
                            disabled={applyingVoucher || !voucherCode.trim()}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                        >
                            {applyingVoucher ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
                        </button>
                    </div>
                </div>
            )}

            {/* Remove voucher button if applied but not yet confirmed */}
            {appliedVoucher && !hasExistingVoucher && (
                <div className="px-4 pt-2 pb-2">
                    <button
                        onClick={handleRemoveVoucher}
                        className="text-[8px] text-red-400 hover:text-red-300"
                    >
                        Remove voucher
                    </button>
                </div>
            )}

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
                                    : ((hasExistingVoucher ? currentTotal : finalTotal) - numericReceived).toFixed(2)
                                }
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* QR / GCash - Fixed version */}
            {method === 'qr' && (
                <div className="px-4 pb-4 text-center">
                    {qrPaymentImage ? (
                        <>
                            <div className="flex justify-center mb-3">
                                <div className="bg-white p-4 rounded-2xl shadow-xl">
                                    <img
                                        src={getFullImageUrl(qrPaymentImage)}
                                        alt="Payment QR Code"
                                        className="w-48 h-48 object-contain"
                                        onError={(e) => {
                                            console.error('QR failed to load:', qrPaymentImage);
                                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Cline x1="3" y1="9" x2="21" y2="9"%3E%3C/line%3E%3Cline x1="9" y1="21" x2="9" y2="15"%3E%3C/line%3E%3C/svg%3E';
                                        }}
                                    />
                                </div>
                            </div>
                            <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-1">
                                Customer scans to pay
                            </p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                                GCash / QRPh / Maya
                            </p>
                            <div className="mt-2 p-2 bg-blue-500/10 rounded-lg">
                                <p className="text-[8px] text-blue-400 font-mono">
                                    Amount: ₱{(hasExistingVoucher ? currentTotal : finalTotal).toFixed(2)}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="py-6">
                            <div className="w-20 h-20 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center mb-3">
                                <QrCode size={40} className="text-slate-600" />
                            </div>
                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                                No QR code available
                            </p>
                            <p className="text-[8px] text-slate-700 mt-1">
                                Please contact the space owner
                            </p>
                            <button
                                onClick={() => {
                                    // Optional: Refresh booking data
                                    if (onApplyVoucher) onApplyVoucher(booking);
                                }}
                                className="mt-3 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg text-[8px] font-black uppercase"
                            >
                                Refresh
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Confirm */}
            <div className="px-4 pb-5">
                <button
                    disabled={isSubmitting || (method === 'cash' && !cashValid) || currentTotal === 0}
                    onClick={() => onComplete({
                        method,
                        amount_received: numericReceived,
                        voucher_code: appliedVoucher?.code || null,
                        total_amount: currentTotal
                    })}
                    className={cn(
                        "w-full py-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl",
                        method === 'cash'
                            ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20 text-white"
                            : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20 text-white",
                        (isSubmitting || (method === 'cash' && !cashValid) || currentTotal === 0) && "opacity-30 cursor-not-allowed"
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
const ReceiptScreen = ({ booking, onClose }) => {
    const [showReviewQR, setShowReviewQR] = useState(false);

    return (
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

                {/* Show voucher discount if applied */}
                {booking?.voucher_discount > 0 && (
                    <>
                        <div className="flex justify-between px-4 py-3">
                            <span className="text-[10px] text-slate-500 font-black uppercase">Subtotal</span>
                            <span className="text-[10px] text-slate-400 line-through">
                                ₱{(booking.total_amount + booking.voucher_discount).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between px-4 py-3">
                            <span className="text-[10px] text-emerald-400 font-black uppercase">Voucher Savings</span>
                            <span className="text-[10px] text-emerald-400 font-bold">
                                -₱{booking.voucher_discount.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between px-4 py-3 bg-emerald-500/5">
                            <span className="text-[10px] text-slate-500 font-black uppercase">Voucher Code</span>
                            <span className="text-[10px] font-mono text-emerald-400">
                                {booking.voucher_applied}
                            </span>
                        </div>
                    </>
                )}

                <div className="flex justify-between px-4 py-3 bg-white/5">
                    <span className="text-[10px] font-black uppercase text-white">Total Paid</span>
                    <span className="text-lg font-[1000] italic text-emerald-400">
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
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const BookingsIndex = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, active: 0, walkin: 0, online: 0, revenue: 0 });
    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });
    const [bookingType, setBookingType] = useState('all');

    const [reviewQrUrl, setReviewQrUrl] = useState(null);

    // Modal state
    const [selectedQR, setSelectedQR] = useState(null);
    const [liveAmount, setLiveAmount] = useState(0);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedReviewBooking, setSelectedReviewBooking] = useState(null);
    const [showReviewQR, setShowReviewQR] = useState(false);

    // Add function to open review modal
    const openReviewModal = (booking) => {
        setSelectedReviewBooking(booking);
        setShowReviewQR(false);
        setShowReviewModal(true);
    };

    // Add function to close review modal
    const closeReviewModal = () => {
        setShowReviewModal(false);
        setSelectedReviewBooking(null);
        setShowReviewQR(false);
    };

    const [showWalkinModal, setShowWalkinModal] = useState(false);
    const [walkinForm, setWalkinForm] = useState({
        space_id: '',
        name: '',
        is_open_time: true,
        start_time: '',
        end_time: ''
    });
    const [spaces, setSpaces] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const paramsRef = useRef(currentParams);
    const lastDataFingerprint = useRef("");

    const fetchSpaces = useCallback(async () => {
        try {
            const res = await apiGet('/space/spaces');
            setSpaces(res.data || []);
        } catch (err) {
            console.error("Failed to fetch spaces", err);
        }
    }, []);

    useEffect(() => {
        fetchSpaces();
    }, [fetchSpaces]);

    const handleWalkinCheckin = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await apiPost('/space/walkins/store', walkinForm);
            if (res.success) {
                showToast({ icon: 'success', title: 'Walk-in checked in successfully!' });
                setShowWalkinModal(false);
                setWalkinForm({ space_id: '', name: '', is_open_time: true, start_time: '', end_time: '' });
                fetchData();
            }
        } catch (err) {
            showToast({ icon: 'error', title: err?.message || 'Check-in failed' });
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => { paramsRef.current = currentParams; }, [currentParams]);

    const fetchData = useCallback(async (params = paramsRef.current, isSilent = false) => {
        try {
            const { page, search } = params;
            const res = await apiGet(`/space/bookings?page=${page}&search=${search}&type=${bookingType}`);
            const rowData = res.data?.bookings || [];
            const total = res.data?.total || 0;
            const fetched = res.data?.stats || { total: 0, pending: 0, confirmed: 0, active: 0, walkin: 0, online: 0, revenue: 0 };
            const fp = JSON.stringify({ rowData, total, fetched });

            if (fp !== lastDataFingerprint.current) {
                lastDataFingerprint.current = fp;
                setBookings(rowData);
                setTotalCount(total);
                setStats(fetched);

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
        const load = async () => {
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
        setLiveAmount(row.total_amount || 0);
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

    const handleCalculate = async () => {
        if (!selectedQR) return;
        setIsCalculating(true);
        try {
            const isWalkin = selectedQR.booking_type === 'walkin';
            const endpoint = isWalkin
                ? `/space/walkins/${selectedQR._id}/calculate`
                : `/space/bookings/${selectedQR._id}/calculate`;

            const res = await apiPost(endpoint);
            const updatedBooking = res.data?.booking;
            if (updatedBooking) {
                setSelectedQR(updatedBooking);
                setLiveAmount(updatedBooking.total_amount || 0);
            }
            showToast({ icon: 'success', title: 'Session frozen — collect payment' });
            await fetchData(paramsRef.current, true);
        } catch (e) {
            showToast({ icon: 'error', title: e?.message || 'Could not calculate bill' });
        } finally {
            setIsCalculating(false);
        }
    };

    const handlePaymentComplete = async ({ method, amount_received }) => {
        if (!selectedQR) return;
        setIsSubmitting(true);
        try {
            // Use walkin endpoint for walk-ins, booking endpoint for online bookings
            const isWalkin = selectedQR.booking_type === 'walkin';
            const endpoint = isWalkin
                ? `/space/walkins/${selectedQR._id}/checkout`
                : `/space/bookings/${selectedQR._id}/checkout`;

            const res = await apiPost(endpoint, {
                payment_method: method,
                amount_received,
            });

            const inner = res.data;
            const bookingData = inner?.booking || selectedQR;
            const qrUrl = inner?.review_qr_url || null;

            setReceiptData(bookingData);
            setReviewQrUrl(qrUrl);
            setShowReceipt(true);
            await fetchData(paramsRef.current, false);
            showToast({ icon: 'success', title: 'Payment completed successfully!' });
        } catch (e) {
            showToast({ icon: 'error', title: e?.message || 'Checkout failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ADD THIS FUNCTION - Handle voucher application
    const handleApplyVoucher = async (updatedBooking) => {
        if (updatedBooking) {
            setSelectedQR(updatedBooking);
            setLiveAmount(updatedBooking.total_amount || 0);
            await fetchData(paramsRef.current, true);
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
                            : `START: ${formatPHTime(row.start_time)} - END: ${formatPHTime(row.end_time)}`}
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
                    pending: "bg-amber-500/10 text-amber-500",
                    confirmed: "bg-emerald-500/10 text-emerald-500",
                    active: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/20",
                    pending_payment: "bg-orange-500/20 text-orange-400 border border-orange-500/20",
                    completed: "bg-teal-500/10 text-teal-400",
                    rejected: "bg-red-500/10 text-red-500",
                    cancelled: "bg-slate-800 text-slate-500"
                };
                return (
                    <div className={cn("px-2 py-1 rounded text-[9px] font-black uppercase inline-flex items-center gap-1", styles[row.status])}>
                        {row.status === 'active' && <Activity size={10} className="animate-pulse" />}
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
                    {/* Pending actions */}
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

                    {/* View/Collect actions for active/pending payment */}
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
                            {row.status === 'pending_payment' ? (
                                <><Banknote size={12} /> Collect</>
                            ) : row.booking_type === 'walkin' ? (
                                <><User size={12} /> View</>
                            ) : (
                                <><QrCode size={12} /> Show QR</>
                            )}
                        </button>
                    )}

                    {/* ========== LEAVE A REVIEW BUTTON (for completed bookings) ========== */}
                    {row.status === 'completed' && row.qr_code_token && (
                        <button
                            onClick={() => openReviewModal(row)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-xl text-[10px] font-black uppercase transition-all hover:bg-purple-600 hover:text-white border border-purple-500/30"
                        >
                            <Star size={12} /> Review
                        </button>
                    )}
                </div>
            )
        }
    ];

    const booking = selectedQR;
    const isActive = booking?.status === 'active';
    const isPendingPayDB = booking?.status === 'pending_payment';
    const showPayment = isPendingPayDB;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Live Hub Traffic</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest italic">Monitoring real-time check-ins.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="bg-indigo-500/5 border-indigo-500/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <Activity size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Active Sessions</p>
                            <p className="text-xl font-[1000] text-white italic tracking-tighter">{stats.active || 0}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#111114] border-white/5">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Traffic Mix</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-black text-indigo-400">W: {stats.walkin || 0}</span>
                                    <span className="text-xs font-black text-emerald-400">O: {stats.online || 0}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-500/5 border-amber-500/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Pending</p>
                            <p className="text-xl font-[1000] text-white italic tracking-tighter">{stats.pending || 0}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-500/5 border-emerald-500/10 shadow-lg shadow-emerald-900/5">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Banknote size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Today's Revenue</p>
                            <p className="text-xl font-[1000] text-emerald-400 italic tracking-tighter">
                                ₱{(stats.revenue || 0).toLocaleString()}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center justify-between mb-6">
                <Tabs value={bookingType} onValueChange={setBookingType} className="w-auto">
                    <TabsList className="bg-white/5 border border-white/5 rounded-3xl p-1.5">
                        <TabsTrigger
                            value="all"
                            className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-900/40 text-slate-500"
                        >
                            All
                        </TabsTrigger>
                        <TabsTrigger
                            value="online"
                            className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-900/40 text-slate-500"
                        >
                            Online
                        </TabsTrigger>
                        <TabsTrigger
                            value="walkin"
                            className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-900/40 text-slate-500"
                        >
                            Walk-ins
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <Button
                    onClick={() => setShowWalkinModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest px-4 py-2 h-auto shadow-lg shadow-emerald-900/20"
                >
                    <UserPlus size={14} className="mr-2" /> New Walk-in
                </Button>
            </div>

            <Modal open={showWalkinModal} onClose={() => setShowWalkinModal(false)} title="New Walk-in Check-in" size="md" variant="dark">
                <form onSubmit={handleWalkinCheckin} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Space</label>
                        <select
                            required
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-emerald-500 outline-none text-sm"
                            value={walkinForm.space_id}
                            onChange={(e) => setWalkinForm({ ...walkinForm, space_id: e.target.value })}
                        >
                            <option value="" className="bg-[#111114]">Choose space...</option>
                            {spaces.map(s => (
                                <option key={s._id} value={s._id} className="bg-[#111114]">{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Guest Name</label>
                        <input
                            type="text"
                            required
                            placeholder="Enter guest name"
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-emerald-500 outline-none text-sm"
                            value={walkinForm.name}
                            onChange={(e) => setWalkinForm({ ...walkinForm, name: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Open Time (Timer counts up)</span>
                        <input
                            type="checkbox"
                            className="w-5 h-5 accent-emerald-500"
                            checked={walkinForm.is_open_time}
                            onChange={(e) => setWalkinForm({ ...walkinForm, is_open_time: e.target.checked })}
                        />
                    </div>

                    {!walkinForm.is_open_time && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Start Time</label>
                                <input
                                    type="time"
                                    required
                                    className="w-full mt-2 px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-white focus:border-emerald-500 outline-none text-sm"
                                    value={walkinForm.start_time}
                                    onChange={(e) => setWalkinForm({ ...walkinForm, start_time: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">End Time</label>
                                <input
                                    type="time"
                                    required
                                    className="w-full mt-2 px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-white focus:border-emerald-500 outline-none text-sm"
                                    value={walkinForm.end_time}
                                    onChange={(e) => setWalkinForm({ ...walkinForm, end_time: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowWalkinModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all disabled:opacity-50">
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                            Check In
                        </button>
                    </div>
                </form>
            </Modal>

            <DataTable
                columns={columns}
                data={bookings}
                loading={loading}
                totalCount={totalCount}
                onParamsChange={handleParamsChange}
                renderMobileCard={(booking) => (
                    <div key={booking._id} className="bg-[#111114] border border-white/5 p-5 rounded-[2.5rem] space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white italic">
                                    {booking.user_id?.name?.charAt(0) || booking.guest_name?.charAt(0) || 'G'}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white leading-tight">
                                        {booking.user_id?.name || booking.guest_name || 'Guest'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-500">
                                        #{booking.ticket_number}
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "px-2 py-1 rounded text-[9px] font-black uppercase",
                                booking.status === 'active' && "bg-indigo-500/20 text-indigo-400",
                                booking.status === 'pending_payment' && "bg-orange-500/20 text-orange-400",
                                booking.status === 'completed' && "bg-teal-500/10 text-teal-400",
                                booking.status === 'pending' && "bg-amber-500/10 text-amber-500",
                                booking.status === 'confirmed' && "bg-emerald-500/10 text-emerald-500"
                            )}>
                                {booking.status}
                            </div>
                        </div>

                        <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{booking.space_id?.name}</span>
                            <span>₱{booking.space_id?.rate_hour}/hr</span>
                        </div>

                        <div className="flex justify-between text-[9px] text-slate-500">
                            <span>
                                {booking.is_open_time
                                    ? `ALL DAY: ${formatPHDate(booking.start_time)}`
                                    : `${formatPHTime(booking.start_time)} - ${formatPHTime(booking.end_time)}`}
                            </span>
                            {booking.check_in_at && (
                                <span className="text-emerald-400">✓ Checked in</span>
                            )}
                        </div>

                        {/* Mobile Action Buttons */}
                        <div className="flex gap-2">
                            {/* Main action button (Collect/View/Show QR) */}
                            {['confirmed', 'active', 'pending_payment'].includes(booking.status) && (
                                <button
                                    onClick={() => openModal(booking)}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all",
                                        booking.status === 'pending_payment'
                                            ? "bg-orange-600 hover:bg-orange-500 text-white"
                                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                                    )}
                                >
                                    {booking.status === 'pending_payment' ? 'Collect Payment' :
                                        booking.status === 'active' ? 'View Session' : 'Show QR'}
                                </button>
                            )}

                            {/* Review button for completed bookings */}
                            {booking.status === 'completed' && booking.qr_code_token && (
                                <button
                                    onClick={() => openReviewModal(booking)}
                                    className="flex-1 py-3 bg-purple-600/20 text-purple-400 rounded-xl text-[10px] font-black uppercase transition-all hover:bg-purple-600 hover:text-white border border-purple-500/30 flex items-center justify-center gap-2"
                                >
                                    <Star size={12} /> Review
                                </button>
                            )}

                            {/* Fallback for other statuses (pending, etc.) */}
                            {booking.status === 'pending' && (
                                <div className="flex-1 flex gap-2">
                                    <button
                                        onClick={() => updateStatus(booking._id, 'confirm')}
                                        className="flex-1 py-3 bg-emerald-600/20 text-emerald-500 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all"
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        onClick={() => updateStatus(booking._id, 'reject')}
                                        className="flex-1 py-3 bg-red-600/20 text-red-500 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all"
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            />

            {/* ── Modal ── */}
            <Modal
                open={!!booking}
                onClose={closeModal}
                title="Entry Ticket"
                size="xl"
                variant="dark"
            >
                {showReceipt ? (
                    <ReceiptScreen booking={receiptData} onClose={closeModal} reviewQrUrl={reviewQrUrl} />
                ) : (
                    <>
                        <div className="text-center">
                            <p className="text-xs text-slate-500 mb-1 uppercase tracking-widest">
                                {booking?.ticket_number} — {booking?.user_id?.name || booking?.guest_name || 'Guest'}
                            </p>
                            <p className="text-[9px] text-slate-600 mb-4 uppercase tracking-widest font-bold">
                                {booking?.space_id?.name}
                            </p>
                        </div>

                        {/* Show QR for confirmed or active sessions (not walk-ins) */}
                        {!showPayment && booking?.booking_type !== 'walkin' && booking?.qr_code_token && (
                            <div className="bg-white p-5 rounded-4xl mb-4 shadow-xl flex justify-center mx-auto" style={{ width: 'fit-content' }}>
                                <QRCodeSVG
                                    value={booking.qr_code_token}
                                    size={180}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                        )}

                        {/* Confirmed but not yet checked in - Show QR and waiting message */}
                        {booking?.status === 'confirmed' && !showPayment && (
                            <>
                                {!booking?.qr_code_token && booking?.booking_type !== 'walkin' && (
                                    <div className="bg-white p-5 rounded-4xl mb-4 shadow-xl flex justify-center mx-auto" style={{ width: 'fit-content' }}>
                                        <QRCodeSVG
                                            value={booking.qr_code_token}
                                            size={180}
                                            level="H"
                                            includeMargin={false}
                                        />
                                    </div>
                                )}
                                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-tighter animate-pulse mt-2 text-center">
                                    Waiting for scan to check-in...
                                </p>
                                <p className="text-[8px] text-slate-500 text-center mt-1">
                                    Customer needs to scan this QR code at the hub
                                </p>
                            </>
                        )}

                        {/* Active session — show timer + calculate button */}
                        {isActive && booking?.check_in_at && (
                            <>
                                <LiveBillingTimer
                                    checkInAt={booking.check_in_at}
                                    checkOutAt={booking.check_out_at}
                                    rateHour={booking.space_id?.rate_hour || 0}
                                    onAmountUpdate={setLiveAmount}
                                    booking={booking}
                                />
                                <button
                                    onClick={handleCalculate}
                                    disabled={isCalculating}
                                    className="w-full mt-5 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-xl shadow-orange-900/20 flex items-center justify-center gap-2 disabled:opacity-40"
                                >
                                    {isCalculating
                                        ? <><Loader2 size={14} className="animate-spin" /> Calculating...</>
                                        : <><BadgeCheck size={14} /> Close Session & Calculate Bill</>}
                                </button>
                            </>
                        )}

                        {/* Pending payment — frozen timer + payment panel */}
                        {showPayment && booking?.check_in_at && (
                            <>
                                <LiveBillingTimer
                                    checkInAt={booking.check_in_at}
                                    checkOutAt={booking.check_out_at}
                                    rateHour={booking.space_id?.rate_hour || 0}
                                    onAmountUpdate={() => { }}
                                    booking={booking}
                                />
                                <PaymentPanel
                                    booking={booking}
                                    liveTotalAmount={liveAmount}
                                    onComplete={handlePaymentComplete}
                                    isSubmitting={isSubmitting}
                                    onApplyVoucher={handleApplyVoucher}
                                />
                            </>
                        )}
                    </>
                )}
            </Modal>

            {/* ── REVIEW QR MODAL ── */}
            <Modal
                open={showReviewModal}
                onClose={closeReviewModal}
                title="Leave a Review"
                size="md"
                variant="dark"
            >
                <div className="text-center py-4">
                    {/* Space Info */}
                    <div className="mb-4">
                        <h3 className="text-lg font-black text-white">{selectedReviewBooking?.space_id?.name}</h3>
                        <p className="text-[10px] text-slate-500">
                            Booking #{selectedReviewBooking?.ticket_number}
                        </p>
                        <p className="text-[10px] text-slate-500">
                            Guest: {selectedReviewBooking?.guest_name || 'Guest'}
                        </p>
                    </div>

                    {!showReviewQR ? (
                        <button
                            onClick={() => {
                                const backendUrl = import.meta.env.VITE_API_URL;
                                const reviewUrl = `${backendUrl}/api/v1/space/qr/${selectedReviewBooking?.qr_code_token}`;
                                setShowReviewQR(true);
                                console.log('Review URL (should point to backend):', reviewUrl);
                            }}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black uppercase text-sm transition-all flex items-center justify-center gap-2"
                        >
                            <Star size={18} /> Generate Review QR
                        </button>
                    ) : (
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6">
                            <p className="text-[10px] text-purple-400 font-black uppercase tracking-wider mb-4">
                                Customer scans to leave a review
                            </p>
                            <div className="bg-white p-4 rounded-xl flex justify-center mx-auto" style={{ width: 'fit-content' }}>
                                <QRCodeSVG
                                    value={`${import.meta.env.VITE_API_URL}/api/v1/space/qr/${selectedReviewBooking?.qr_code_token}`}
                                    size={180}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                            <p className="text-[8px] text-slate-500 mt-4">
                                Share this QR code with the customer to leave a review
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default BookingsIndex;