import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '@/utils/Api';
import { User, Shield, BadgeCheck, Save, Loader2, Lock, QrCode, CreditCard, Plus, Trash2, Upload, Wallet, Building2, Landmark, Smartphone, CheckCircle2 } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ProfileIndex = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [qrUploading, setQrUploading] = useState(false);

    // Form States
    const [formData, setFormData] = useState({ name: '', email: '' });
    const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '' });

    // Payment States
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [paymentQR, setPaymentQR] = useState(null);
    const [newPaymentMethod, setNewPaymentMethod] = useState('');

    // Available payment options
    const availablePaymentMethods = ['gcash', 'maya', 'cash', 'bank_transfer', 'credit_card', 'paypal'];

    const fetchProfile = useCallback(async (isSilent = false) => {
        try {
            const res = await apiGet('/auth/profile');
            if (res.data) {
                setUser(res.data);
                setFormData({
                    name: res.data.name || '',
                    email: res.data.email || ''
                });
                // Set payment data
                setPaymentMethods(res.data.payment_methods || []);
                setPaymentQR(res.data.business_payment_qr || null);
            }
        } catch {
            if (!isSilent) showToast({ icon: 'error', title: 'Failed to load profile' });
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadInitial = async () => {
            setLoading(true);
            await fetchProfile(false);
            if (isMounted) setLoading(false);
        };

        loadInitial();

        const interval = setInterval(() => {
            if (isMounted && document.visibilityState === 'visible' && !saving) {
                fetchProfile(true);
            }
        }, 3000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchProfile, saving]);

    const handleUpdateInfo = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiPost('/auth/profile/update', formData);
            showToast({ icon: 'success', title: 'Profile Updated' });
            await fetchProfile(false);
        } catch {
            showToast({ icon: 'error', title: 'Update failed' });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (!passwordData.current_password || !passwordData.new_password) {
            showToast({ icon: 'error', title: 'Please fill all password fields' });
            return;
        }
        setSaving(true);
        try {
            await apiPost('/auth/profile/update-password', passwordData);
            showToast({ icon: 'success', title: 'Password Updated' });
            setPasswordData({ current_password: '', new_password: '' });
        } catch {
            showToast({ icon: 'error', title: 'Password update failed' });
        } finally {
            setSaving(false);
        }
    };

    const handleUploadQR = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast({ icon: 'error', title: 'Please upload an image file' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast({ icon: 'error', title: 'File size must be less than 5MB' });
            return;
        }

        const formData = new FormData();
        formData.append('qr_code', file);

        setQrUploading(true);
        try {
            const res = await apiPut('/auth/profile/payment-qr', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setPaymentQR(res.data.business_payment_qr);
            showToast({ icon: 'success', title: 'QR Code uploaded successfully' });
            await fetchProfile(false);
        } catch {
            showToast({ icon: 'error', title: 'Failed to upload QR code' });
        } finally {
            setQrUploading(false);
        }
    };

    const handleAddPaymentMethod = async () => {
        if (!newPaymentMethod) return;
        if (paymentMethods.includes(newPaymentMethod)) {
            showToast({ icon: 'error', title: 'Payment method already added' });
            return;
        }

        const updatedMethods = [...paymentMethods, newPaymentMethod];
        setSaving(true);
        try {
            await apiPut('/auth/profile/payment-methods', { payment_methods: updatedMethods });
            setPaymentMethods(updatedMethods);
            setNewPaymentMethod('');
            showToast({ icon: 'success', title: 'Payment method added' });
            await fetchProfile(false);
        } catch {
            showToast({ icon: 'error', title: 'Failed to add payment method' });
        } finally {
            setSaving(false);
        }
    };

    const handleRemovePaymentMethod = async (method) => {
        const updatedMethods = paymentMethods.filter(m => m !== method);
        setSaving(true);
        try {
            await apiPut('/auth/profile/payment-methods', { payment_methods: updatedMethods });
            setPaymentMethods(updatedMethods);
            showToast({ icon: 'success', title: 'Payment method removed' });
            await fetchProfile(false);
        } catch {
            showToast({ icon: 'error', title: 'Failed to remove payment method' });
        } finally {
            setSaving(false);
        }
    };

    const getPaymentIcon = (method) => {
        switch (method) {
            case 'gcash': return <Smartphone size={14} />;
            case 'maya': return <Building2 size={14} />;
            case 'bank_transfer': return <Landmark size={14} />;
            default: return <CreditCard size={14} />;
        }
    };

    if (loading) return (
        <div className="p-10 text-white italic opacity-50 uppercase text-[10px] tracking-widest animate-pulse">
            Loading Identity...
        </div>
    );

    return (
        <div className="animate-in space-y-8 fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* Header Section */}
            <div className="flex items-center gap-6 bg-[#111114] border border-white/5 p-8 rounded-[3rem]">
                <div className="w-24 h-24 rounded-4xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 text-3xl font-black italic">
                    {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                            {user?.name}
                        </h1>
                        {user?.role === 'admin' && <BadgeCheck size={18} className="text-emerald-500" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <Shield size={10} /> {user?.role || 'User'} Account
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* General Information */}
                <div className="bg-[#111114] border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <User size={16} className="text-indigo-400" />
                        <h2 className="text-xs font-black text-white uppercase tracking-widest">General Info</h2>
                    </div>

                    <form onSubmit={handleUpdateInfo} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Full Name</label>
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-bold"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Email Address</label>
                            <input
                                type="email"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-bold"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <button
                            disabled={saving}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                            Save Changes
                        </button>
                    </form>
                </div>

                {/* Security Section */}
                <div className="bg-[#111114] border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <Lock size={16} className="text-rose-400" />
                        <h2 className="text-xs font-black text-white uppercase tracking-widest">Security</h2>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <p className="text-[10px] text-slate-500 font-medium italic uppercase tracking-wider">Secure your workstation identity.</p>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Current Password</label>
                            <input
                                type="password"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-rose-500 transition-all font-bold"
                                placeholder="••••••••"
                                value={passwordData.current_password}
                                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">New Password</label>
                            <input
                                type="password"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-rose-500 transition-all font-bold"
                                placeholder="••••••••"
                                value={passwordData.new_password}
                                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin" size={14} /> : <Lock size={14} />}
                            Update Password
                        </button>
                    </form>
                </div>
            </div>

            {/* Payment Settings Section - Only show for business owners */}
            {(user?.role === 'space' || user?.role === 'admin' || user?.role === 'staff') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* QR Code Upload Section */}
                    <Card className="bg-linear-to-br from-[#0a0a0f] to-[#0d0d12] border-gray-800/50 shadow-xl overflow-hidden">
                        <CardHeader className="pb-3 border-b border-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 rounded-xl">
                                    <QrCode size={18} className="text-indigo-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-bold text-white tracking-tight">
                                        Payment QR Code
                                    </CardTitle>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        Scan to pay QR code for customers
                                    </p>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6">
                            {paymentQR ? (
                                <div className="space-y-4">
                                    <div className="relative group flex justify-center">
                                        <div className="bg-white p-2 rounded-2xl shadow-2xl w-full max-w-md mx-auto">
                                            <img
                                                src={paymentQR}
                                                alt="Payment QR Code"
                                                className="w-full h-auto object-contain cursor-pointer"
                                                onError={(e) => {
                                                    console.error('Failed to load QR image:', paymentQR);
                                                    e.target.src = '/placeholder-qr.png';
                                                }}
                                                onClick={() => {
                                                    window.open(paymentQR, '_blank');
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-center gap-3">
                                        <Button
                                            onClick={() => document.getElementById('qrUpload').click()}
                                            disabled={qrUploading}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm px-6 py-3"
                                        >
                                            {qrUploading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Upload size={16} className="mr-2" />}
                                            Change QR Code
                                        </Button>
                                    </div>
                                    <p className="text-center text-[10px] text-gray-500">
                                        Click QR code to view full size
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="relative max-w-md mx-auto">
                                        <div className="absolute inset-0 bg-linear-to-r from-emerald-500/10 to-indigo-500/10 rounded-2xl blur-xl"></div>
                                        <div className="relative border-2 border-dashed border-gray-700 rounded-2xl p-8 bg-[#1a1a1f]/30">
                                            <div className="w-24 h-24 mx-auto bg-linear-to-br from-emerald-500/10 to-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
                                                <QrCode size={48} className="text-gray-600" />
                                            </div>
                                            <p className="text-base font-medium text-gray-400 mb-2">No QR Code Uploaded</p>
                                            <p className="text-xs text-gray-600 mb-6">Upload a QR code for customers to scan and pay</p>
                                            <div className="flex justify-center">
                                                <Button
                                                    onClick={() => document.getElementById('qrUpload').click()}
                                                    disabled={qrUploading}
                                                    className="bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl font-bold text-sm px-6 py-3"
                                                >
                                                    {qrUploading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Upload size={16} className="mr-2" />}
                                                    Upload QR Code
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <input
                                id="qrUpload"
                                type="file"
                                accept="image/*"
                                onChange={handleUploadQR}
                                className="hidden"
                            />
                            <div className="mt-4 text-center">
                                <p className="text-[10px] text-gray-500">Formats: JPG, PNG, GIF | Max size: 5MB</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Methods Section */}
                    <Card className="bg-linear-to-br from-[#0a0a0f] to-[#0d0d12] border-gray-800/50 shadow-xl overflow-hidden">
                        <CardHeader className="pb-3 border-b border-gray-800/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                                        <CreditCard size={18} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-bold text-white tracking-tight">
                                            Payment Methods
                                        </CardTitle>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            Manage how customers can pay for bookings
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="bg-emerald-500/5 text-emerald-400 border-emerald-500/20 text-[10px]">
                                    {paymentMethods.length} Active
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 space-y-6">
                            {/* Current Payment Methods */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <Wallet size={12} />
                                    Active Payment Methods
                                </label>

                                {paymentMethods.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                                        {paymentMethods.map((method) => (
                                            <div
                                                key={method}
                                                className="group relative bg-linear-to-r from-[#1a1a1f] to-[#15151a] border border-gray-800/50 rounded-xl p-3 hover:border-emerald-500/30 transition-all duration-300 hover:scale-[1.02]"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-emerald-400">
                                                            {getPaymentIcon(method)}
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-200 uppercase">
                                                            {method.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemovePaymentMethod(method)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-rose-500/10 rounded-lg"
                                                        type="button"
                                                    >
                                                        <Trash2 size={12} className="text-rose-400 hover:text-rose-300" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-[#1a1a1f]/30 rounded-xl border border-dashed border-gray-700">
                                        <CreditCard size={32} className="mx-auto text-gray-600 mb-2" />
                                        <p className="text-xs text-gray-500">No payment methods added yet</p>
                                        <p className="text-[10px] text-gray-600 mt-1">Add your first payment method below</p>
                                    </div>
                                )}
                            </div>

                            {/* Add New Payment Method */}
                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <Plus size={12} />
                                    Add New Method
                                </label>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1 relative">
                                        <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                                            <SelectTrigger className="w-full bg-[#1a1a1f] border-gray-700 text-gray-200 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl h-11 transition-all">
                                                <SelectValue placeholder="Choose payment method..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1a1a1f] border-gray-700">
                                                {availablePaymentMethods
                                                    .filter(m => !paymentMethods.includes(m))
                                                    .map((method) => (
                                                        <SelectItem
                                                            key={method}
                                                            value={method}
                                                            className="text-gray-200 focus:bg-emerald-500/20 focus:text-emerald-400 cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {getPaymentIcon(method)}
                                                                <span>{method.replace('_', ' ').toUpperCase()}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>

                                        {newPaymentMethod && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <CheckCircle2 size={14} className="text-emerald-400 animate-in fade-in zoom-in" />
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        onClick={handleAddPaymentMethod}
                                        disabled={!newPaymentMethod || saving}
                                        className="bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 h-11 px-6 rounded-xl font-bold text-xs tracking-wide"
                                    >
                                        {saving ? (
                                            <Loader2 size={14} className="mr-2 animate-spin" />
                                        ) : (
                                            <Plus size={14} className="mr-2" />
                                        )}
                                        Add Method
                                    </Button>
                                </div>

                                <div className="mt-3 pt-2 border-t border-gray-800/30">
                                    <p className="text-[9px] text-gray-500 flex items-center gap-2">
                                        <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                        Supported methods: GCash, Maya, Bank Transfer, Credit Card, PayPal, Cash
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ProfileIndex;