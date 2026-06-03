import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Gift, Loader2, Ticket, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { showToast } from '@/components/ui/SweetAlert2';
import { useTheme } from '@/hooks/useTheme';

export const VoucherModal = ({ isOpen, onClose, onSubmit, isSubmitting, initialData = null }) => {
    const { themeColor } = useTheme();
    const [formData, setFormData] = useState({
        code: initialData?.code || '',
        discount_amount: initialData?.discount_amount || 0,
        expiry_days: initialData?.expiry_days || 30,
        usage_limit: initialData?.usage_limit || null,
        redemption_limit: initialData?.redemption_limit || null,
        max_uses_per_user: initialData?.max_uses_per_user || 1,
        min_spend: initialData?.min_spend || 0
    });

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

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData({ ...formData, code });
    };

    const handleSubmit = () => {
        if (!formData.code.trim()) {
            showToast({ icon: 'warning', title: 'Please enter voucher code' });
            return;
        }
        if (formData.discount_amount <= 0) {
            showToast({ icon: 'warning', title: 'Discount amount must be greater than 0' });
            return;
        }
        onSubmit(formData);
    };

    return (
        <Modal open={isOpen} onClose={onClose} title="Create New Voucher" size="lg">
            <div className="space-y-5 py-2">
                {/* Voucher Code */}
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Voucher Code
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            placeholder="e.g., SUMMER2024"
                            className="flex-1 px-4 py-3 bg-background border border-border rounded-2xl text-foreground font-mono uppercase focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                        />
                        <button
                            onClick={generateRandomCode}
                            className="px-4 py-3 bg-muted border border-border rounded-2xl text-[10px] font-black uppercase text-muted-foreground hover:text-foreground hover:border-primary transition-all"
                        >
                            Random
                        </button>
                    </div>
                </div>

                {/* Discount Amount */}
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Discount Amount (₱)
                    </label>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        value={formData.discount_amount}
                        onChange={(e) => setFormData({ ...formData, discount_amount: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground font-black focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                    />
                    <p className="text-[8px] text-muted-foreground mt-1">User will need this many points to redeem (1 point = ₱1)</p>
                </div>

                {/* Expiry Days */}
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Valid For (Days)
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="365"
                        value={formData.expiry_days}
                        onChange={(e) => setFormData({ ...formData, expiry_days: parseInt(e.target.value) || 30 })}
                        className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground font-black focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                    />
                    <p className="text-[8px] text-muted-foreground mt-1">Voucher expires after this many days</p>
                </div>

                {/* Redemption Limit */}
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Redemption Limit (Optional)
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={formData.redemption_limit || ''}
                        onChange={(e) => setFormData({ ...formData, redemption_limit: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Unlimited"
                        className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                    />
                    <p className="text-[8px] text-muted-foreground mt-1">Maximum number of users who can redeem this voucher</p>
                </div>

                {/* Max Uses Per User */}
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Uses Per User
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.max_uses_per_user}
                        onChange={(e) => setFormData({ ...formData, max_uses_per_user: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground font-black focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                    />
                    <p className="text-[8px] text-muted-foreground mt-1">How many times a single user can use this voucher</p>
                </div>

                {/* Minimum Spend (Optional) */}
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Minimum Spend (₱) - Optional
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="50"
                        value={formData.min_spend || ''}
                        onChange={(e) => setFormData({ ...formData, min_spend: e.target.value ? parseInt(e.target.value) : 0 })}
                        placeholder="No minimum"
                        className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                    />
                    <p className="text-[8px] text-muted-foreground mt-1">Minimum booking amount required to use this voucher</p>
                </div>

                {/* Preview Card */}
                <div className="mt-4 p-4 bg-linear-to-r from-primary/10 to-purple-500/10 rounded-2xl border border-primary/20">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2 text-center">
                        Voucher Preview
                    </p>
                    <div className="bg-muted rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Gift size={16} className="text-emerald-600 dark:text-emerald-400" />
                            <span className="font-mono font-black text-foreground text-sm">
                                {formData.code || 'YOURCODE'}
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
                            {formData.redemption_limit && <span>Max: {formData.redemption_limit}</span>}
                            <span>Per user: {formData.max_uses_per_user}</span>
                            {formData.min_spend > 0 && <span>Min: ₱{formData.min_spend}</span>}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !formData.code || formData.discount_amount <= 0}
                        className={cn(
                            "flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50",
                            getButtonColor()
                        )}
                    >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Ticket size={14} />}
                        Create Voucher
                    </button>
                </div>
            </div>
        </Modal>
    );
};