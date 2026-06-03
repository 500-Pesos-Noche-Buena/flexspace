import React, { useState, useEffect, useRef } from 'react';
import { apiPost, apiGet } from '@/utils/Api';
import {
    CreditCard, Key, Eye, EyeOff, Loader2, CheckCircle,
    AlertCircle, ExternalLink, Copy, Check, Shield,
    Lock, Info, Link2, DollarSign
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { useTheme } from '@/hooks/useTheme';
import { Modal } from '@/components/ui/Modal';
import { QRCodeSVG } from 'qrcode.react';

const PaymentSettings = () => {
    const { themeColor } = useTheme();

    const [paymongoKey, setPaymongoKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [hasKey, setHasKey] = useState(false);
    const [hasPayBridgeKey, setHasPayBridgeKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [preGeneratedLink, setPreGeneratedLink] = useState(null);


    const [showFeeModal, setShowFeeModal] = useState(false);
    const [pendingFees, setPendingFees] = useState({ total: 0, month: '', hasPending: false });
    const [generatingLink, setGeneratingLink] = useState(false);
    const [paymentLink, setPaymentLink] = useState('');
    const [feeDetails, setFeeDetails] = useState(null);
    const [feeLoading, setFeeLoading] = useState(false);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);
    const [isPolling, setIsPolling] = useState(false);

    const pollingIntervalRef = useRef(null);
    const paymentIntentIdRef = useRef(null);
    const ownerIdRef = useRef(null);
    const monthRef = useRef(null);

    // ✅ Single useEffect — no duplicate calls
    useEffect(() => {
        checkKeyStatus();
        checkPendingFees();

        // Listen for success page signal from another tab
        const handleStorageChange = (e) => {
            if (e.key === 'fee_payment_confirmed') {
                localStorage.removeItem('fee_payment_confirmed');
                handlePaymentSuccess();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (pendingFees.hasPending && !paymentLink) {
            // Start generating in background
            const pregeneratePayment = async () => {
                try {
                    const res = await apiPost('/space/earnings/pay-platform-fees', {
                        amount: pendingFees.total,
                        month: pendingFees.month
                    });
                    if (res.success) {
                        setPreGeneratedLink(res.data);
                    }
                } catch (err) {
                    console.error('Pre-generation failed:', err);
                }
            };
            pregeneratePayment();
        }
    }, [pendingFees.hasPending]);

    const checkKeyStatus = async () => {
        try {
            const res = await apiGet('/space/payment/key-status');
            if (res.success) {
                setHasKey(res.data.has_paymongo_key);
                setHasPayBridgeKey(!!res.data.has_paybridge_key);
            }
        } catch (err) {
            console.error('Failed to check key status:', err);
        } finally {
            setLoading(false);
        }
    };

    const checkPendingFees = async () => {
        setFeeLoading(true);
        try {
            const res = await apiGet('/space/earnings/pending');
            if (res.success && res.data) {
                setPendingFees({
                    total: res.data.total_pending || 0,
                    month: res.data.month || '',
                    hasPending: (res.data.total_pending || 0) > 0,
                    details: res.data.details || []
                });
            }
        } catch (err) {
            console.error('Failed to check pending fees:', err);
        } finally {
            setFeeLoading(false);
        }
    };

    // ✅ Defined before checkFeePaymentStatus so it's available (regular function, not arrow)
    const handlePaymentSuccess = () => {
        setPaymentConfirmed(true);
        setIsPolling(false);

        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        checkPendingFees();

        setTimeout(() => {
            setShowFeeModal(false);
            setPaymentConfirmed(false);
            setPaymentLink('');
            setFeeDetails(null);
            paymentIntentIdRef.current = null;
            ownerIdRef.current = null;
            monthRef.current = null;
            showToast({
                icon: 'success',
                title: 'Payment confirmed!',
                text: 'Your platform fees have been paid successfully.'
            });
        }, 2000);
    };

    const checkFeePaymentStatus = async () => {
        // ✅ Same-tab localStorage check (storage event only fires in OTHER tabs)
        const stored = localStorage.getItem('fee_payment_confirmed');
        if (stored) {
            localStorage.removeItem('fee_payment_confirmed');
            handlePaymentSuccess();
            return;
        }

        const paymentIntentId = paymentIntentIdRef.current;
        const ownerId = ownerIdRef.current;
        const month = monthRef.current;
        if (!paymentIntentId) return;

        try {
            const statusRes = await apiGet(
                `/space/payment/check-status/${paymentIntentId}?owner_id=${ownerId}&month=${month}`
            );
            if (statusRes.success && statusRes.data?.is_paid === true) {
                handlePaymentSuccess();
            }
        } catch (err) {
            console.error('Failed to check payment status:', err);
        }
    };

    const handlePayPlatformFees = async () => {
        setShowFeeModal(true);

        if (preGeneratedLink) {
            setPaymentLink(preGeneratedLink.checkout_url);
            setFeeDetails(preGeneratedLink);
            startPolling(preGeneratedLink.payment_intent_id);
            return;
        }

        setGeneratingLink(true);

        try {
            const res = await apiPost('/space/earnings/pay-platform-fees', {
                amount: pendingFees.total,
                month: pendingFees.month
            });

            if (res.success && res.data.checkout_url) {
                setPaymentLink(res.data.checkout_url);
                setFeeDetails(res.data);
                paymentIntentIdRef.current = res.data.payment_intent_id;
                ownerIdRef.current = res.data.owner_id;   // store if returned
                monthRef.current = pendingFees.month;
                startPolling(res.data.payment_intent_id);
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                showToast({ icon: 'error', title: 'Request timeout', text: 'Server is taking too long to respond.' });
            } else {
                showToast({ icon: 'error', title: err.message || 'Failed to generate payment link' });
            }
            setShowFeeModal(false);
        } finally {
            setGeneratingLink(false);  // ← was missing from pre-generated branch
        }
    };

    const startPolling = (intentId) => {
        paymentIntentIdRef.current = intentId;
        monthRef.current = pendingFees.month;
        setIsPolling(true);

        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

        pollingIntervalRef.current = setInterval(() => {
            checkFeePaymentStatus();
        }, 5000); // poll every 5s
    };

    const handleCloseModal = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        setIsPolling(false);
        setPaymentConfirmed(false);
        setShowFeeModal(false);
        setPaymentLink('');
        setFeeDetails(null);
        setPreGeneratedLink(null);  // ← clear so next open re-generates if needed
    };

    const handleSavePayMongoKey = async () => {
        if (!paymongoKey.trim()) {
            showToast({ icon: 'warning', title: 'Please enter your PayMongo secret key' });
            return;
        }
        if (!paymongoKey.trim().startsWith('sk_')) {
            showToast({ icon: 'warning', title: 'Invalid key format', text: 'PayMongo secret key should start with "sk_"' });
            return;
        }
        setSaving(true);
        try {
            await apiPost('/space/payment/keys/paymongo', { secret_key: paymongoKey.trim() });
            setSaved(true);
            setHasKey(true);
            showToast({ icon: 'success', title: 'Payment key saved and encrypted successfully!' });
            setTimeout(() => setSaved(false), 3000);
            setPaymongoKey('');
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Failed to save payment key' });
        } finally {
            setSaving(false);
        }
    };

    const copyExampleKey = () => {
        showToast({ icon: 'info', title: 'Get your key', text: 'Go to PayMongo Dashboard → Settings → Developers' });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getColorClasses = (color) => {
        const colors = {
            indigo: 'from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400',
            emerald: 'from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400',
            purple: 'from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400',
            blue: 'from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400',
            rose: 'from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400',
            amber: 'from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400',
        };
        return colors[color] || colors.indigo;
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 size={32} className="animate-spin" style={{ color: `var(--theme-primary)` }} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 md:px-0 pb-10">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-foreground italic uppercase tracking-tighter">Payment Configuration</h1>
                <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest italic">
                    Connect your PayMongo account to accept online payments.
                </p>
            </div>

            {!feeLoading && pendingFees.hasPending && (
                <Card className="bg-amber-500/5 dark:bg-amber-500/5 border-amber-500/30 mb-6">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between flex-wrap gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                                    <DollarSign size={18} className="text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-black text-foreground">Platform Fees Due</p>
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mt-0.5">
                                        Pending payment for {pendingFees.month}
                                    </p>
                                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                                        ₱{pendingFees.total.toFixed(2)}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground mt-1">
                                        Please pay your platform fees to continue using all features
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handlePayPlatformFees}
                                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                            >
                                <CreditCard size={14} />
                                Pay Platform Fees Now
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!hasPayBridgeKey && (
                <Card className="bg-blue-500/10 dark:bg-blue-500/10 border-blue-500/30 mb-6">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                                <Link2 size={18} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-foreground">PayBridge Integration Active</p>
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mt-0.5">
                                    Payment gateway is ready for online payments
                                </p>
                                <p className="text-[9px] text-muted-foreground mt-2">
                                    Your payments are processed securely through PayBridge. Just add your PayMongo secret key below to start accepting payments.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {hasKey && (
                <Card className="bg-emerald-500/5 dark:bg-emerald-500/5 border-emerald-500/20 mb-6">
                    <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-foreground">PayMongo Connected</p>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                                    Your payment gateway is ready to accept online payments
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase">Live</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-card border-border overflow-hidden shadow-xl">
                <div className="p-6 border-b border-border bg-linear-to-r from-primary/5 to-purple-500/5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                            <CreditCard size={28} style={{ color: `var(--theme-primary)` }} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-foreground">PayMongo Integration</h2>
                            <p className="text-muted-foreground text-sm">Accept GCash, PayMaya, GrabPay, and Credit Card payments</p>
                        </div>
                    </div>
                </div>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Key size={12} /> PayMongo Secret Key
                            </label>
                            <div className="relative mt-2">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={paymongoKey}
                                    onChange={(e) => setPaymongoKey(e.target.value)}
                                    placeholder="Enter your PayMongo secret key"
                                    className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:border-primary outline-none font-mono text-sm pr-12 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <button onClick={copyExampleKey} className="text-[8px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                                    {copied ? <Check size={10} /> : <Copy size={10} />}
                                    How to get your key
                                </button>
                                <span className="text-[8px] text-muted-foreground">•</span>
                                <span className="text-[8px] text-muted-foreground">Starts with <code className="text-primary">sk_</code></span>
                            </div>
                        </div>

                        <Button
                            onClick={handleSavePayMongoKey}
                            disabled={saving || !paymongoKey}
                            className={cn(
                                "w-full text-white rounded-xl py-3 font-bold transition-all duration-300 bg-linear-to-r",
                                getColorClasses(themeColor),
                                saving && "opacity-70"
                            )}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Shield size={16} className="mr-2" />}
                            {saving ? 'Encrypting & Saving...' : hasKey ? 'Update PayMongo Key' : 'Save & Encrypt PayMongo Key'}
                        </Button>

                        {saved && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 animate-in fade-in">
                                <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    Payment key saved and encrypted successfully!
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
                            <Lock size={14} style={{ color: `var(--theme-primary)` }} />
                            <p className="text-[8px] text-muted-foreground">
                                Your key is encrypted using AES-256 before storage. Only you can use it to process payments.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Modal open={showFeeModal} onClose={handleCloseModal} title="Pay Platform Fees" size="md">
                <div className="space-y-4 py-4 text-center">
                    {!paymentConfirmed ? (
                        <>
                            {generatingLink ? (
                                <div className="py-8">
                                    <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
                                    <p className="text-foreground text-sm">Generating payment link...</p>
                                </div>
                            ) : paymentLink ? (
                                <>
                                    <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                                        <CreditCard size={32} className="text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-foreground">Payment Link Generated</h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Scan QR code or click link to pay your platform fees
                                        </p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
                                        <QRCodeSVG value={paymentLink} size={180} level="H" />
                                    </div>
                                    <div className="bg-muted rounded-xl p-3">
                                        <p className="text-[10px] text-muted-foreground font-black uppercase mb-1">Amount to Pay</p>
                                        <p className="text-2xl font-black text-primary">₱{pendingFees.total?.toFixed(2)}</p>
                                        <p className="text-[8px] text-muted-foreground mt-1">Period: {pendingFees.month}</p>
                                    </div>
                                    <div className="bg-muted rounded-xl p-3">
                                        <p className="text-[8px] text-muted-foreground font-black uppercase mb-1">Payment Link</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={paymentLink}
                                                readOnly
                                                className="flex-1 px-3 py-2 bg-background rounded-lg text-foreground text-xs font-mono truncate border border-border"
                                            />
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(paymentLink);
                                                    showToast({ icon: 'success', title: 'Link copied!' });
                                                }}
                                                className="p-2 bg-primary/20 rounded-lg hover:bg-primary transition-colors"
                                            >
                                                <Copy size={16} className="text-primary" />
                                            </button>
                                        </div>
                                    </div>
                                    {isPolling && (
                                        <div className="bg-amber-500/10 rounded-xl p-3 flex items-center justify-center gap-2">
                                            <Loader2 size={14} className="animate-spin text-amber-600 dark:text-amber-400" />
                                            <p className="text-[8px] text-amber-600 dark:text-amber-400 font-black uppercase">
                                                Waiting for payment confirmation...
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => window.open(paymentLink, '_blank')}
                                            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink size={14} />
                                            Open Payment Page
                                        </button>
                                    </div>
                                    <p className="text-[8px] text-muted-foreground">
                                        Pay via GCash, PayMaya, or Credit/Debit Card. After payment, your fees will be marked as paid automatically.
                                    </p>
                                </>
                            ) : null}
                        </>
                    ) : (
                        <div className="py-8">
                            <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-foreground font-black text-lg mb-2">Payment Confirmed!</h3>
                            <p className="text-muted-foreground text-sm mb-4">
                                Your platform fees have been paid successfully.
                            </p>
                        </div>
                    )}
                </div>
            </Modal>

            <Card className="mt-6 bg-card border-border">
                <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                            <Info size={16} style={{ color: `var(--theme-primary)` }} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-black text-foreground mb-4">How to get your PayMongo Secret Key</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-muted rounded-xl p-4 border border-border hover:border-primary/30 transition-all">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-black" style={{ color: `var(--theme-primary)` }}>1</div>
                                        <span className="text-[11px] font-black text-foreground">Go to Dashboard</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mb-2">
                                        Visit <a href="https://dashboard.paymongo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">PayMongo Dashboard <ExternalLink size={10} /></a>
                                    </p>
                                    <p className="text-[9px] text-muted-foreground">Login to your PayMongo account</p>
                                </div>
                                <div className="bg-muted rounded-xl p-4 border border-border hover:border-primary/30 transition-all">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-black" style={{ color: `var(--theme-primary)` }}>2</div>
                                        <span className="text-[11px] font-black text-foreground">Navigate to Developers</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mb-2">Click on <strong className="text-foreground">Settings</strong> → <strong className="text-foreground">Developers</strong></p>
                                    <p className="text-[9px] text-muted-foreground">Find API Keys section</p>
                                </div>
                                <div className="bg-muted rounded-xl p-4 border border-border hover:border-primary/30 transition-all">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-black" style={{ color: `var(--theme-primary)` }}>3</div>
                                        <span className="text-[11px] font-black text-foreground">Copy LIVE Secret Key</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mb-2">Find <strong className="text-emerald-600 dark:text-emerald-400">LIVE API keys</strong></p>
                                    <p className="text-[9px] text-muted-foreground">Click <strong>Copy</strong> next to <strong>Secret Key</strong> (starts with <code className="text-primary">sk_</code>)</p>
                                </div>
                            </div>
                            <div className="mt-5 p-4 bg-primary/5 rounded-xl border border-primary/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle size={14} style={{ color: `var(--theme-primary)` }} />
                                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: `var(--theme-primary)` }}>Important Security Note</p>
                                </div>
                                <p className="text-[9px] text-muted-foreground">
                                    Never share your Secret Key with anyone. Keep it secure. We encrypt it using AES-256 before storing in our database.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-6 bg-card border-border">
                <CardContent className="p-5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-4 text-center">Supported Payment Methods</p>
                    <div className="flex items-center justify-center gap-8 flex-wrap">
                        {[
                            { label: 'GCash', color: 'emerald' },
                            { label: 'Maya', display: 'PayMaya', color: 'blue' },
                            { label: 'Card', display: 'Credit/Debit', color: 'purple' },
                            { label: 'GrabPay', color: 'indigo' },
                        ].map(({ label, display, color }) => (
                            <div key={label} className="flex flex-col items-center gap-2">
                                <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 flex items-center justify-center border border-${color}-500/20`}>
                                    <span className={`text-${color}-600 dark:text-${color}-400 text-xs font-black`}>{label}</span>
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground">{display || label}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PaymentSettings;