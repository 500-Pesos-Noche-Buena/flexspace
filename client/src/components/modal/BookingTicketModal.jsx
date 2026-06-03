import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { QRCodeSVG } from "qrcode.react";
import { Loader2, BadgeCheck } from 'lucide-react';
import { LiveBillingTimer, PaymentPanel, ReceiptScreen } from './BookingModalComponents';

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
    if (!booking) return null;

    return (
        <Modal open={isOpen} onClose={onClose} title="Entry Ticket" size="xl" variant="dark">
            {showReceipt ? (
                <ReceiptScreen booking={receiptData} onClose={onClose} reviewQrUrl={reviewQrUrl} />
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

                    {!showPayment && booking?.booking_type !== 'walkin' && booking?.qr_code_token && (
                        <div className="bg-white p-5 rounded-4xl mb-4 shadow-xl flex justify-center mx-auto" style={{ width: 'fit-content' }}>
                            <QRCodeSVG value={booking.qr_code_token} size={180} level="H" includeMargin={false} />
                        </div>
                    )}

                    {booking?.status === 'confirmed' && !showPayment && (
                        <>
                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-tighter animate-pulse mt-2 text-center">
                                Waiting for scan to check-in...
                            </p>
                            <p className="text-[8px] text-slate-500 text-center mt-1">
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
                                className="w-full mt-5 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-xl shadow-orange-900/20 flex items-center justify-center gap-2 disabled:opacity-40"
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