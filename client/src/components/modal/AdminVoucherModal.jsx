import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Gift, Loader2, Ticket } from 'lucide-react';
import { FormInput } from '@/components/FormValidation';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export const AdminVoucherModal = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    isSubmitting = false 
}) => {
    const { themeColor } = useTheme();
    const [formData, setFormData] = useState({
        code: '',
        discount_amount: 0,
        expiry_days: 30,
        redemption_limit: null,
        max_uses_per_user: 1,
        min_spend: 0
    });
    const [touched, setTouched] = useState({});
    const [errors, setErrors] = useState({});

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

    const validateForm = () => {
        const newErrors = {};
        if (!formData.code.trim()) newErrors.code = 'Voucher code is required';
        if (!formData.discount_amount || formData.discount_amount <= 0) {
            newErrors.discount_amount = 'Discount amount must be greater than 0';
        }
        if (formData.expiry_days && formData.expiry_days < 1) {
            newErrors.expiry_days = 'Expiry days must be at least 1';
        }
        if (formData.max_uses_per_user && formData.max_uses_per_user < 1) {
            newErrors.max_uses_per_user = 'Uses per user must be at least 1';
        }
        if (formData.min_spend && formData.min_spend < 0) {
            newErrors.min_spend = 'Minimum spend cannot be negative';
        }
        if (formData.redemption_limit && formData.redemption_limit < 1) {
            newErrors.redemption_limit = 'Redemption limit must be at least 1';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, code }));
        if (errors.code) {
            setErrors(prev => ({ ...prev, code: '' }));
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        await onSubmit(formData);
    };

    return (
        <Modal open={isOpen} onClose={onClose} title="Create Global Voucher" size="lg">
            <div className="space-y-5 py-2">
                {/* Voucher Code */}
                <FormInput
                    label="Voucher Code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required={true}
                    placeholder="e.g., FLXMAS2024"
                    touched={touched.code}
                    error={errors.code}
                    maxLength={20}
                />
                <div className="flex justify-end -mt-3">
                    <button
                        onClick={generateRandomCode}
                        className="text-[8px] font-black text-primary hover:text-primary/80 transition-colors"
                    >
                        Generate random code →
                    </button>
                </div>
                <p className="text-[8px] text-muted-foreground -mt-2">Global vouchers work on ALL spaces</p>

                {/* Discount Amount */}
                <FormInput
                    label="Discount Amount (₱)"
                    name="discount_amount"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.discount_amount}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required={true}
                    placeholder="100"
                    touched={touched.discount_amount}
                    error={errors.discount_amount}
                />
                <p className="text-[8px] text-muted-foreground -mt-2">User will need this many points to redeem (1 point = ₱1)</p>

                {/* Expiry Days */}
                <FormInput
                    label="Valid For (Days)"
                    name="expiry_days"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.expiry_days}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required={true}
                    placeholder="30"
                    touched={touched.expiry_days}
                    error={errors.expiry_days}
                />
                <p className="text-[8px] text-muted-foreground -mt-2">Voucher expires after this many days</p>

                {/* Redemption Limit */}
                <div>
                    <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">
                        Redemption Limit (Optional)
                    </label>
                    <input
                        type="number"
                        name="redemption_limit"
                        min="1"
                        value={formData.redemption_limit || ''}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Unlimited"
                        className="w-full mt-2 px-4 py-3 rounded-2xl bg-background border border-border text-foreground focus:border-primary transition-all outline-none"
                    />
                    <p className="text-[8px] text-muted-foreground mt-1">Maximum number of users who can redeem this voucher</p>
                </div>

                {/* Max Uses Per User */}
                <FormInput
                    label="Uses Per User"
                    name="max_uses_per_user"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_uses_per_user}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required={true}
                    placeholder="1"
                    touched={touched.max_uses_per_user}
                    error={errors.max_uses_per_user}
                />
                <p className="text-[8px] text-muted-foreground -mt-2">How many times a single user can use this voucher</p>

                {/* Minimum Spend */}
                <FormInput
                    label="Minimum Spend (₱) - Optional"
                    name="min_spend"
                    type="number"
                    min="0"
                    step="50"
                    value={formData.min_spend || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="No minimum"
                    touched={touched.min_spend}
                    error={errors.min_spend}
                />
                <p className="text-[8px] text-muted-foreground -mt-2">Minimum booking amount required to use this voucher</p>

                {/* Preview Card */}
                <div className="mt-4 p-4 bg-linear-to-r from-primary/10 to-purple-500/10 rounded-2xl border border-primary/20">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2 text-center">
                        Global Voucher Preview
                    </p>
                    <div className="bg-muted rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Gift size={16} className="text-emerald-600 dark:text-emerald-400" />
                            <span className="font-mono font-black text-foreground text-sm">
                                {formData.code || 'GLOBALCODE'}
                            </span>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <span className="text-emerald-600 dark:text-emerald-400 font-[1000] text-xl">
                                ₱{formData.discount_amount || 0}
                            </span>
                            <span className="text-muted-foreground text-[9px] uppercase">OFF</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[8px] text-muted-foreground">
                            <span>Valid: {formData.expiry_days} days</span>
                            {formData.redemption_limit && <span>Max redemptions: {formData.redemption_limit}</span>}
                            <span>Per user: {formData.max_uses_per_user} use(s)</span>
                            {formData.min_spend > 0 && <span>Min spend: ₱{formData.min_spend}</span>}
                        </div>
                        <p className="text-[7px] text-primary mt-2">✓ Works on ALL spaces</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={cn(
                            "flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50",
                            getButtonColor()
                        )}
                    >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Ticket size={14} />}
                        Create Global Voucher
                    </button>
                </div>
            </div>
        </Modal>
    );
};