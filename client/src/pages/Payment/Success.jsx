import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/Api';
import { CheckCircle, Loader2, XCircle, ShoppingBag, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/SweetAlert2';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const [verifying, setVerifying] = useState(true);
    const [paymentStatus, setPaymentStatus] = useState(null);

    const paymentIntentId = searchParams.get('payment_intent_id');
    const orderId = searchParams.get('order_id');
    const amount = searchParams.get('amount');

    useEffect(() => {
        if (paymentIntentId) {
            verifyAndConfirmPayment();
        } else {
            setVerifying(false);
            setPaymentStatus('error');
        }
    }, [paymentIntentId]);

    const verifyAndConfirmPayment = async () => {
        try {
            // Use PUBLIC verification endpoint
            const verifyRes = await apiGet(`/landing/payment/verify/${paymentIntentId}`);
            
            if (verifyRes.success && verifyRes.data.is_paid) {
                // Use PUBLIC order confirmation endpoint
                if (orderId) {
                    const updateRes = await apiPost(`/landing/orders/${orderId}/confirm-payment`, {
                        payment_intent_id: paymentIntentId
                    });
                    
                    if (updateRes.success) {
                        setPaymentStatus('success');
                        showToast({ 
                            icon: 'success', 
                            title: 'Payment Confirmed!', 
                            text: 'Your order is now being prepared.' 
                        });
                    } else {
                        setPaymentStatus('warning');
                    }
                } else {
                    setPaymentStatus('success');
                }
            } else {
                setPaymentStatus('failed');
            }
        } catch (err) {
            console.error('Payment verification error:', err);
            setPaymentStatus('error');
        } finally {
            setVerifying(false);
        }
    };

    if (verifying) {
        return (
            <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={48} className="animate-spin text-indigo-500 mx-auto mb-4" />
                    <h2 className="text-white font-black text-xl mb-2">Verifying Payment</h2>
                    <p className="text-slate-400">Please wait while we confirm your payment...</p>
                </div>
            </div>
        );
    }

    if (paymentStatus === 'success') {
        return (
            <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#111114] rounded-3xl border border-white/10 p-8 text-center">
                    <div className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle size={40} className="text-emerald-500" />
                    </div>
                    
                    <h1 className="text-2xl font-black text-white mb-2">Payment Successful!</h1>
                    <p className="text-slate-400 mb-2">
                        Your payment of <span className="text-emerald-400 font-bold">₱{amount}</span> has been confirmed.
                    </p>
                    <p className="text-emerald-400 text-sm mb-6">Your order is now being prepared.</p>
                    
                    {orderId && (
                        <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Order Reference</p>
                            <p className="text-white font-mono text-sm">{orderId}</p>
                            {paymentIntentId && (
                                <>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-2 mb-1">Transaction ID</p>
                                    <p className="text-slate-400 text-xs break-all">{paymentIntentId}</p>
                                </>
                            )}
                        </div>
                    )}
                    
                    <div className="flex gap-3">
                        <Link to="/" className="flex-1">
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-500">
                                <Home size={16} className="mr-2" />
                                Back to Home
                            </Button>
                        </Link>
                        <Link to="/dashboard" className="flex-1">
                            <Button className="w-full bg-white/5 hover:bg-white/10 text-white">
                                <ShoppingBag size={16} className="mr-2" />
                                My Orders
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#111114] rounded-3xl border border-white/10 p-8 text-center">
                <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                    <XCircle size={40} className="text-red-500" />
                </div>
                
                <h1 className="text-2xl font-black text-white mb-2">Payment Failed</h1>
                <p className="text-slate-400 mb-6">
                    We couldn't verify your payment. Please try again or contact support.
                </p>
                
                <div className="flex gap-3">
                    <Link to="/" className="flex-1">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-500">
                            Return to Home
                        </Button>
                    </Link>
                    <Link to="/explore" className="flex-1">
                        <Button className="w-full bg-white/5 hover:bg-white/10 text-white">
                            Browse Spaces
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;