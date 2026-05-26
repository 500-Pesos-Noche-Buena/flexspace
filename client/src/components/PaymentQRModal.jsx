import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Copy, Download, ExternalLink, Loader2, CheckCircle, X, CreditCard, Smartphone, Landmark, Banknote, Wallet } from 'lucide-react';
import { apiGet, apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';

const PaymentQRModal = ({ 
    isOpen, 
    onClose, 
    orderId, 
    orderNumber, 
    amount, 
    paymentLink,
    onPaymentComplete,
    spaceId
}) => {
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);
    const [pollingInterval, setPollingInterval] = useState(null);
    const [isPolling, setIsPolling] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('gcash');
    const [generatedLink, setGeneratedLink] = useState(paymentLink);
    const [isGenerating, setIsGenerating] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loadingMethods, setLoadingMethods] = useState(true);

    // Fetch user's payment methods
    useEffect(() => {
        if (isOpen) {
            fetchPaymentMethods();
        }
    }, [isOpen]);

    const fetchPaymentMethods = async () => {
    setLoadingMethods(true);
    try {
        const res = await apiGet('/space/payment-methods');
        if (res.success && res.data) {
            setPaymentMethods(res.data);
            if (res.data.length > 0) {
                setSelectedMethod(res.data[0].value);
            }
        } else {
            // Use fallback methods
            useFallbackMethods();
        }
    } catch (err) {
        console.error('Failed to fetch payment methods:', err);
        useFallbackMethods();
    } finally {
        setLoadingMethods(false);
    }
};

const useFallbackMethods = () => {
    setPaymentMethods([
        { id: 'gcash', name: 'GCash', value: 'gcash', icon: 'smartphone', color: 'emerald' },
        { id: 'maya', name: 'Maya', value: 'maya', icon: 'smartphone', color: 'blue' },
        { id: 'credit_card', name: 'Credit/Debit Card', value: 'card', icon: 'credit-card', color: 'purple' },
    ]);
    setSelectedMethod('gcash');
};
    // Get icon component based on icon name
    const getIcon = (iconName) => {
        switch(iconName) {
            case 'smartphone': return <Smartphone size={24} />;
            case 'credit-card': return <CreditCard size={24} />;
            case 'landmark': return <Landmark size={24} />;
            case 'wallet': return <Wallet size={24} />;
            case 'banknote': return <Banknote size={24} />;
            default: return <CreditCard size={24} />;
        }
    };

    // Get color classes based on color name
    const getColorClasses = (colorName) => {
        switch(colorName) {
            case 'emerald':
                return {
                    bg: 'bg-emerald-500/20',
                    border: 'border-emerald-500',
                    shadow: 'shadow-emerald-900/20',
                    text: 'text-emerald-400',
                    hover: 'hover:border-emerald-500/50'
                };
            case 'blue':
                return {
                    bg: 'bg-blue-500/20',
                    border: 'border-blue-500',
                    shadow: 'shadow-blue-900/20',
                    text: 'text-blue-400',
                    hover: 'hover:border-blue-500/50'
                };
            case 'purple':
                return {
                    bg: 'bg-purple-500/20',
                    border: 'border-purple-500',
                    shadow: 'shadow-purple-900/20',
                    text: 'text-purple-400',
                    hover: 'hover:border-purple-500/50'
                };
            case 'indigo':
                return {
                    bg: 'bg-indigo-500/20',
                    border: 'border-indigo-500',
                    shadow: 'shadow-indigo-900/20',
                    text: 'text-indigo-400',
                    hover: 'hover:border-indigo-500/50'
                };
            case 'amber':
                return {
                    bg: 'bg-amber-500/20',
                    border: 'border-amber-500',
                    shadow: 'shadow-amber-900/20',
                    text: 'text-amber-400',
                    hover: 'hover:border-amber-500/50'
                };
            default:
                return {
                    bg: 'bg-purple-500/20',
                    border: 'border-purple-500',
                    shadow: 'shadow-purple-900/20',
                    text: 'text-purple-400',
                    hover: 'hover:border-purple-500/50'
                };
        }
    };

  // Update generatePaymentLink to include spaceId
    const generatePaymentLink = async () => {
        setIsGenerating(true);
        try {
            const isBooking = orderNumber && (orderNumber.startsWith('FLX') || orderNumber.startsWith('WK'));
            const endpoint = isBooking ? '/landing/payment/create-link' : '/space/payment/create-link';
            
            const payload = {
                amount: amount,
                order_number: orderNumber,
                customer_name: 'Customer',
                payment_method: selectedMethod === 'credit_card' ? 'card' : selectedMethod
            };
            
            // Add spaceId for bookings
            if (isBooking && spaceId) {
                payload.space_id = spaceId;
            }
            
            const res = await apiPost(endpoint, payload);
            
            if (res.success && res.data.checkout_url) {
                setGeneratedLink(res.data.checkout_url);
                const method = paymentMethods.find(m => m.value === selectedMethod);
                showToast({ icon: 'success', title: `${method?.name || selectedMethod} payment link generated` });
            } else {
                showToast({ icon: 'error', title: res.message || 'Failed to generate payment link' });
            }
        } catch (err) {
            console.error('Failed to generate payment link:', err);
            showToast({ icon: 'error', title: err.message || 'Failed to generate payment link' });
        } finally {
            setIsGenerating(false);
        }
    };

    // Update generated link when paymentLink prop changes
    useEffect(() => {
        if (paymentLink && !generatedLink) {
            setGeneratedLink(paymentLink);
        }
    }, [paymentLink]);

    // Regenerate when method changes and modal is open
    useEffect(() => {
        if (isOpen && orderNumber && amount && selectedMethod) {
            generatePaymentLink();
        }
    }, [selectedMethod, isOpen]);

    // Copy payment link
    const copyPaymentLink = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            showToast({ icon: 'success', title: 'Payment link copied!' });
        }
    };

    // Download QR code
    const downloadQRCode = () => {
        const canvas = document.getElementById('payment-qr-canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `payment-qr-${orderNumber}-${selectedMethod}.png`;
            link.href = canvas.toDataURL();
            link.click();
        }
    };

   // Check payment status - try both endpoints
