import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPost, apiPut } from '@/utils/Api';
import { User, Shield, BadgeCheck, Save, Loader2, Lock, QrCode, CreditCard, Plus, Trash2, Upload, Wallet, Building2, Landmark, Smartphone, CheckCircle2, Eye, EyeOff, CheckCircle, XCircle, Settings as SettingsIcon } from 'lucide-react';
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
import { cn } from "@/lib/utils";
import { useTheme } from '@/hooks/useTheme';
import { FormInput } from '@/components/FormValidation';
import { AdminPaymentSettingsModal } from '@/components/modal';

const ProfileIndex = () => {
    const { user: authUser, isAuthenticated } = useAuth();
    const { themeColor } = useTheme();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [qrUploading, setQrUploading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showPaymentConfigModal, setShowPaymentConfigModal] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Form States with validation
    const [formData, setFormData] = useState({ name: '', email: '' });
    const [formErrors, setFormErrors] = useState({ name: '', email: '' });
    const [formTouched, setFormTouched] = useState({ name: false, email: false });

    // Password States
    const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '' });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordTouched, setPasswordTouched] = useState({ current_password: false, new_password: false, confirm_password: false });
    const [passwordErrors, setPasswordErrors] = useState({ current_password: '', new_password: '', confirm_password: '' });

    // Payment States
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [paymentQR, setPaymentQR] = useState(null);
    const [newPaymentMethod, setNewPaymentMethod] = useState('');

    // Available payment options
    const availablePaymentMethods = ['gcash', 'maya', 'cash', 'bank_transfer', 'credit_card', 'paypal'];

    const getThemeColorClass = () => {
        const colors = {
            indigo: 'indigo',
            emerald: 'emerald',
            purple: 'purple',
            blue: 'blue',
            rose: 'rose',
            amber: 'amber',
        };
        return colors[themeColor] || 'indigo';
    };

    // Password validation
    const validatePasswordStrength = (password) => {
        const errors = [];
        if (password.length < 8) errors.push('At least 8 characters');
        if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
        if (!/[0-9]/.test(password)) errors.push('One number');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One special character');
        return errors;
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (!formData.email.trim()) errors.email = 'Email is required';
        if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = 'Invalid email format';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validatePasswordForm = () => {
        const errors = {};
        if (!passwordData.current_password) {
            errors.current_password = 'Current password is required';
        }
        if (!passwordData.new_password) {
            errors.new_password = 'New password is required';
        } else {
            const strengthErrors = validatePasswordStrength(passwordData.new_password);
            if (strengthErrors.length > 0) {
                errors.new_password = strengthErrors.join(', ');
            }
        }
        if (passwordData.new_password !== confirmPassword) {
            errors.confirm_password = 'Passwords do not match';
        }
        setPasswordErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleFormBlur = (field) => {
        setFormTouched(prev => ({ ...prev, [field]: true }));
        validateForm();
    };

    const handlePasswordBlur = (field) => {
        setPasswordTouched(prev => ({ ...prev, [field]: true }));
        validatePasswordForm();
    };

    // ✅ Redirect regular users away from this page
    useEffect(() => {
        if (isAuthenticated && authUser) {
            if (authUser.role === 'user') {
                navigate('/account', { replace: true });
                return;
            }
        }
    }, [isAuthenticated, authUser, navigate]);

    const fetchProfile = useCallback(async (isSilent = false) => {
        try {
            const res = await apiGet('/auth/profile');
            if (res.data) {
                setUser(res.data);
                setFormData({
                    name: res.data.name || '',
                    email: res.data.email || ''
                });
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
        if (!validateForm()) {
            showToast({ icon: 'warning', title: 'Please fix validation errors' });
            return;
        }
        setSaving(true);
        try {
            await apiPut('/auth/profile/update', formData);
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
        if (!validatePasswordForm()) {
            showToast({ icon: 'warning', title: 'Please fix validation errors' });
            return;
        }

        setSaving(true);
        try {
            await apiPost('/auth/profile/update-password', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password
            });
            showToast({ icon: 'success', title: 'Password Updated' });
            setPasswordData({ current_password: '', new_password: '' });
            setConfirmPassword('');
            setPasswordTouched({ current_password: false, new_password: false, confirm_password: false });
            setPasswordErrors({});
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

    const color = getThemeColorClass();

    if (loading) return (
        <div className="p-10 text-foreground italic opacity-50 uppercase text-[10px] tracking-widest animate-pulse">
            Loading Identity...
        </div>
    );

    if (authUser?.role === 'user') {
        return null;
    }

    const isAdmin = authUser?.role === 'admin';
    const isSpaceOwner = authUser?.role === 'space' || authUser?.role === 'staff';

    return (
        <div className="animate-in space-y-8 fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* Header Section */}
            <div className="flex items-center gap-6 bg-card border border-border p-8 rounded-[3rem]">
                <div className="relative">
                    <div className={`w-24 h-24 rounded-4xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center overflow-hidden`}>
                        {user?.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user?.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className={`text-3xl font-black italic text-${color}-500`}>
                                {user?.name?.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    {user?.authProvider === 'google' && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-linear-to-r from-primary to-primary text-primary-foreground text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-md">
                            Google
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h1 className="text-2xl font-black text-foreground uppercase italic tracking-tighter">
                            {user?.name}
                        </h1>
                        {user?.role === 'admin' && <BadgeCheck size={18} className="text-emerald-600 dark:text-emerald-400" />}
                        {user?.authProvider === 'google' && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30">
                                <svg className="w-3 h-3" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span className={`text-[8px] font-black text-${color}-400 uppercase tracking-wider`}>Google</span>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <Shield size={10} /> {user?.role || 'User'} Account
                    </p>
                    {user?.authProvider === 'google' && (
                        <p className={`text-[8px] text-${color}-500 font-bold uppercase tracking-wider mt-1`}>
                            Connected with Google
                        </p>
                    )}
                </div>

            </div>


            <Button
                onClick={() => setShowPaymentConfigModal(true)}
                className={`bg-${color}-600 hover:bg-${color}-500 text-white rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest`}
            >
                <SettingsIcon size={14} className="mr-2" />
                Configure Payment Gateway
            </Button>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* General Information */}
                <div className="bg-card border border-border p-8 rounded-[2.5rem] space-y-6">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                        <User size={16} className="text-primary" />
                        <h2 className="text-xs font-black text-foreground uppercase tracking-widest">General Info</h2>
                    </div>

                    <form onSubmit={handleUpdateInfo} className="space-y-4">
                        <FormInput
                            label="Full Name"
                            name="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            onBlur={() => handleFormBlur('name')}
                            required={true}
                            placeholder="Enter your full name"
                            touched={formTouched.name}
                            error={formErrors.name}
                        />
                        <FormInput
                            label="Email Address"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            onBlur={() => handleFormBlur('email')}
                            required={true}
                            placeholder="Enter your email"
                            touched={formTouched.email}
                            error={formErrors.email}
                        />
                        <button
                            disabled={saving}
                            className={`w-full py-4 bg-${color}-600 hover:bg-${color}-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
                        >
                            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                            Save Changes
                        </button>
                    </form>
                </div>

                {/* Security Section */}
                <div className="bg-card border border-border p-8 rounded-[2.5rem] space-y-6">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                        <Lock size={16} className="text-rose-600 dark:text-rose-400" />
                        <h2 className="text-xs font-black text-foreground uppercase tracking-widest">Security</h2>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <p className="text-[10px] text-muted-foreground font-medium italic uppercase tracking-wider">Secure your workstation identity.</p>

                        <FormInput
                            label="Current Password"
                            name="current_password"
                            type="password"
                            value={passwordData.current_password}
                            onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                            onBlur={() => handlePasswordBlur('current_password')}
                            required={true}
                            placeholder="••••••••"
                            touched={passwordTouched.current_password}
                            error={passwordErrors.current_password}
                        />

                        <FormInput
                            label="New Password"
                            name="new_password"
                            type={showNewPassword ? "text" : "password"}
                            value={passwordData.new_password}
                            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                            onBlur={() => handlePasswordBlur('new_password')}
                            required={true}
                            placeholder="••••••••"
                            touched={passwordTouched.new_password}
                            error={passwordErrors.new_password}
                            endAdornment={
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            }
                        />

                        {passwordTouched.new_password && passwordData.new_password && !passwordErrors.new_password && (
                            <div className="mt-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">✓ Password meets requirements</p>
                            </div>
                        )}

                        <FormInput
                            label="Confirm New Password"
                            name="confirm_password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onBlur={() => handlePasswordBlur('confirm_password')}
                            required={true}
                            placeholder="••••••••"
                            touched={passwordTouched.confirm_password}
                            error={passwordErrors.confirm_password}
                            endAdornment={
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            }
                        />

                        {/* Password strength meter */}
                        {passwordData.new_password && (
                            <div className="mt-1">
                                <div className="flex gap-1 h-1">
                                    {[1, 2, 3, 4, 5].map((level) => {
                                        let isActive = false;
                                        if (level === 1 && passwordData.new_password.length >= 8) isActive = true;
                                        if (level === 2 && /[A-Z]/.test(passwordData.new_password) && /[a-z]/.test(passwordData.new_password)) isActive = true;
                                        if (level === 3 && /[0-9]/.test(passwordData.new_password)) isActive = true;
                                        if (level === 4 && /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.new_password)) isActive = true;
                                        if (level === 5 && passwordData.new_password.length >= 12) isActive = true;
                                        return (
                                            <div key={level} className={`flex-1 h-full rounded-full transition-all ${isActive ? 'bg-emerald-500' : 'bg-muted'}`} />
                                        );
                                    })}
                                </div>
                                <p className="text-[7px] text-muted-foreground mt-1 text-right">
                                    {passwordErrors.new_password ? 'Meet all requirements for strong password' : '✓ Strong password'}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin" size={14} /> : <Lock size={14} />}
                            Update Password
                        </button>
                    </form>
                </div>
            </div>

            {/* Payment Settings Section - Only show for space owners */}
            {isSpaceOwner && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* QR Code Upload Section */}
                    <Card className="bg-card border-border shadow-xl overflow-hidden">
                        <CardHeader className="pb-3 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 bg-${color}-500/10 rounded-xl`}>
                                    <QrCode size={18} className="text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-bold text-foreground tracking-tight">
                                        Payment QR Code
                                    </CardTitle>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
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
                                            className={`bg-${color}-600 hover:bg-${color}-500 text-white rounded-xl font-bold text-sm px-6 py-3`}
                                        >
                                            {qrUploading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Upload size={16} className="mr-2" />}
                                            Change QR Code
                                        </Button>
                                    </div>
                                    <p className="text-center text-[10px] text-muted-foreground">
                                        Click QR code to view full size
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="relative max-w-md mx-auto">
                                        <div className="absolute inset-0 bg-linear-to-r from-primary/10 to-primary/10 rounded-2xl blur-xl"></div>
                                        <div className="relative border-2 border-dashed border-border rounded-2xl p-8 bg-muted/30">
                                            <div className={`w-24 h-24 mx-auto bg-linear-to-br from-${color}-500/10 to-${color}-500/10 rounded-2xl flex items-center justify-center mb-4`}>
                                                <QrCode size={48} className="text-muted-foreground" />
                                            </div>
                                            <p className="text-base font-medium text-muted-foreground mb-2">No QR Code Uploaded</p>
                                            <p className="text-xs text-muted-foreground/60 mb-6">Upload a QR code for customers to scan and pay</p>
                                            <div className="flex justify-center">
                                                <Button
                                                    onClick={() => document.getElementById('qrUpload').click()}
                                                    disabled={qrUploading}
                                                    className={`bg-linear-to-r from-${color}-600 to-${color}-500 hover:from-${color}-500 hover:to-${color}-400 text-white rounded-xl font-bold text-sm px-6 py-3`}
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
                                <p className="text-[10px] text-muted-foreground">Formats: JPG, PNG, GIF | Max size: 5MB</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Methods Section */}
                    <Card className="bg-card border-border shadow-xl overflow-hidden">
                        <CardHeader className="pb-3 border-b border-border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                                        <CreditCard size={18} className="text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-bold text-foreground tracking-tight">
                                            Payment Methods
                                        </CardTitle>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            Manage how customers can pay for bookings
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                                    {paymentMethods.length} Active
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Wallet size={12} />
                                    Active Payment Methods
                                </label>

                                {paymentMethods.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                                        {paymentMethods.map((method) => (
                                            <div
                                                key={method}
                                                className="group relative bg-muted border border-border rounded-xl p-3 hover:border-primary/30 transition-all duration-300 hover:scale-[1.02]"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-emerald-600 dark:text-emerald-400">
                                                            {getPaymentIcon(method)}
                                                        </div>
                                                        <span className="text-xs font-bold text-foreground uppercase">
                                                            {method.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemovePaymentMethod(method)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-rose-500/10 rounded-lg"
                                                        type="button"
                                                    >
                                                        <Trash2 size={12} className="text-rose-600 dark:text-rose-400 hover:text-rose-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed border-border">
                                        <CreditCard size={32} className="mx-auto text-muted-foreground mb-2" />
                                        <p className="text-xs text-muted-foreground">No payment methods added yet</p>
                                        <p className="text-[10px] text-muted-foreground/60 mt-1">Add your first payment method below</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Plus size={12} />
                                    Add New Method
                                </label>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1 relative">
                                        <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                                            <SelectTrigger className="w-full bg-muted border-border text-foreground focus:ring-primary focus:border-primary rounded-xl h-11 transition-all">
                                                <SelectValue placeholder="Choose payment method..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card border-border">
                                                {availablePaymentMethods
                                                    .filter(m => !paymentMethods.includes(m))
                                                    .map((method) => (
                                                        <SelectItem
                                                            key={method}
                                                            value={method}
                                                            className="text-foreground focus:bg-primary/20 focus:text-primary cursor-pointer"
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
                                                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 animate-in fade-in zoom-in" />
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        onClick={handleAddPaymentMethod}
                                        disabled={!newPaymentMethod || saving}
                                        className={`bg-linear-to-r from-${color}-600 to-${color}-500 hover:from-${color}-500 hover:to-${color}-400 text-white shadow-lg transition-all duration-300 h-11 px-6 rounded-xl font-bold text-xs tracking-wide`}
                                    >
                                        {saving ? (
                                            <Loader2 size={14} className="mr-2 animate-spin" />
                                        ) : (
                                            <Plus size={14} className="mr-2" />
                                        )}
                                        Add Method
                                    </Button>
                                </div>

                                <div className="mt-3 pt-2 border-t border-border/30">
                                    <p className="text-[9px] text-muted-foreground flex items-center gap-2">
                                        <span className="w-1 h-1 bg-primary rounded-full"></span>
                                        Supported methods: GCash, Maya, Bank Transfer, Credit Card, PayPal, Cash
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Admin Payment Configuration Modal */}
            <AdminPaymentSettingsModal
                isOpen={showPaymentConfigModal}
                onClose={() => setShowPaymentConfigModal(false)}
            />
        </div>
    );
};

export default ProfileIndex;