import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Plus, RefreshCw } from 'lucide-react';
import { FormInput, FormSelect, FormTextArea } from '@/components/FormValidation';
import { cn } from "@/lib/utils";

export const ProductModal = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    editingProduct, 
    formData, 
    setFormData, 
    spaceName,
    isSubmitting = false,
    touched = {},
    errors = {},
    onBlur
}) => {
    const categoryOptions = [
        { value: 'food', label: 'Food' },
        { value: 'beverage', label: 'Beverage' },
        { value: 'snacks', label: 'Snacks' },
        { value: 'merch', label: 'Merchandise' }
    ];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    // Calculate profit safely
    const purchasePrice = parseFloat(formData.purchase_price) || 0;
    const sellingPrice = parseFloat(formData.price) || 0;
    const profitPerUnit = sellingPrice - purchasePrice;
    const profitMargin = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;

    return (
        <Modal open={isOpen} onClose={onClose} title={editingProduct ? 'Edit Product' : 'New Product'} size="xl">
            <form onSubmit={onSubmit} className="space-y-4">
                {/* Branch Info Card */}
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 mb-2">
                    <p className="text-[8px] text-primary font-black uppercase tracking-wider">Branch</p>
                    <p className="text-sm font-black text-foreground wrap-break-word">{spaceName}</p>
                </div>

                {/* Product Name - required */}
                <FormInput
                    label="Product Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={onBlur}
                    required={true}
                    placeholder="e.g., Iced Caramel Macchiato"
                    touched={touched?.name}
                    error={errors?.name}
                    maxLength={50}
                />

                {/* Purchase Price & Selling Price */}
                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        label="Purchase Price (₱)"
                        name="purchase_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.purchase_price}
                        onChange={handleChange}
                        onBlur={onBlur}
                        placeholder="0.00"
                        touched={touched?.purchase_price}
                        error={errors?.purchase_price}
                    />
                    <FormInput
                        label="Selling Price (₱)"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={handleChange}
                        onBlur={onBlur}
                        required={true}
                        placeholder="0.00"
                        touched={touched?.price}
                        error={errors?.price}
                    />
                </div>

                {/* Stock & Category */}
                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        label="Stock Quantity"
                        name="stock"
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={handleChange}
                        onBlur={onBlur}
                        placeholder="0"
                        touched={touched?.stock}
                        error={errors?.stock}
                    />
                    <FormSelect
                        label="Category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        onBlur={onBlur}
                        options={categoryOptions}
                        touched={touched?.category}
                        error={errors?.category}
                    />
                </div>

                {/* Description */}
                <FormTextArea
                    label="Description (Optional)"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    onBlur={onBlur}
                    placeholder="Describe the product..."
                    rows={3}
                    maxLength={500}
                    touched={touched?.description}
                    error={errors?.description}
                />

                {/* Profit Preview */}
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3">
                    <p className="text-[8px] text-primary font-black uppercase tracking-wider">Profit Preview</p>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] text-muted-foreground">Profit per unit:</span>
                        <span className={cn(
                            "text-sm font-black",
                            profitPerUnit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                            ₱{profitPerUnit.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] text-muted-foreground">Profit margin:</span>
                        <span className={cn(
                            "text-sm font-black",
                            profitMargin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                            {profitMargin.toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* Available for sale toggle */}
                <div className="flex items-center justify-between p-3 bg-muted border border-border rounded-2xl">
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Available for sale</span>
                    <input
                        type="checkbox"
                        name="is_available"
                        checked={formData.is_available !== false}
                        onChange={handleChange}
                        className="w-5 h-5 accent-primary"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="flex-1 py-3 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                        {editingProduct ? 'Update Product' : `Add to ${spaceName.length > 30 ? spaceName.substring(0, 30) + '...' : spaceName}`}
                    </button>
                </div>
            </form>
        </Modal>
    );
};