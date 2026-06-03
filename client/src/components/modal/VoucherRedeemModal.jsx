import React, { useState } from 'react';
import { XCircle, Ticket, Coins, Loader2 } from 'lucide-react';
import { apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';

export const VoucherRedeemModal = ({ booking, userPoints, onClose, onSuccess }) => {
    const [voucherCode, setVoucherCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [step, setStep] = useState('input');

    const handlePreviewVoucher = async () => {
        if (!voucherCode.trim()) {
            showToast({ icon: 'warning', title: 'Please enter a voucher code' });
            return;
        }

        setLoading(true);
        try {
            const res = await apiPost(`/user/bookings/${booking._id}/preview-voucher`, {
                voucherCode: voucherCode.trim().toUpperCase()
            });

            if (res.success) {
                setPreviewData(res.data);
                setStep('preview');
                showToast({ icon: 'success', title: `Voucher valid! Save ₱${res.data.discount_amount}` });
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Invalid voucher code' });
        } finally {
            setLoading(false);
        }
    };

    const handleRedeemVoucher = async () => {
        setLoading(true);
        try {
            const res = await apiPost(`/user/bookings/${booking._id}/redeem-voucher`, {
                voucherCode: voucherCode.trim().toUpperCase()
            });

            if (res.success) {
                showToast({
                    icon: 'success',
                    title: `Voucher redeemed! ₱${previewData.discount_amount} saved`
                });
                onSuccess();
                onClose();
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Failed to redeem voucher' });
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep('input');
        setPreviewData(null);
        setVoucherCode('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl sm:rounded-[3rem] p-5 sm:p-8 max-w-md w-full relative shadow-2xl mx-4">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-300 hover:text-slate-900 transition-colors z-10"
                >
                    <XCircle size={22} className="sm:w-6 sm:h-6" />
                </button>

                <div className="text-center mb-4 sm:mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 mb-3 sm:mb-4">
                        <Ticket size={24} className="text-white sm:w-8 sm:h-8" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-[1000] italic uppercase tracking-tight">Redeem Voucher</h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                        Booking: {booking.ticket_number}
                    </p>

                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                        <Coins size={12} className="text-amber-600" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-700">
                            Your Points: {userPoints || 0}
                        </span>
                    </div>
                </div>

                {step === 'input' ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                Enter Voucher Code
                            </label>
                            <input
                                type="text"
                                value={voucherCode}
                                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                placeholder="e.g., FLEX-XXXX-XXXX"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl sm:rounded-2xl text-sm font-mono uppercase focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>

                        <button
                            onClick={handlePreviewVoucher}
                            disabled={loading || !voucherCode.trim()}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all hover:bg-indigo-700 disabled:opacity-50 active:scale-95"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Preview Discount'}
                        </button>

                        <p className="text-[8px] sm:text-[9px] text-slate-400 text-center">
                            Enter the voucher code you received from exchanging points
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-linear-to-r from-emerald-50 to-green-50 p-4 rounded-xl sm:rounded-2xl border border-emerald-200">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-600">Subtotal</span>
                                <span className="text-xs sm:text-sm font-bold">₱{previewData.sub_total?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-emerald-200">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-600">Voucher Discount</span>
                                <span className="text-xs sm:text-sm font-bold text-emerald-600">-₱{previewData.discount_amount?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-[11px] sm:text-xs font-black uppercase text-slate-900">Final Amount</span>
                                <span className="text-lg sm:text-xl font-[1000] italic text-emerald-700">₱{previewData.total_amount?.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleBack}
                                disabled={loading}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-200"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleRedeemVoucher}
                                disabled={loading}
                                className="flex-1 py-3 bg-linear-to-r from-emerald-600 to-green-600 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Confirm & Redeem'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
