import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/Api';
import {
    Package, Plus, Edit2, Trash2, Search, Loader2, Tag, DollarSign,
    Boxes, AlertCircle, CheckCircle, XCircle, TrendingUp, BarChart3,
    Filter, ChevronDown, X, Archive, RefreshCw, TrendingDown, Receipt, Building2
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import { ProductModal, DeleteConfirmModal } from '@/components/modal';
import { useTheme } from '@/hooks/useTheme';

const Inventory = () => {
    const { themeColor } = useTheme();
    const [products, setProducts] = useState([]);
    const [spaces, setSpaces] = useState([]);
    const [selectedSpaceId, setSelectedSpaceId] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        purchase_price: '',
        price: '',
        category: 'beverage',
        stock: '',
        description: '',
        is_available: true
    });
    const [touched, setTouched] = useState({});
    const [errors, setErrors] = useState({});


    const categories = [
        { value: 'all', label: 'All Items', icon: Boxes },
        { value: 'beverage', label: 'Beverages', icon: Package },
        { value: 'food', label: 'Food', icon: Tag },
        { value: 'snacks', label: 'Snacks', icon: Package },
        { value: 'merch', label: 'Merchandise', icon: Tag }
    ];

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

    // Fetch spaces first
    useEffect(() => {
        fetchSpaces();
    }, []);

    // Fetch products when space changes
    useEffect(() => {
        if (selectedSpaceId) {
            fetchProducts();
        }
    }, [selectedSpaceId]);

    const fetchSpaces = async () => {
        try {
            const res = await apiGet('/space/spaces');
            if (res.success && res.data.length > 0) {
                setSpaces(res.data);
                setSelectedSpaceId(res.data[0]._id);
            }
        } catch (err) {
            console.error('Failed to fetch spaces:', err);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await apiGet(`/space/products?space_id=${selectedSpaceId}`);
            if (res.success) {
                setProducts(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
    };

   // Add validation function
const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name || !formData.name.trim()) {
        newErrors.name = 'Product name is required';
    } else if (formData.name.length > 50) {
        newErrors.name = 'Product name cannot exceed 50 characters';
    }
    
    // Selling price validation
    if (!formData.price && formData.price !== 0) {
        newErrors.price = 'Selling price is required';
    } else if (parseFloat(formData.price) < 0) {
        newErrors.price = 'Selling price cannot be negative';
    } else if (parseFloat(formData.price) === 0) {
        newErrors.price = 'Selling price must be greater than 0';
    } else if (isNaN(parseFloat(formData.price))) {
        newErrors.price = 'Selling price must be a valid number';
    }
    
    // Purchase price validation (optional but must be valid if provided)
    if (formData.purchase_price && formData.purchase_price !== '') {
        if (parseFloat(formData.purchase_price) < 0) {
            newErrors.purchase_price = 'Purchase price cannot be negative';
        } else if (isNaN(parseFloat(formData.purchase_price))) {
            newErrors.purchase_price = 'Purchase price must be a valid number';
        }
    }
    
    // Stock validation (optional but must be valid if provided)
    if (formData.stock && formData.stock !== '') {
        if (parseInt(formData.stock) < 0) {
            newErrors.stock = 'Stock cannot be negative';
        } else if (isNaN(parseInt(formData.stock))) {
            newErrors.stock = 'Stock must be a valid number';
        }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
};

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        if (!selectedSpaceId) {
            showToast({ icon: 'warning', title: 'Please select a branch first' });
            return;
        }

        setIsSubmitting(true);
        try {
            const submitData = {
                ...formData,
                space_id: selectedSpaceId,
                purchase_price: parseFloat(formData.purchase_price) || 0,
                price: parseFloat(formData.price),
                stock: parseInt(formData.stock) || 0
            };

            if (editingProduct) {
                await apiPut(`/space/products/${editingProduct._id}`, submitData);
                showToast({ icon: 'success', title: 'Product updated successfully' });
            } else {
                await apiPost('/space/products', submitData);
                showToast({ icon: 'success', title: 'Product added to inventory' });
            }
            setModalOpen(false);
            setEditingProduct(null);
            setFormData({ name: '', purchase_price: '', price: '', category: 'beverage', stock: '', description: '', is_available: true });
            fetchProducts();
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Operation failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiDelete(`/space/products/${id}`);
            showToast({ icon: 'success', title: 'Product removed from inventory' });
            setShowDeleteConfirm(null);
            fetchProducts();
        } catch (err) {
            showToast({ icon: 'error', title: 'Failed to delete product' });
        }
    };

    const handleToggleAvailability = async (product) => {
        try {
            await apiPut(`/space/products/${product._id}`, {
                ...product,
                is_available: !product.is_available
            });
            showToast({
                icon: 'success',
                title: product.is_available ? 'Product hidden from menu' : 'Product available again'
            });
            fetchProducts();
        } catch (err) {
            showToast({ icon: 'error', title: 'Failed to update status' });
        }
    };

    const calculateProfit = (product) => {
        const revenue = product.price * (product.stock || 0);
        const cost = (product.purchase_price || 0) * (product.stock || 0);
        const profit = revenue - cost;
        const profitMargin = product.price > 0 ? ((product.price - (product.purchase_price || 0)) / product.price) * 100 : 0;
        return { revenue, cost, profit, profitMargin };
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const getCurrentSpaceName = () => {
        const space = spaces.find(s => s._id === selectedSpaceId);
        return space?.name || 'Select Branch';
    };

    const stats = {
        total: products.length,
        lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
        outOfStock: products.filter(p => p.stock === 0).length,
        totalCost: products.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.stock || 0)), 0),
        totalRevenue: products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0),
        totalProfit: products.reduce((sum, p) => {
            const revenue = p.price * (p.stock || 0);
            const cost = (p.purchase_price || 0) * (p.stock || 0);
            return sum + (revenue - cost);
        }, 0)
    };

    const color = getThemeColorClass();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-foreground italic uppercase tracking-tighter">Inventory Management</h1>
                        <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest italic">
                            Manage products across all your branches
                        </p>
                    </div>

                    {/* Branch Selector */}
                    <div className="relative">
                        <div className="flex items-center gap-2 bg-muted border border-border rounded-2xl px-4 py-2">
                            <Building2 size={16} className="text-primary" />
                            <select
                                value={selectedSpaceId}
                                onChange={(e) => setSelectedSpaceId(e.target.value)}
                                className="bg-transparent text-foreground text-sm font-bold outline-none pr-8 cursor-pointer"
                            >
                                {spaces.map(space => (
                                    <option key={space._id} value={space._id} className="bg-background text-foreground">
                                        {space.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="text-muted-foreground" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <Card className="bg-primary/5 border-primary/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Building2 size={20} className="text-primary" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Current Branch</p>
                            <p className="text-lg font-[1000] text-foreground italic tracking-tighter truncate max-w-37.5">
                                {getCurrentSpaceName()}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Package size={20} className="text-primary" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Total Products</p>
                            <p className="text-xl font-[1000] text-foreground italic tracking-tighter">{stats.total}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-500/5 border-amber-500/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                            <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Low Stock</p>
                            <p className="text-xl font-[1000] text-amber-600 dark:text-amber-400 italic tracking-tighter">{stats.lowStock}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-rose-500/5 border-rose-500/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                            <XCircle size={20} className="text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Out of Stock</p>
                            <p className="text-xl font-[1000] text-rose-600 dark:text-rose-400 italic tracking-tighter">{stats.outOfStock}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-500/5 border-emerald-500/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                            <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Inventory Value</p>
                            <p className="text-xl font-[1000] text-emerald-600 dark:text-emerald-400 italic tracking-tighter">
                                ₱{stats.totalCost.toLocaleString()}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-2xl text-foreground text-sm placeholder:text-muted-foreground focus:border-primary outline-none transition-all"
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="relative">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2.5 bg-background border border-border rounded-2xl text-foreground text-sm appearance-none cursor-pointer focus:border-primary outline-none"
                        >
                            {categories.map(cat => (
                                <option key={cat.value} value={cat.value} className="bg-background text-foreground">
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                </div>

                <Button
                    onClick={() => {
                        setEditingProduct(null);
                        setFormData({ name: '', purchase_price: '', price: '', category: 'beverage', stock: '', description: '', is_available: true });
                        setModalOpen(true);
                    }}
                    className={`bg-${color}-600 hover:bg-${color}-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest px-5 py-2.5 h-auto shadow-lg`}
                >
                    <Plus size={14} className="mr-2" /> Add Product to {getCurrentSpaceName()}
                </Button>
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-primary" />
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                    <Package size={48} className="text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-black uppercase tracking-widest text-sm">No products found</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Add your first product to {getCurrentSpaceName()}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts.map(product => {
                        const { profit, profitMargin } = calculateProfit(product);
                        const isProfitable = profitMargin > 0;

                        return (
                            <Card
                                key={product._id}
                                className={cn(
                                    "bg-card border-border hover:border-primary/30 transition-all duration-300 group",
                                    !product.is_available && "opacity-60"
                                )}
                            >
                                <CardContent className="p-5">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <Package size={18} className="text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-foreground italic tracking-tighter">
                                                    {product.name}
                                                </h3>
                                                <span className="text-[8px] text-muted-foreground uppercase tracking-wider">
                                                    {product.category}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        {!product.is_available ? (
                                            <span className="text-[8px] bg-rose-500/20 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-full font-black uppercase">
                                                Hidden
                                            </span>
                                        ) : product.stock === 0 ? (
                                            <span className="text-[8px] bg-rose-500/20 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-full font-black uppercase">
                                                Out of Stock
                                            </span>
                                        ) : product.stock <= 10 ? (
                                            <span className="text-[8px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full font-black uppercase">
                                                Low Stock
                                            </span>
                                        ) : (
                                            <span className="text-[8px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full font-black uppercase">
                                                In Stock
                                            </span>
                                        )}
                                    </div>

                                    {/* Price & Stock */}
                                    <div className="space-y-2 mb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <DollarSign size={12} className="text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-[10px] text-muted-foreground">Selling Price</span>
                                            </div>
                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 italic">
                                                ₱{product.price}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <TrendingDown size={12} className="text-amber-600 dark:text-amber-400" />
                                                <span className="text-[10px] text-muted-foreground">Purchase Price</span>
                                            </div>
                                            <span className="text-sm font-black text-amber-600 dark:text-amber-400 italic">
                                                ₱{product.purchase_price || 0}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-1 border-t border-border">
                                            <div className="flex items-center gap-1.5">
                                                <TrendingUp size={12} className={isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
                                                <span className="text-[10px] text-muted-foreground">Profit per unit</span>
                                            </div>
                                            <span className={cn(
                                                "text-sm font-black italic",
                                                isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                            )}>
                                                ₱{(product.price - (product.purchase_price || 0)).toFixed(2)}
                                                <span className="text-[8px] ml-1">
                                                    ({profitMargin.toFixed(1)}%)
                                                </span>
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <Boxes size={12} className="text-primary" />
                                                <span className="text-[10px] text-muted-foreground">Stock</span>
                                            </div>
                                            <span className={cn(
                                                "text-sm font-black italic",
                                                product.stock === 0 ? "text-rose-600 dark:text-rose-400" :
                                                    product.stock <= 10 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                                            )}>
                                                {product.stock || 0} units
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {product.description && (
                                        <p className="text-[9px] text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                                            {product.description}
                                        </p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2 border-t border-border">
                                        <button
                                            onClick={() => handleToggleAvailability(product)}
                                            className={cn(
                                                "flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all",
                                                product.is_available
                                                    ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white"
                                                    : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white"
                                            )}
                                        >
                                            {product.is_available ? 'Hide' : 'Show'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingProduct(product);
                                                setFormData(product);
                                                setModalOpen(true);
                                            }}
                                            className={`flex-1 py-2 bg-${color}-500/20 text-${color}-400 rounded-xl text-[9px] font-black uppercase hover:bg-${color}-600 hover:text-white transition-all`}
                                        >
                                            <Edit2 size={12} className="inline mr-1" /> Edit
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(product)}
                                            className="py-2 px-3 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Product Modal */}
            <ProductModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleSubmit}
                editingProduct={editingProduct}
                formData={formData}
                setFormData={setFormData}
                spaceName={getCurrentSpaceName()}
                isSubmitting={isSubmitting}
                touched={touched}
                errors={errors}
                onBlur={handleBlur}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={!!showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(null)}
                onConfirm={() => handleDelete(showDeleteConfirm?._id)}
                productName={showDeleteConfirm?.name}
                spaceName={getCurrentSpaceName()}
            />
        </div>
    );
};

export default Inventory;