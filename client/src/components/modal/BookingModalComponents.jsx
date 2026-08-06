import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { CheckCircle2, DoorOpen, Banknote, QrCode, CreditCard, Loader2, BadgeCheck, AlertCircle, Clock } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { apiPost } from '@/utils/Api';
import { useTheme } from '@/hooks/useTheme';

export const LiveBillingTimer = ({
    checkInAt,
    checkOutAt,
    onAmountUpdate,
    booking,
    isCalculated = false
}) => {
    const [elapsed, setElapsed] = useState({ minutes: 0, seconds: 0 });
    const [currentAmount, setCurrentAmount] = useState(0);
    const [isMinimumChargeApplied, setIsMinimumChargeApplied] = useState(false);
    const [minutesAtThreshold, setMinutesAtThreshold] = useState(0);
    const intervalRef = useRef(null);

    const hourlyRate = booking?.space_id?.rate_hour || 0;
    const perMinuteRate = hourlyRate / 60;

    const isBillCalculated = booking?.status === 'pending_payment' || isCalculated;

    // Helper to calculate minutes from check-in/out
    const calculateActualMinutes = () => {
        if (!checkInAt) return 0;
        
        const checkIn = new Date(checkInAt);
        const checkOut = checkOutAt ? new Date(checkOutAt) : new Date();
        
        // If booking has actual_duration from backend, use it
        if (booking?.actual_duration?.total_minutes) {
            return booking.actual_duration.total_minutes;
        }
        
        // Otherwise calculate from dates
        const diffMs = checkOut - checkIn;
        return diffMs / (1000 * 60);
    };

    useEffect(() => {
        // If bill is calculated, use the booking's total_amount
        if (isBillCalculated && booking?.total_amount) {
            setCurrentAmount(booking.total_amount);
            
            // Calculate minutes from actual_duration or fallback
            let minutes = booking?.actual_duration?.total_minutes || 0;
            
            // If no actual_duration, calculate from check-in/out
            if (!minutes && checkInAt) {
                minutes = calculateActualMinutes();
            }
            
            setIsMinimumChargeApplied(minutes >= 31);
            setMinutesAtThreshold(minutes);
            return;
        }

        // Otherwise, run the live timer
        const updateTimer = () => {
            if (!checkInAt) return;

            const checkIn = new Date(checkInAt);
            const now = new Date();
            const endTime = checkOutAt ? new Date(checkOutAt) : now;
            const effectiveNow = endTime < now ? endTime : now;
            const diffMs = effectiveNow - checkIn;

            if (diffMs <= 0) {
                setElapsed({ minutes: 0, seconds: 0 });
                setCurrentAmount(0);
                return;
            }

            const minutes = Math.floor(diffMs / 60000);
            const seconds = Math.floor((diffMs % 60000) / 1000);
            setElapsed({ minutes, seconds });

            let amount;
            let isMinCharge = false;

            if (minutes >= 31) {
                const hoursToCharge = Math.ceil(minutes / 60);
                amount = hoursToCharge * hourlyRate;
                isMinCharge = true;
            } else {
                amount = minutes * perMinuteRate;
                isMinCharge = false;
            }

            setCurrentAmount(parseFloat(amount.toFixed(2)));
            setIsMinimumChargeApplied(isMinCharge);
            setMinutesAtThreshold(minutes);

            if (onAmountUpdate) {
                onAmountUpdate(parseFloat(amount.toFixed(2)));
            }
        };

        updateTimer();

        if (!isBillCalculated) {
            intervalRef.current = setInterval(updateTimer, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [checkInAt, checkOutAt, hourlyRate, perMinuteRate, onAmountUpdate, isBillCalculated, booking]);

    const formatTime = (minutes, seconds) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m ${seconds}s`;
        }
        return `${mins}m ${seconds}s`;
    };

    // If bill is calculated, show the final amount with a checkmark
    if (isBillCalculated) {
        const totalMinutes = booking?.actual_duration?.total_minutes || calculateActualMinutes() || 0;
        const hoursCharged = Math.ceil(totalMinutes / 60);
        
        return (
            <div className="bg-linear-to-r from-emerald-500/10 to-emerald-600/5 rounded-2xl p-5 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest flex items-center gap-2">
                            <Clock size={12} />
                            Session Time
                        </p>
                        <p className="text-sm text-foreground font-bold mt-1">
                            {totalMinutes >= 31 ? 
                                `${hoursCharged} hour(s)` :
                                `${Math.floor(totalMinutes || 0)} min(s)`
                            }
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">Final Bill</p>
                        <p className="text-2xl font-black text-foreground">₱{currentAmount.toFixed(2)}</p>
                    </div>
                </div>
                {totalMinutes >= 31 && (
                    <div className="mt-2 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                        <AlertCircle size={12} className="text-amber-600 dark:text-amber-400" />
                        <span className="text-[8px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                            Minimum charge: {hoursCharged} hour(s) @ ₱{hourlyRate}/hr = ₱{currentAmount.toFixed(2)}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    // Live timer display
    return (
        <div className="bg-linear-to-r from-primary/10 to-purple-500/10 rounded-2xl p-5 border border-primary/20">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[8px] text-primary font-black uppercase tracking-widest flex items-center gap-2">
                        <Clock size={12} className="animate-pulse" />
                        Live Session
                    </p>
                    <p className="text-sm text-foreground font-bold mt-1">
                        {formatTime(elapsed.minutes, elapsed.seconds)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[8px] text-primary font-black uppercase tracking-widest">Current Bill</p>
                    <p className="text-2xl font-black text-foreground">₱{currentAmount.toFixed(2)}</p>
                </div>
            </div>
            <div className="mt-3">
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-primary/50 rounded-full transition-all duration-1000"
                        style={{ 
                            width: `${Math.min((elapsed.minutes / 60) * 100, 100)}%` 
                        }}
                    />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[7px] text-muted-foreground">
                        {elapsed.minutes}m elapsed
                    </span>
                    <span className="text-[7px] text-muted-foreground">
                        {elapsed.minutes >= 31 ? 'Full hour rate' : `${Math.round((31 - elapsed.minutes))}m to full hour`}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Payment Panel Component
export const PaymentPanel = ({ booking, liveTotalAmount, onComplete, isSubmitting, onApplyVoucher, onOpenOnlinePayment }) => {
    const { themeColor } = useTheme();
    const [method, setMethod] = useState('cash');
    const [received, setReceived] = useState('');
    const [voucherCode, setVoucherCode] = useState('');
    const [applyingVoucher, setApplyingVoucher] = useState(false);
    const [voucherDiscount, setVoucherDiscount] = useState(0);
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [currentTotal, setCurrentTotal] = useState(liveTotalAmount || 0);

    const getCorrectRate = () => {
        if (booking?.room_id?.rate_hour) return booking.room_id.rate_hour;
        if (booking?.rate_per_hour) return booking.rate_per_hour;
        return booking?.space_id?.rate_hour || 0;
    };
    const ratePerHour = getCorrectRate();

    const qrPaymentImage = booking?.space_id?.user_id?.business_payment_qr || booking?.space_id?.business_payment_qr || booking?.business_payment_qr || null;

    useEffect(() => {
        if (liveTotalAmount > 0) setCurrentTotal(liveTotalAmount);
    }, [liveTotalAmount]);

    const numericReceived = parseFloat(received) || 0;
    const change = numericReceived - currentTotal;
    const cashValid = numericReceived >= currentTotal;
    const hasExistingVoucher = booking?.voucher_discount > 0;
    const existingDiscount = booking?.voucher_discount || 0;
    const originalAmount = hasExistingVoucher ? (currentTotal + existingDiscount) : currentTotal;
    const finalTotal = hasExistingVoucher ? currentTotal : Math.max(0, currentTotal - voucherDiscount);

    const handleApplyVoucher = async () => {
        if (!voucherCode.trim()) {
            showToast({ icon: 'warning', title: 'Please enter a voucher code' });
            return;
        }
        setApplyingVoucher(true);
        try {
            const res = await apiPost(`/space/bookings/${booking._id}/apply-voucher`, { voucherCode: voucherCode.trim().toUpperCase() });
            if (res.success) {
                setVoucherDiscount(res.data.discount_amount);
                setAppliedVoucher({ code: voucherCode.trim().toUpperCase(), discount: res.data.discount_amount });
                setCurrentTotal(res.data.total_amount);
                showToast({ icon: 'success', title: `Voucher applied! Save ₱${res.data.discount_amount}` });
                if (onApplyVoucher) onApplyVoucher(res.data.booking);
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Invalid voucher code' });
        } finally {
            setApplyingVoucher(false);
        }
    };

    const getFullImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${path}`;
    };

    const getButtonColor = (color) => {
        const colors = {
            cash: 'bg-emerald-600 hover:bg-emerald-500',
            qr: 'bg-blue-600 hover:bg-blue-500',
            online: 'bg-purple-600 hover:bg-purple-500',
        };
        return colors[color] || colors.cash;
    };

    return (
        <div className="mt-5 rounded-[1.75rem] border border-border bg-muted overflow-hidden">
            {booking?.room_id && (
                <div className="px-5 pt-4">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 rounded-lg">
                        <DoorOpen size={10} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase">Private Room: {booking.room_id.name}</span>
                    </div>
                </div>
            )}
            <div className="px-5 pt-5 pb-3 border-b border-border">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Payment</p>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] text-muted-foreground">Rate</span>
                    <span className="text-[8px] text-foreground font-bold">₱{ratePerHour}/hour</span>
                </div>
                {(hasExistingVoucher || appliedVoucher) && (
                    <>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[8px] text-muted-foreground">Original amount</span>
                            <span className="text-[10px] text-muted-foreground line-through">₱{(hasExistingVoucher ? originalAmount : currentTotal + voucherDiscount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Voucher discount</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">-₱{(hasExistingVoucher ? existingDiscount : voucherDiscount).toFixed(2)}</span>
                        </div>
                    </>
                )}
                <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground font-bold uppercase">Total Due</span>
                    <span className="text-2xl font-[1000] italic text-foreground tracking-tighter">₱{(hasExistingVoucher ? currentTotal : finalTotal).toFixed(2)}</span>
                </div>
                {(hasExistingVoucher || appliedVoucher) && (
                    <div className="mt-2 pt-2 border-t border-border">
                        <div className="flex justify-between items-center">
                            <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase">Voucher Applied</span>
                            <span className="text-[8px] font-mono text-emerald-600 dark:text-emerald-400">{hasExistingVoucher ? booking.voucher_applied : appliedVoucher?.code}</span>
                        </div>
                    </div>
                )}
            </div>

            {!hasExistingVoucher && !appliedVoucher && (
                <div className="px-4 pt-4 pb-2 border-b border-border">
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-2">Have a voucher?</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Enter voucher code"
                            value={voucherCode}
                            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                            className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs font-mono uppercase focus:border-primary outline-none"
                        />
                        <button
                            onClick={handleApplyVoucher}
                            disabled={applyingVoucher || !voucherCode.trim()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[9px] font-black uppercase disabled:opacity-50 hover:opacity-90"
                        >
                            {applyingVoucher ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
                        </button>
                    </div>
                </div>
            )}
            {appliedVoucher && !hasExistingVoucher && (
                <div className="px-4 pt-2 pb-2">
                    <button
                        onClick={() => { setAppliedVoucher(null); setVoucherDiscount(0); setCurrentTotal(liveTotalAmount); setVoucherCode(''); }}
                        className="text-[8px] text-rose-600 dark:text-rose-400 hover:text-rose-500"
                    >
                        Remove voucher
                    </button>
                </div>
            )}

            <div className="flex gap-2 p-4">
                <button
                    onClick={() => setMethod('cash')}
                    className={cn(
                        "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border transition-all",
                        method === 'cash'
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-lg"
                            : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                >
                    <Banknote size={13} /> Cash
                </button>
                <button
                    onClick={() => setMethod('qr')}
                    className={cn(
                        "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border transition-all",
                        method === 'qr'
                            ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                            : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                >
                    <QrCode size={13} /> GCash / QR
                </button>
                <button
                    onClick={() => onOpenOnlinePayment && onOpenOnlinePayment({ amount: finalTotal, orderNumber: booking.ticket_number, bookingId: booking._id, spaceId: booking.space_id?._id })}
                    className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border transition-all bg-purple-600/20 border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white"
                >
                    <CreditCard size={13} /> Online
                </button>
            </div>

            {method === 'cash' && (
                <div className="px-4 pb-4 space-y-3">
                    <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase ml-1 mb-1.5 tracking-widest">Cash Received</p>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-lg select-none">₱</span>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                className="w-full bg-background border border-border pl-8 pr-4 py-3 rounded-xl text-foreground font-black text-lg focus:border-primary outline-none"
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
                                : "bg-rose-500/10 border-rose-500/20"
                        )}>
                            <span className={cn(
                                "text-[10px] font-black uppercase flex items-center gap-1.5",
                                cashValid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            )}>
                                {cashValid ? <><BadgeCheck size={11} /> Change</> : <><AlertCircle size={11} /> Short by</>}
                            </span>
                            <span className={cn(
                                "text-xl font-[1000] italic tracking-tighter",
                                cashValid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            )}>
                                ₱{cashValid ? change.toFixed(2) : ((hasExistingVoucher ? currentTotal : finalTotal) - numericReceived).toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>
            )}

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
                                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2"%3E%3C/rect%3E%3Cline x1="3" y1="9" x2="21" y2="9"%3E%3C/line%3E%3C/svg%3E';
                                        }}
                                    />
                                </div>
                            </div>
                            <p className="text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest mb-1">Customer scans to pay</p>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">GCash / QRPh / Maya</p>
                            <div className="mt-2 p-2 bg-blue-500/10 rounded-lg">
                                <p className="text-[8px] text-blue-600 dark:text-blue-400 font-mono">Amount: ₱{(hasExistingVoucher ? currentTotal : finalTotal).toFixed(2)}</p>
                            </div>
                        </>
                    ) : (
                        <div className="py-6">
                            <div className="w-20 h-20 mx-auto bg-muted rounded-2xl flex items-center justify-center mb-3">
                                <QrCode size={40} className="text-muted-foreground" />
                            </div>
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">No QR code available</p>
                            <p className="text-[8px] text-muted-foreground/60 mt-1">Please contact the space owner</p>
                        </div>
                    )}
                </div>
            )}

            <div className="px-4 pb-5">
                <button
                    disabled={isSubmitting || (method === 'cash' && !cashValid) || currentTotal === 0}
                    onClick={() => onComplete({ method, amount_received: numericReceived, voucher_code: appliedVoucher?.code || null, total_amount: currentTotal })}
                    className={cn(
                        "w-full py-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl text-white",
                        method === 'cash' && getButtonColor('cash'),
                        method === 'qr' && getButtonColor('qr'),
                        method === 'online' && getButtonColor('online'),
                        (isSubmitting || (method === 'cash' && !cashValid) || currentTotal === 0) && "opacity-30 cursor-not-allowed"
                    )}
                >
                    {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Processing...</> : <><BadgeCheck size={14} /> Confirm & Complete Session</>}
                </button>
            </div>
        </div>
    );
};

// Receipt Screen Component
export const ReceiptScreen = ({ booking, onClose, reviewQrUrl }) => {
    return (
        <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-foreground font-[1000] italic uppercase tracking-tight text-lg mb-1">Session Closed!</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-5">Payment recorded successfully</p>

            <div className="bg-muted rounded-2xl border border-border divide-y divide-border text-left mb-5">
                <div className="flex justify-between px-4 py-3">
                    <span className="text-[10px] text-muted-foreground font-black uppercase">Ticket</span>
                    <span className="text-[10px] text-foreground font-black italic">#{booking?.ticket_number}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                    <span className="text-[10px] text-muted-foreground font-black uppercase">Guest</span>
                    <span className="text-[10px] text-foreground font-black">{booking?.user_id?.name || booking?.guest_name || 'Guest'}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                    <span className="text-[10px] text-muted-foreground font-black uppercase">Space</span>
                    <span className="text-[10px] text-foreground font-black">{booking?.space_id?.name}</span>
                </div>

                {booking?.voucher_discount > 0 && (
                    <>
                        <div className="flex justify-between px-4 py-3">
                            <span className="text-[10px] text-muted-foreground font-black uppercase">Subtotal</span>
                            <span className="text-[10px] text-muted-foreground line-through">₱{(booking.total_amount + booking.voucher_discount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-3">
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase">Voucher Savings</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">-₱{booking.voucher_discount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-3 bg-muted">
                            <span className="text-[10px] text-muted-foreground font-black uppercase">Voucher Code</span>
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">{booking.voucher_applied}</span>
                        </div>
                    </>
                )}

                <div className="flex justify-between px-4 py-3 bg-muted">
                    <span className="text-[10px] font-black uppercase text-foreground">Total Paid</span>
                    <span className="text-lg font-[1000] italic text-emerald-600 dark:text-emerald-400">₱{(booking?.total_amount || 0).toFixed(2)}</span>
                </div>
            </div>

            <button
                onClick={onClose}
                className="w-full py-3 bg-muted border border-border text-muted-foreground rounded-2xl font-black uppercase text-xs hover:bg-muted/80 transition-all"
            >
                Close
            </button>
        </div>
    );
};