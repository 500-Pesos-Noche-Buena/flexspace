import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { QRCodeSVG } from "qrcode.react";
import { Loader2, BadgeCheck, AlertCircle } from 'lucide-react';
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
    
    if (!isOpen) return null;
    
    if (!booking) {
        return (
            <Modal open={isOpen} onClose={onClose} title="Error" size="md">
                <div className="text-center py-8">
                    <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
                    <p className="text-foreground font-bold">Booking data not found</p>
                    <p className="text-muted-foreground text-sm mt-2">The booking information is missing or could not be loaded.</p>
                    <button 
                        onClick={onClose}
                        className="mt-4 px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold"
                    >
                        Close
                    </button>
                </div>
            </Modal>
        );
    }

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
                <ReceiptScreen booking={receiptData || booking} onClose={onClose} reviewQrUrl={reviewQrUrl} />
            ) : (
                <>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest">
                            {booking?.ticket_number || 'N/A'} — {booking?.user_id?.name || booking?.guest_name || 'Guest'}
                        </p>
                        <p className="text-[9px] text-muted-foreground/60 mb-4 uppercase tracking-widest font-bold">
                            {booking?.space_id?.name || 'Unknown Space'}
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
                                isCalculated={showPayment || booking?.status === 'pending_payment'}
                            />
                            {!showPayment && (
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
                            )}
                        </>
                    )}

                    {showPayment && booking?.check_in_at && (
                        <>
                            <LiveBillingTimer
                                checkInAt={booking.check_in_at}
                                checkOutAt={booking.check_out_at}
                                onAmountUpdate={() => {}}
                                booking={booking}
                                isCalculated={true}
                            />
                            <PaymentPanel
                                booking={booking}
                                liveTotalAmount={liveAmount || booking?.total_amount || 0}
                                onComplete={onPaymentComplete}
                                isSubmitting={isSubmitting}
                                onApplyVoucher={onApplyVoucher}
                                onOpenOnlinePayment={onOpenOnlinePayment}
                            />
                        </>
                    )}

                    {/* Fallback for empty state */}
                    {!isActive && !showPayment && booking?.status !== 'confirmed' && (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground text-sm">No active session or pending payment</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">Status: {booking?.status || 'Unknown'}</p>
                            <button 
                                onClick={onClose}
                                className="mt-4 px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </>
            )}
        </Modal>
    );
};