const checkPaymentStatus = async () => {
    if (!orderNumber) return;
    
    try {
        // First try space orders endpoint
        let res = await apiGet(`/space/orders`);
        if (res.success) {
            const order = res.data.find(o => o.order_number === orderNumber);
            if (order && (order.status === 'confirmed' || order.payment_status === 'paid')) {
                handlePaymentSuccess();
                return;
            }
        }
        
        // Try landing payment status endpoint as fallback
        const fallbackRes = await apiGet(`/landing/payment/status/${orderNumber}`);
        if (fallbackRes.success && (fallbackRes.data.is_paid || fallbackRes.data.status === 'confirmed')) {
            handlePaymentSuccess();
        }
    } catch (err) {
        console.error('Failed to check payment status:', err);
    }
};

const handlePaymentSuccess = () => {
    setPaymentConfirmed(true);
    setIsPolling(false);
    
    if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
    }
    
    if (onPaymentComplete) {
        onPaymentComplete(orderNumber);
    }
    
    setTimeout(() => {
        onClose();
        showToast({ icon: 'success', title: 'Payment confirmed!', text: `Order ${orderNumber} is now being prepared.` });
    }, 2000);
};
    // Start polling when modal opens
    useEffect(() => {
        if (isOpen && orderNumber && generatedLink && !paymentConfirmed) {
            setIsPolling(true);
            const interval = setInterval(checkPaymentStatus, 3000);
            setPollingInterval(interval);
            
            return () => {
                if (interval) clearInterval(interval);
            };
        }
    }, [isOpen, orderNumber, generatedLink]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [pollingInterval]);

    const selectedMethodData = paymentMethods.find(m => m.value === selectedMethod);
    const colorClasses = getColorClasses(selectedMethodData?.color || 'purple');

    return (
        <Modal open={isOpen} onClose={onClose} title="Online Payment" size="md" variant="dark">
            <div className="text-center py-4">
                {!paymentConfirmed ? (
                    <>
                        {/* Payment Method Selection */}
                        <div className="mb-6">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-3">Select Payment Method</p>
                            {loadingMethods ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 size={24} className="animate-spin text-purple-500" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {paymentMethods.map((method) => {
                                        const methodColors = getColorClasses(method.color);
                                        return (
                                            <button
                                                key={method.id}
                                                onClick={() => setSelectedMethod(method.value)}
                                                className={`p-4 rounded-xl border-2 transition-all ${
                                                    selectedMethod === method.value
                                                        ? `${methodColors.bg} ${methodColors.border} shadow-lg ${methodColors.shadow}`
                                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                                }`}
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className={selectedMethod === method.value ? methodColors.text : 'text-slate-400'}>
                                                        {getIcon(method.icon)}
                                                    </div>
                                                    <span className={`text-xs font-bold ${selectedMethod === method.value ? methodColors.text : 'text-white'}`}>
                                                        {method.name}
                                                    </span>
                                                    <span className="text-[8px] text-slate-500">
                                                        {method.value === 'gcash' ? 'Scan to pay' : 
                                                         method.value === 'maya' ? 'Pay with Maya' :
                                                         method.value === 'credit_card' ? 'Visa, Mastercard' :
                                                         method.value === 'bank_transfer' ? 'Direct transfer' :
                                                         method.value === 'paypal' ? 'PayPal account' : 'Pay in cash'}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Loading State */}
                        {isGenerating ? (
                            <div className="py-8">
                                <Loader2 size={40} className="animate-spin text-purple-500 mx-auto mb-4" />
                                <p className="text-sm text-slate-400">Generating payment link...</p>
                            </div>
                        ) : generatedLink && selectedMethod !== 'cash' ? (
                            <>
                                {/* QR Code - Only for online methods */}
                                <div className="mb-4">
                                    <p className={`text-[10px] ${colorClasses.text} font-black uppercase tracking-wider`}>
                                        Scan to Pay with {selectedMethodData?.name}
                                    </p>
                                    <p className="text-[8px] text-slate-500 mb-4">Customer scans QR code with their phone</p>
                                </div>
                                
                                <div className="bg-white p-4 rounded-2xl inline-block mb-4">
                                    <QRCodeSVG
                                        id="payment-qr-canvas"
                                        value={generatedLink}
                                        size={200}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>
                                
                                {/* Amount Display */}
                                <div className={`${colorClasses.bg} rounded-xl p-3 mb-4`}>
                                    <p className={`text-[8px] font-black uppercase ${colorClasses.text}`}>Amount to Pay</p>
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
                                            value={generatedLink}
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
                                            window.open(generatedLink, '_blank');
                                        }}
                                        className="flex-1 py-2 bg-purple-600/20 text-purple-400 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-purple-600 hover:text-white transition-colors"
                                    >
                                        <ExternalLink size={14} /> Open Link
                                    </button>
                                </div>
                                
                                <p className="text-[8px] text-slate-500 mt-4">
                                    Customer scans QR code or opens link to complete payment via {selectedMethodData?.name}
                                </p>
                            </>
                        ) : selectedMethod === 'cash' ? (
                            <div className="py-8">
                                <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                                    <Banknote size={32} className="text-amber-400" />
                                </div>
                                <h3 className="text-white font-black text-lg mb-2">Cash on Pickup</h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    Customer will pay ₱{amount?.toFixed(2)} in cash when picking up the order.
                                </p>
                                <button
                                    onClick={() => {
                                        onClose();
                                        showToast({ icon: 'success', title: 'Cash order placed!', text: `Order ${orderNumber} is now being prepared.` });
                                    }}
                                    className="px-6 py-2 bg-amber-600 rounded-xl text-white text-sm font-bold"
                                >
                                    Confirm Cash Order
                                </button>
                            </div>
                        ) : (
                            <div className="py-8">
                                <p className="text-slate-500 text-sm">Failed to generate payment link</p>
                                <button
                                    onClick={generatePaymentLink}
                                    className="mt-4 px-4 py-2 bg-purple-600 rounded-xl text-white text-xs font-bold"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}
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