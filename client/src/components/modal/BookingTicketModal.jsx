import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { QRCodeSVG } from "qrcode.react";
import { Loader2, BadgeCheck } from 'lucide-react';
import { LiveBillingTimer, PaymentPanel, ReceiptScreen } from './BookingModalComponents';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

export const BookingTicketModal = ({ 
    isOpen, 
    onClose, 
    booking, 
    showReceipt, 
    receiptData,
    isActive,
    showPayment,
    liveAmount,
    isCalculating,
    isSubmitting,
    reviewQrUrl,
    onCalculate,
    onPaymentComplete,
    onApplyVoucher,
    onOpenOnlinePayment,
    setLiveAmount
}) => {
    const { themeColor } = useTheme();
    
    if (!booking) return null;

    const getButtonHoverColor = () => {
        const colors = {
            indigo: 'hover:bg-indigo-600',
            emerald: 'hover:bg-emerald-600',
            purple: 'hover:bg-purple-600',
            blue: 'hover:bg-blue-600',
            rose: 'hover:bg-rose-600',
            amber: 'hover:bg-amber-600',
        };
        return colors[themeColor] || colors.indigo;
    };

    return (
        <Modal open={isOpen} onClose={onClose} title="Entry Ticket" size="xl">
            {showReceipt ? (
                <ReceiptScreen booking={receiptData} onClose={onClose} reviewQrUrl={reviewQrUrl} />
            ) : (
                <>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest">
                            {booking?.ticket_number} — {booking?.user_id?.name || booking?.guest_name || 'Guest'}
                        </p>
                        <p className="text-[9px] text-muted-foreground/60 mb-4 uppercase tracking-widest font-bold">
                            {booking?.space_id?.name}
                        </p>
                    </div>

                    {!showPayment && booking?.booking_type !== 'walkin' && booking?.qr_code_token && (
                        <div className="bg-white dark:bg-white p-5 rounded-4xl mb-4 shadow-xl flex justify-center mx-auto" style={{ width: 'fit-content' }}>
                            <QRCodeSVG value={booking.qr_code_token} size={180} level="H" includeMargin={false} />
                        </div>
                    )}

                    {booking?.status === 'confirmed' && !showPayment && (
                        <>
                            <p className="text-[10px] text-primary font-black uppercase tracking-tighter animate-pulse mt-2 text-center">
                                Waiting for scan to check-in...
                            </p>
                            <p className="text-[8px] text-muted-foreground text-center mt-1">
                                Customer needs to scan this QR code at the hub
                            </p>
                        </>
                    )}

                    {isActive && booking?.check_in_at && (
                        <>
                            <LiveBillingTimer
                                checkInAt={booking.check_in_at}
                                checkOutAt={booking.check_out_at}
                                onAmountUpdate={setLiveAmount}
                                booking={booking}
                            />
                            <button
                                onClick={onCalculate}
                                disabled={isCalculating}
                                className={cn(
                                    "w-full mt-5 py-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-40",
                                    "bg-primary text-primary-foreground",
                                    getButtonHoverColor()
                                )}
                            >
                                {isCalculating
                                    ? <><Loader2 size={14} className="animate-spin" /> Calculating...</>
                                    : <><BadgeCheck size={14} /> Close Session & Calculate Bill</>}
                            </button>
                        </>
                    )}

                    {showPayment && booking?.check_in_at && (
                        <>
                            <LiveBillingTimer
                                checkInAt={booking.check_in_at}
                                checkOutAt={booking.check_out_at}
                                onAmountUpdate={() => {}}
                                booking={booking}
                            />
                            <PaymentPanel
                                booking={booking}
                                liveTotalAmount={liveAmount}
                                onComplete={onPaymentComplete}
                                isSubmitting={isSubmitting}
                                onApplyVoucher={onApplyVoucher}
                                onOpenOnlinePayment={onOpenOnlinePayment}
                            />
                        </>
                    )}
                </>
            )}
        </Modal>
    );
};