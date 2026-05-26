import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Copy, Download, ExternalLink, Loader2, CheckCircle, X } from 'lucide-react';
import { apiGet, apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';

const PaymentQRModal = ({ 
    isOpen, 
    onClose, 
    orderId, 
    orderNumber, 
    amount, 
    paymentLink,
    onPaymentComplete 
}) => {
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);
    const [pollingInterval, setPollingInterval] = useState(null);
    const [isPolling, setIsPolling] = useState(false);

    // Copy payment link
    const copyPaymentLink = () => {
        navigator.clipboard.writeText(paymentLink);
        showToast({ icon: 'success', title: 'Payment link copied!' });
    };

    // Download QR code
    const downloadQRCode = () => {
        const canvas = document.getElementById('payment-qr-canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `payment-qr-${orderNumber}.png`;
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    // Check payment status - check if order status is 'confirmed' (paid)
    const checkPaymentStatus = async () => {
        if (!orderNumber) return;
        
        try {
            // Get order status to check if payment is confirmed
            const res = await apiGet(`/space/orders`);
            if (res.success) {
                const order = res.data.find(o => o.order_number === orderNumber);
                if (order && (order.status === 'confirmed' || order.payment_status === 'paid')) {
                    // Payment confirmed!
                    setPaymentConfirmed(true);
                    setIsPolling(false);
                    
                    // Stop polling
                    if (pollingInterval) {
                        clearInterval(pollingInterval);
                        setPollingInterval(null);
                    }
                    
                    // Callback to parent
                    if (onPaymentComplete) {
                        onPaymentComplete(orderNumber);
                    }
                    
                    // Auto close after 2 seconds
                    setTimeout(() => {
                        onClose();
                        showToast({ icon: 'success', title: 'Payment confirmed!', text: `Order ${orderNumber} is now being prepared.` });
                    }, 2000);
                }
            }
        } catch (err) {
            console.error('Failed to check payment status:', err);
        }
    };

    // Start polling when modal opens
    useEffect(() => {
        if (isOpen && orderNumber && paymentLink && !paymentConfirmed) {
            setIsPolling(true);
            const interval = setInterval(checkPaymentStatus, 3000);
            setPollingInterval(interval);
            
            return () => {
                if (interval) clearInterval(interval);
            };
        }
    }, [isOpen, orderNumber, paymentLink]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [pollingInterval]);

    return (
        <Modal open={isOpen} onClose={onClose} title="Payment QR Code" size="md" variant="dark">
            <div className="text-center py-4">
                {!paymentConfirmed ? (
                    <>
                        <div className="mb-4">
                            <p className="text-[10px] text-purple-400 font-black uppercase tracking-wider">Scan to Pay</p>
                            <p className="text-xs text-slate-400 mb-4">Customer scans QR code with their phone to pay</p>
                        </div>
                        
                        {/* QR Code */}
                        <div className="bg-white p-4 rounded-2xl inline-block mb-4">
                            <QRCodeSVG
                                id="payment-qr-canvas"
                                value={paymentLink}
                                size={200}
                                level="H"
                                includeMargin={true}
                            />
                        </div>
                        
                        {/* Amount Display */}
                        <div className="bg-purple-500/10 rounded-xl p-3 mb-4">
                            <p className="text-[8px] text-purple-400 font-black uppercase">Amount to Pay</p>
                            <p className="text-xl font-black text-white">₱{amount?.toFixed(2)}</p>
                        </div>
                        
                        {/* Order Reference */}
                        <div className="bg-white/5 rounded-xl p-3 mb-4">
                            <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Order Reference</p>
                            <p className="text-white font-mono text-xs">{orderNumber}</p>
                        </div>
                        
                        {/* Waiting for payment indicator */}
                        {isPolling && (
                            <div className="bg-amber-500/10 rounded-xl p-3 mb-4 flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin text-amber-400" />
                                <p className="text-[8px] text-amber-400 font-black uppercase">Waiting for payment confirmation...</p>
                            </div>
                        )}
                        
                        {/* Payment Link (as backup) */}
                        <div className="bg-white/5 rounded-xl p-3 mb-4">
                            <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Payment Link (Backup)</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={paymentLink}
                                    readOnly
                                    className="flex-1 px-3 py-2 bg-black/50 rounded-lg text-white text-xs font-mono truncate"
                                />
                                <button
                                    onClick={copyPaymentLink}
                                    className="p-2 bg-purple-600/20 hover:bg-purple-600 rounded-lg transition-colors"
                                >
                                    <Copy size={16} className="text-purple-400" />
                                </button>
                            </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={downloadQRCode}
                                className="flex-1 py-2 bg-indigo-600/20 text-indigo-400 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-colors"
                            >
                                <Download size={14} /> Download QR
                            </button>
                            <button
                                onClick={() => {
                                    window.open(paymentLink, '_blank');
                                }}
                                className="flex-1 py-2 bg-purple-600/20 text-purple-400 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-purple-600 hover:text-white transition-colors"
                            >
                                <ExternalLink size={14} /> Open Link
                            </button>
                        </div>
                        
                        <p className="text-[8px] text-slate-500 mt-4">
                            Customer scans QR code to complete payment via PayMongo (GCash, PayMaya, Card)
                        </p>
                    </>
                ) : (
                    <div className="py-8">
                        <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={32} className="text-emerald-400" />
                        </div>
                        <h3 className="text-white font-black text-lg mb-2">Payment Confirmed!</h3>
                        <p className="text-slate-400 text-sm mb-4">
                            Payment of ₱{amount?.toFixed(2)} has been confirmed.
                        </p>
                        <p className="text-[10px] text-emerald-400">
                            Order #{orderNumber} is now being prepared.
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default PaymentQRModal;