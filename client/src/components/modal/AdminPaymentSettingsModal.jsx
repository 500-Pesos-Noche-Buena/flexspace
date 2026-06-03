import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { apiPost, apiGet } from '@/utils/Api';
import {
    CreditCard, Key, Eye, EyeOff, Loader2, CheckCircle,
    AlertCircle, ExternalLink, Copy, Check, Shield,
    Lock, Info, Link2
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { useTheme } from '@/hooks/useTheme';
import { FormInput } from '@/components/FormValidation';

export const AdminPaymentSettingsModal = ({ isOpen, onClose }) => {
    const { themeColor } = useTheme();
    const [paymongoKey, setPaymongoKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [hasKey, setHasKey] = useState(false);
    const [hasPayBridgeKey, setHasPayBridgeKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [touched, setTouched] = useState({ paymongoKey: false });
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            checkKeyStatus();
        }
    }, [isOpen]);

    const checkKeyStatus = async () => {
        try {
            const res = await apiGet('/admin/payment/key-status');
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

    const validateKey = (key) => {
        if (!key.trim()) {
            setError('PayMongo secret key is required');
            return false;
        }
        if (!key.trim().startsWith('sk_')) {
            setError('PayMongo secret key should start with "sk_"');
            return false;
        }
        setError('');
        return true;
    };

    const handleBlur = () => {
        setTouched({ paymongoKey: true });
        if (paymongoKey) {
            validateKey(paymongoKey);
        }
    };

    const handleSavePayMongoKey = async () => {
        if (!validateKey(paymongoKey)) {
            setTouched({ paymongoKey: true });
            showToast({ icon: 'warning', title: error });
            return;
        }

        setSaving(true);
        try {
            await apiPost('/admin/payment/keys/paymongo', {
                secret_key: paymongoKey.trim()
            });
            setSaved(true);
            setHasKey(true);
            showToast({ icon: 'success', title: 'Payment key saved and encrypted successfully!' });
            setTimeout(() => setSaved(false), 3000);
            setPaymongoKey('');
            setTouched({ paymongoKey: false });
            setError('');
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

    const getButtonColor = () => {
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
        <Modal open={isOpen} onClose={onClose} title="Payment Configuration" size="xl">
            <div className="max-w-5xl mx-auto">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 size={32} className="animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {!hasPayBridgeKey && (
                            <Card className="bg-blue-500/10 dark:bg-blue-500/10 border-blue-500/30 mb-6">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                                            <Link2 size={18} className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-black text-foreground">PayBridge Integration Active</p>
                                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mt-0.5">Payment gateway is ready for online payments</p>
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
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Global payment gateway is ready</p>
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
                                    <FormInput
                                        label="PayMongo Secret Key"
                                        name="paymongoKey"
                                        type={showKey ? "text" : "password"}
                                        value={paymongoKey}
                                        onChange={(e) => setPaymongoKey(e.target.value)}
                                        onBlur={handleBlur}
                                        required={true}
                                        placeholder="Enter your PayMongo secret key"
                                        touched={touched.paymongoKey}
                                        error={error}
                                    />
                                    
                                    <div className="flex items-center gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => setShowKey(!showKey)} 
                                            className="text-[8px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                                        >
                                            {showKey ? <EyeOff size={10} /> : <Eye size={10} />}
                                            {showKey ? 'Hide key' : 'Show key'}
                                        </button>
                                        <span className="text-[8px] text-muted-foreground">•</span>
                                        <button onClick={copyExampleKey} className="text-[8px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                                            {copied ? <Check size={10} /> : <Copy size={10} />}
                                            How to get your key
                                        </button>
                                    </div>

                                    <Button
                                        onClick={handleSavePayMongoKey}
                                        disabled={saving || !paymongoKey}
                                        className={cn(
                                            "w-full text-primary-foreground rounded-xl py-3 font-bold transition-all duration-300",
                                            "bg-primary",
                                            getButtonColor(),
                                            saving && "opacity-70"
                                        )}
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Shield size={16} className="mr-2" />}
                                        {saving ? 'Encrypting & Saving...' : hasKey ? 'Update PayMongo Key' : 'Save & Encrypt PayMongo Key'}
                                    </Button>

                                    {saved && (
                                        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 animate-in fade-in">
                                            <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Payment key saved and encrypted successfully!</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
                                        <Lock size={14} style={{ color: `var(--theme-primary)` }} />
                                        <p className="text-[8px] text-muted-foreground">Your key is encrypted using AES-256 before storage. Only you can use it to process payments.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

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
                                                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-black" style={{ color: `var(--theme-primary)` }}>
                                                        1
                                                    </div>
                                                    <span className="text-[11px] font-black text-foreground">Go to Dashboard</span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mb-2">
                                                    Visit <a href="https://dashboard.paymongo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">PayMongo Dashboard <ExternalLink size={10} /></a>
                                                </p>
                                                <p className="text-[9px] text-muted-foreground">Login to your PayMongo account</p>
                                            </div>
                                            <div className="bg-muted rounded-xl p-4 border border-border hover:border-primary/30 transition-all">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-black" style={{ color: `var(--theme-primary)` }}>
                                                        2
                                                    </div>
                                                    <span className="text-[11px] font-black text-foreground">Navigate to Developers</span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mb-2">Click on <strong className="text-foreground">Settings</strong> → <strong className="text-foreground">Developers</strong></p>
                                                <p className="text-[9px] text-muted-foreground">Find API Keys section</p>
                                            </div>
                                            <div className="bg-muted rounded-xl p-4 border border-border hover:border-primary/30 transition-all">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-black" style={{ color: `var(--theme-primary)` }}>
                                                        3
                                                    </div>
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
                                            <p className="text-[9px] text-muted-foreground">Never share your Secret Key with anyone. Keep it secure. We encrypt it using AES-256 before storing in our database.</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="mt-6 bg-card border-border">
                            <CardContent className="p-5">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-4 text-center">Supported Payment Methods</p>
                                <div className="flex items-center justify-center gap-8 flex-wrap">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-black">GCash</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground">GCash</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                            <span className="text-blue-600 dark:text-blue-400 text-xs font-black">Maya</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground">PayMaya</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                            <span className="text-purple-600 dark:text-purple-400 text-xs font-black">Card</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground">Credit/Debit</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                            <span className="text-indigo-600 dark:text-indigo-400 text-xs font-black">GrabPay</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground">GrabPay</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </Modal>
    );
};