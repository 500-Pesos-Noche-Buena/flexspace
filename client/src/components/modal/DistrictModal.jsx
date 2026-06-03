import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { FormInput } from '@/components/FormValidation';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export const DistrictModal = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    editingItem, 
    formData, 
    setFormData,
    isSubmitting = false
}) => {
    const { themeColor } = useTheme();
    const [touched, setTouched] = useState({ name: false, code: false });
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
        if (!formData.name || !formData.name.trim()) {
            newErrors.name = 'District name is required';
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
        setFormData({ ...formData, [name]: value });
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        await onSubmit();
    };

    return (
        <Modal open={isOpen} onClose={onClose} title={editingItem ? 'Edit District' : 'Add District'} size="md">
            <div className="space-y-4">
                <FormInput
                    label="District Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required={true}
                    placeholder="e.g., Molo, Jaro, City Proper"
                    touched={touched.name}
                    error={errors.name}
                    maxLength={50}
                />
                
                <div>
                    <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">
                        Code (Optional)
                    </label>
                    <input
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g., MOL, JAR, CTP"
                        className="w-full mt-2 px-4 py-3 rounded-2xl bg-background border border-border text-foreground focus:border-primary transition-all outline-none uppercase placeholder:text-muted-foreground"
                    />
                    <p className="text-[7px] text-muted-foreground/60 mt-1 ml-1">Auto-generated from name if left empty</p>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-[10px] font-black text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={cn(
                            "flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 disabled:opacity-50",
                            getButtonColor()
                        )}
                    >
                        {isSubmitting ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};