import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiPut } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';

export const ChangePasswordModal = ({ isOpen, onClose, onSuccess }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState({ newPassword: false, confirmPassword: false });

    // Password validation rules
    const validatePassword = (password) => {
        const errors = [];
        if (password.length < 8) errors.push('At least 8 characters');
        if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
        if (!/[0-9]/.test(password)) errors.push('One number');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One special character (!@#$%^&*)');
        return errors;
    };

    const passwordErrors = validatePassword(newPassword);
    const isPasswordValid = passwordErrors.length === 0 && newPassword.length > 0;
    const doPasswordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
    const isFormValid = currentPassword.length > 0 && isPasswordValid && doPasswordsMatch;

    const handleNewPasswordChange = (e) => {
        setNewPassword(e.target.value);
        setTouched(prev => ({ ...prev, newPassword: true }));
    };

    const handleConfirmPasswordChange = (e) => {
        setConfirmPassword(e.target.value);
        setTouched(prev => ({ ...prev, confirmPassword: true }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isFormValid) {
            if (!isPasswordValid) {
                showToast({ icon: 'error', title: 'Password requirements not met' });
            } else if (!doPasswordsMatch) {
                showToast({ icon: 'error', title: 'Passwords do not match' });
            }
            return;
        }

        setLoading(true);
        try {
            await apiPut('/auth/profile/update-password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            showToast({ icon: 'success', title: 'Password updated successfully' });
            onSuccess();
            onClose();
            // Reset form
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTouched({ newPassword: false, confirmPassword: false });
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Failed to update password' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-black text-slate-900 mb-4">Change Password</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Current Password */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Password</label>
                        <input
                            type="password"
                            required
                            className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>

                    {/* New Password with Requirements */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">New Password</label>
                        <input
                            type="password"
                            required
                            className={`w-full mt-1 px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:border-indigo-500 transition-all
                                ${touched.newPassword && !isPasswordValid && newPassword ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                            value={newPassword}
                            onChange={handleNewPasswordChange}
                        />
                        
                        {/* Password requirements list - real-time */}
                        {touched.newPassword && newPassword && (
                            <div className="mt-2 space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Password must contain:</p>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                    <div className={`text-[8px] flex items-center gap-1 ${newPassword.length >= 8 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        <span>{newPassword.length >= 8 ? '✓' : '○'}</span> 8+ characters
                                    </div>
                                    <div className={`text-[8px] flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        <span>{/[A-Z]/.test(newPassword) ? '✓' : '○'}</span> Uppercase letter
                                    </div>
                                    <div className={`text-[8px] flex items-center gap-1 ${/[a-z]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        <span>{/[a-z]/.test(newPassword) ? '✓' : '○'}</span> Lowercase letter
                                    </div>
                                    <div className={`text-[8px] flex items-center gap-1 ${/[0-9]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        <span>{/[0-9]/.test(newPassword) ? '✓' : '○'}</span> Number
                                    </div>
                                    <div className={`text-[8px] flex items-center gap-1 col-span-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        <span>{/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '✓' : '○'}</span> Special character (!@#$%^&*)
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Confirm New Password</label>
                        <input
                            type="password"
                            required
                            className={`w-full mt-1 px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:border-indigo-500 transition-all
                                ${touched.confirmPassword && confirmPassword && !doPasswordsMatch ? 'border-red-500 bg-red-50' : 'border-slate-200'}
                                ${touched.confirmPassword && doPasswordsMatch && confirmPassword ? 'border-emerald-500 bg-emerald-50' : ''}`}
                            value={confirmPassword}
                            onChange={handleConfirmPasswordChange}
                        />
                        {touched.confirmPassword && confirmPassword && (
                            <p className={`text-[8px] mt-1 font-bold ${doPasswordsMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                                {doPasswordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                            </p>
                        )}
                    </div>

                    {/* Password strength indicator */}
                    {newPassword && (
                        <div className="mt-2">
                            <div className="flex gap-1 h-1">
                                {[1, 2, 3, 4, 5].map((level) => {
                                    let isActive = false;
                                    if (level === 1 && newPassword.length >= 8) isActive = true;
                                    if (level === 2 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) isActive = true;
                                    if (level === 3 && /[0-9]/.test(newPassword)) isActive = true;
                                    if (level === 4 && /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) isActive = true;
                                    if (level === 5 && newPassword.length >= 12) isActive = true;
                                    return (
                                        <div 
                                            key={level}
                                            className={`flex-1 h-full rounded-full transition-all ${isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                        />
                                    );
                                })}
                            </div>
                            <p className="text-[7px] text-slate-400 mt-1 text-right">
                                {isPasswordValid ? 'Strong password ✓' : 'Weak password'}
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 rounded-xl font-black text-sm">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading || !isFormValid} 
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Update'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

