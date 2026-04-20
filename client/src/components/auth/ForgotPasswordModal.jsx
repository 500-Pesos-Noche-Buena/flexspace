// components/auth/ForgotPasswordModal.jsx
import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
    const [step, setStep] = useState('email'); // email, otp, reset
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await apiPost('/auth/forgot-password', { email });
            if (res.success) {
                showToast({ icon: 'success', title: 'OTP sent to your email!' });
                setStep('otp');
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Failed to send OTP' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await apiPost('/auth/verify-otp', { email, otp });
            if (res.success) {
                setResetToken(res.resetToken);
                showToast({ icon: 'success', title: 'OTP verified!' });
                setStep('reset');
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Invalid OTP' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showToast({ icon: 'error', title: 'Passwords do not match' });
            return;
        }
        if (newPassword.length < 6) {
            showToast({ icon: 'error', title: 'Password must be at least 6 characters' });
            return;
        }
        
        setIsLoading(true);
        try {
            const res = await apiPost('/auth/reset-password', { resetToken, newPassword });
            if (res.success) {
                showToast({ icon: 'success', title: 'Password reset successfully!' });
                onClose();
                setStep('email');
                setEmail('');
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Failed to reset password' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal open={isOpen} onClose={onClose} title="Reset Password" size="md" variant="light">
            {step === 'email' && (
                <form onSubmit={handleSendOTP} className="space-y-4">
                    <div className="text-center mb-4">
                        <p className="text-sm text-slate-600">
                            Enter your email address and we'll send you a verification code.
                        </p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            Email Address
                        </label>
                        <div className="relative mt-2">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                                placeholder="your@email.com"
                            />
                        </div>
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500">
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Send OTP'}
                    </Button>
                </form>
            )}

            {step === 'otp' && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <div className="text-center mb-4">
                        <p className="text-sm text-slate-600">
                            Enter the 6-digit code sent to {email}
                        </p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            OTP Code
                        </label>
                        <input
                            type="text"
                            required
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none text-center text-2xl font-bold tracking-widest"
                            placeholder="000000"
                        />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500">
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Verify OTP'}
                    </Button>
                    <button
                        type="button"
                        onClick={() => setStep('email')}
                        className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1"
                    >
                        <ArrowLeft size={14} /> Back to email
                    </button>
                </form>
            )}

            {step === 'reset' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="text-center mb-4">
                        <p className="text-sm text-slate-600">
                            Create a new password for your account
                        </p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            New Password
                        </label>
                        <div className="relative mt-2">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            Confirm Password
                        </label>
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                            placeholder="••••••••"
                        />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500">
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Reset Password'}
                    </Button>
                </form>
            )}
        </Modal>
    );
};

export default ForgotPasswordModal;