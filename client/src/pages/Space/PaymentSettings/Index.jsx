import React, { useState, useEffect } from 'react';
import { apiPost, apiGet } from '@/utils/Api';
import {
    CreditCard, Key, Eye, EyeOff, Loader2, CheckCircle,
    AlertCircle, ExternalLink, Copy, Check, Shield,
    Lock, Info, Link2
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const PaymentSettings = () => {
    const [paymongoKey, setPaymongoKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [hasKey, setHasKey] = useState(false);
    const [hasPayBridgeKey, setHasPayBridgeKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        checkKeyStatus();
    }, []);

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
            await apiPost('/space/payment/keys/paymongo', {
                secret_key: paymongoKey.trim()
            });
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

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Payment Configuration</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest italic">Connect your PayMongo account to accept online payments.</p>
            </div>

            {!hasPayBridgeKey && (
                <Card className="bg-blue-500/10 border-blue-500/30 mb-6">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                                <Link2 size={18} className="text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-white">PayBridge Integration Active</p>
                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">Payment gateway is ready for online payments</p>
                                <p className="text-[9px] text-slate-400 mt-2">
                                    Your payments are processed securely through PayBridge. Just add your PayMongo secret key below to start accepting payments.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {hasKey && (
                <Card className="bg-emerald-500/5 border-emerald-500/20 mb-6">
                    <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle size={20} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-white">PayMongo Connected</p>
                                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Your payment gateway is ready to accept online payments</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] text-emerald-400 font-black uppercase">Live</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-[#111114] border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-linear-to-r from-blue-500/5 to-purple-500/5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                            <CreditCard size={28} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">PayMongo Integration</h2>
                            <p className="text-slate-400 text-sm">Accept GCash, PayMaya, GrabPay, and Credit Card payments</p>
                        </div>
                    </div>
                </div>

                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Key size={12} /> PayMongo Secret Key
                            </label>
                            <div className="relative mt-2">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={paymongoKey}
                                    onChange={(e) => setPaymongoKey(e.target.value)}
                                    placeholder="Enter your PayMongo secret key"
                                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:border-blue-500 outline-none font-mono text-sm pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                >
                                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <button onClick={copyExampleKey} className="text-[8px] text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1">
                                    {copied ? <Check size={10} /> : <Copy size={10} />}
                                    How to get your key
                                </button>
                                <span className="text-[8px] text-slate-600">•</span>
                                <span className="text-[8px] text-slate-500">Starts with <code className="text-blue-400">sk_</code></span>
                            </div>
                        </div>

                        <Button
                            onClick={handleSavePayMongoKey}
                            disabled={saving || !paymongoKey}
                            className="w-full bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl py-3 font-bold transition-all duration-300"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Shield size={16} className="mr-2" />}
                            {saving ? 'Encrypting & Saving...' : hasKey ? 'Update PayMongo Key' : 'Save & Encrypt PayMongo Key'}
                        </Button>

                        {saved && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 animate-in fade-in">
                                <CheckCircle size={14} className="text-emerald-400" />
                                <span className="text-[10px] font-bold text-emerald-400">Payment key saved and encrypted successfully!</span>
                            </div>
                        )}

                        <div className="flex items-center gap-2 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                            <Lock size={14} className="text-blue-400" />
                            <p className="text-[8px] text-slate-400">Your key is encrypted using AES-256 before storage. Only you can use it to process payments.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-6 bg-[#111114] border-white/10">
                <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                            <Info size={16} className="text-indigo-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-black text-white mb-4">How to get your PayMongo Secret Key</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-black">1</div>
                                        <span className="text-[11px] font-black text-white">Go to Dashboard</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mb-2">
                                        Visit <a href="https://dashboard.paymongo.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1">PayMongo Dashboard <ExternalLink size={10} /></a>
                                    </p>
                                    <p className="text-[9px] text-slate-500">Login to your PayMongo account</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-black">2</div>
                                        <span className="text-[11px] font-black text-white">Navigate to Developers</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mb-2">Click on <strong className="text-white">Settings</strong> → <strong className="text-white">Developers</strong></p>
                                    <p className="text-[9px] text-slate-500">Find API Keys section</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-black">3</div>
                                        <span className="text-[11px] font-black text-white">Copy LIVE Secret Key</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mb-2">Find <strong className="text-emerald-400">LIVE API keys</strong></p>
                                    <p className="text-[9px] text-slate-500">Click <strong>Copy</strong> next to <strong>Secret Key</strong> (starts with <code className="text-emerald-400">sk_</code>)</p>
                                </div>
                            </div>
                            <div className="mt-5 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle size={14} className="text-indigo-400" />
                                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">Important Security Note</p>
                                </div>
                                <p className="text-[9px] text-slate-400">Never share your Secret Key with anyone. Keep it secure. We encrypt it using AES-256 before storing in our database.</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-6 bg-[#111114] border-white/10">
                <CardContent className="p-5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-4 text-center">Supported Payment Methods</p>
                    <div className="flex items-center justify-center gap-8 flex-wrap">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <span className="text-emerald-400 text-xs font-black">GCash</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">GCash</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                <span className="text-blue-400 text-xs font-black">Maya</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">PayMaya</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                <span className="text-purple-400 text-xs font-black">Card</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">Credit/Debit</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                <span className="text-indigo-400 text-xs font-black">GrabPay</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">GrabPay</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PaymentSettings;