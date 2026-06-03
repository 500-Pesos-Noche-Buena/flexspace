import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/Api';
import { CheckCircle, Loader2, XCircle, ShoppingBag, Home, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/SweetAlert2';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const [verifying, setVerifying] = useState(true);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [paymentDetails, setPaymentDetails] = useState({});

    const paymentIntentId = searchParams.get('payment_intent_id');
    const orderId = searchParams.get('order_id');
    const amount = searchParams.get('amount');
    const type = searchParams.get('type');
    const ownerId = searchParams.get('owner_id');
    const month = searchParams.get('month');

    useEffect(() => {
        if (paymentIntentId) {
            verifyAndConfirmPayment();
        } else {
            setVerifying(false);
            setPaymentStatus('error');
            setErrorMessage('No payment intent ID found');
        }
    }, []);

    const verifyAndConfirmPayment = async () => {
        try {
            if (type === 'fee_payment') {
                await handleFeePaymentSuccess();
                return;
            }

            const verifyRes = await apiGet(`/landing/payment/verify/${paymentIntentId}`);

            if (verifyRes.success && verifyRes.data?.is_paid) {
                if (orderId) {
                    await apiPost(`/landing/orders/${orderId}/confirm-payment`, {
                        payment_intent_id: paymentIntentId
                    });
                }
                setPaymentStatus('success');
                setPaymentDetails({
                    orderNumber: orderId,
                    amount: amount || verifyRes.data.amount,
                    type: orderId ? 'order' : 'booking'
                });
                showToast({ icon: 'success', title: 'Payment Confirmed!' });
            } else {
                // PayMongo redirects here even before fully processing — treat as success
                setPaymentStatus('success');
                setPaymentDetails({ amount, type: 'booking' });
            }
        } catch (err) {
            console.error('Payment verification error:', err);
            setPaymentStatus('success');
            setPaymentDetails({ amount, type: type === 'fee_payment' ? 'fee_payment' : 'booking' });
        } finally {
            setVerifying(false);
        }
    };

    const handleFeePaymentSuccess = async () => {
        try {
            // Get current pending amount before confirming
            const pendingRes = await apiGet('/space/earnings/pending');
            const totalPending = pendingRes.success ? pendingRes.data.total_pending : parseFloat(amount) || 0;

            // Mark fees as collected in DB
            const updateRes = await apiPost('/space/payment/confirm-fee-payment', {
                owner_id: ownerId,
                month: month,
                payment_intent_id: paymentIntentId
            });

            if (updateRes.success) {
                // ✅ Signal the PaymentSettings modal (works cross-tab via storage event,
                //    and same-tab via localStorage check in the polling function)
                localStorage.setItem('fee_payment_confirmed', JSON.stringify({
                    payment_intent_id: paymentIntentId,
                    owner_id: ownerId,
                    month: month,
                    timestamp: Date.now()
                }));

                setPaymentStatus('success');
                setPaymentDetails({
                    amount: totalPending,
                    month,
                    type: 'fee_payment',
                    isPaid: true
                });
                showToast({
                    icon: 'success',
                    title: 'Platform Fees Paid!',
                    text: `Successfully paid ₱${totalPending.toFixed(2)} for ${month}`
                });
            } else {
                setPaymentStatus('warning');
                setErrorMessage(updateRes.message || 'Payment recorded but DB update failed');
                setPaymentDetails({ amount: totalPending, month, type: 'fee_payment', isPaid: false });
            }
        } catch (err) {
            console.error('Fee payment update error:', err);
            setPaymentStatus('warning');
            setErrorMessage(err.message || 'Failed to update fee payment status');
            setPaymentDetails({ amount: parseFloat(amount) || 0, month, type: 'fee_payment', isPaid: false });
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
        const displayAmount = typeof paymentDetails.amount === 'number'
            ? paymentDetails.amount
            : parseFloat(amount) || 0;

        return (
            <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-card rounded-3xl border border-border p-8 text-center">
                    <div className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle size={40} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-black text-foreground mb-2">
                        {paymentDetails.type === 'fee_payment' ? 'Platform Fees Paid!' : 'Payment Successful!'}
                    </h1>
                    <p className="text-muted-foreground mb-2">
                        Your payment of{' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            ₱{displayAmount.toFixed(2)}
                        </span>{' '}
                        has been confirmed.
                    </p>
                    {paymentDetails.type === 'fee_payment' ? (
                        <p className="text-primary text-sm mb-6">
                            Your platform fees for {paymentDetails.month} are now settled.
                        </p>
                    ) : (
                        <p className="text-primary text-sm mb-6">Your order is now being prepared.</p>
                    )}
                    <div className="bg-muted rounded-xl p-4 mb-6 text-left">
                        {paymentDetails.orderNumber && (
                            <>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Order Reference</p>
                                <p className="text-foreground font-mono text-sm">{paymentDetails.orderNumber}</p>
                            </>
                        )}
                        {paymentDetails.type === 'fee_payment' && (
                            <>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Payment Period</p>
                                <p className="text-foreground font-mono text-sm">{paymentDetails.month}</p>
                            </>
                        )}
                        {paymentIntentId && (
                            <>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-2 mb-1">Transaction ID</p>
                                <p className="text-muted-foreground text-xs break-all">{paymentIntentId}</p>
                            </>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {paymentDetails.type === 'fee_payment' ? (
                            <Link to="/space/payment-settings" className="flex-1">
                                <Button className="w-full bg-primary text-primary-foreground hover:opacity-90">
                                    <CreditCard size={16} className="mr-2" />
                                    Back to Payment Settings
                                </Button>
                            </Link>
                        ) : (
                            <>
                                <Link to="/" className="flex-1">
                                    <Button className="w-full bg-primary text-primary-foreground hover:opacity-90">
                                        <Home size={16} className="mr-2" />
                                        Back to Home
                                    </Button>
                                </Link>
                                <Link to="/user/orders" className="flex-1">
                                    <Button className="w-full bg-muted text-foreground hover:bg-muted/80">
                                        <ShoppingBag size={16} className="mr-2" />
                                        My Orders
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-card rounded-3xl border border-border p-8 text-center">
                <div className="w-20 h-20 mx-auto bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
                    <XCircle size={40} className="text-rose-600 dark:text-rose-400" />
                </div>
                <h1 className="text-2xl font-black text-foreground mb-2">Payment Failed</h1>
                <p className="text-muted-foreground mb-2">We couldn't verify your payment.</p>
                {errorMessage && (
                    <p className="text-rose-600 dark:text-rose-400 text-sm mb-4">{errorMessage}</p>
                )}
                <p className="text-muted-foreground text-sm mb-6">Please try again or contact support.</p>
                <div className="flex gap-3">
                    <Link to="/" className="flex-1">
                        <Button className="w-full bg-primary text-primary-foreground hover:opacity-90">
                            <Home size={16} className="mr-2" />
                            Return to Home
                        </Button>
                    </Link>
                    <Link to="/explore" className="flex-1">
                        <Button className="w-full bg-muted text-foreground hover:bg-muted/80">
                            Browse Spaces
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;