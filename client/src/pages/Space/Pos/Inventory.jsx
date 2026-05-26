import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/Api';
import {
    Package, Plus, Edit2, Trash2, Search, Loader2, Tag, DollarSign,
    Boxes, AlertCircle, CheckCircle, XCircle, TrendingUp, BarChart3,
    Filter, ChevronDown, X, Archive, RefreshCw
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from "@/lib/utils";

const Inventory = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: 'beverage',
        stock: '',
        description: '',
        is_available: true
    });

    const categories = [
        { value: 'all', label: 'All Items', icon: Boxes },
        { value: 'beverage', label: 'Beverages', icon: Package },
        { value: 'food', label: 'Food', icon: Tag },
        { value: 'snacks', label: 'Snacks', icon: Package },
        { value: 'merch', label: 'Merchandise', icon: Tag }
    ];

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await apiGet('/space/products');
            if (res.success) {
                setProducts(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
            showToast({ icon: 'error', title: 'Failed to load inventory' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingProduct) {
                await apiPut(`/space/products/${editingProduct._id}`, formData);
                showToast({ icon: 'success', title: 'Product updated successfully' });
            } else {
                await apiPost('/space/products', formData);
                showToast({ icon: 'success', title: 'Product added to inventory' });
            }
            setModalOpen(false);
            setEditingProduct(null);
            setFormData({ name: '', price: '', category: 'beverage', stock: '', description: '', is_available: true });
            fetchProducts();
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Operation failed' });
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

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const stats = {
        total: products.length,
        lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
        outOfStock: products.filter(p => p.stock === 0).length,
        totalValue: products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0)
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Inventory Management</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest italic">
                    Manage your products and monitor stock levels
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="bg-indigo-500/5 border-indigo-500/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Products</p>
                            <p className="text-xl font-[1000] text-white italic tracking-tighter">{stats.total}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-500/5 border-amber-500/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Low Stock</p>
                            <p className="text-xl font-[1000] text-amber-400 italic tracking-tighter">{stats.lowStock}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-red-500/5 border-red-500/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                            <XCircle size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Out of Stock</p>
                            <p className="text-xl font-[1000] text-red-400 italic tracking-tighter">{stats.outOfStock}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-500/5 border-emerald-500/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Inventory Value</p>
                            <p className="text-xl font-[1000] text-emerald-400 italic tracking-tighter">
                                ₱{stats.totalValue.toLocaleString()}
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
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white text-sm placeholder:text-slate-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="relative">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white text-sm appearance-none cursor-pointer focus:border-indigo-500 outline-none"
                        >
                            {categories.map(cat => (
                                <option key={cat.value} value={cat.value} className="bg-[#111114]">
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                </div>

                <Button
                    onClick={() => {
                        setEditingProduct(null);
                        setFormData({ name: '', price: '', category: 'beverage', stock: '', description: '', is_available: true });
                        setModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest px-5 py-2.5 h-auto shadow-lg shadow-indigo-900/20"
                >
                    <Plus size={14} className="mr-2" /> Add Product
                </Button>
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-indigo-500" />
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                    <Package size={48} className="text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-sm">No products found</p>
                    <p className="text-[10px] text-slate-600 mt-1">Add your first product to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts.map(product => (
                        <Card
                            key={product._id}
                            className={cn(
                                "bg-[#111114] border border-white/10 hover:border-indigo-500/30 transition-all duration-300 group",
                                !product.is_available && "opacity-60"
                            )}
                        >
                            <CardContent className="p-5">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                            <Package size={18} className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-white italic tracking-tighter">
                                                {product.name}
                                            </h3>
                                            <span className="text-[8px] text-slate-500 uppercase tracking-wider">
                                                {product.category}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Status Badge */}
                                    {!product.is_available ? (
                                        <span className="text-[8px] bg-red-500/20 text-red-400 px-2 py-1 rounded-full font-black uppercase">
                                            Hidden
                                        </span>
                                    ) : product.stock === 0 ? (
                                        <span className="text-[8px] bg-red-500/20 text-red-400 px-2 py-1 rounded-full font-black uppercase">
                                            Out of Stock
                                        </span>
                                    ) : product.stock <= 10 ? (
                                        <span className="text-[8px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full font-black uppercase">
                                            Low Stock
                                        </span>
                                    ) : (
                                        <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-black uppercase">
                                            In Stock
                                        </span>
                                    )}
                                </div>

                                {/* Price & Stock */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <DollarSign size={12} className="text-emerald-400" />
                                            <span className="text-[10px] text-slate-500">Price</span>
                                        </div>
                                        <span className="text-sm font-black text-emerald-400 italic">
                                            ₱{product.price}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Boxes size={12} className="text-indigo-400" />
                                            <span className="text-[10px] text-slate-500">Stock</span>
                                        </div>
                                        <span className={cn(
                                            "text-sm font-black italic",
                                            product.stock === 0 ? "text-red-400" : 
                                            product.stock <= 10 ? "text-amber-400" : "text-white"
                                        )}>
                                            {product.stock || 0} units
                                        </span>
                                    </div>
                                </div>

                                {/* Description */}
                                {product.description && (
                                    <p className="text-[9px] text-slate-500 leading-relaxed mb-4 line-clamp-2">
                                        {product.description}
                                    </p>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2 border-t border-white/10">
                                    <button
                                        onClick={() => handleToggleAvailability(product)}
                                        className={cn(
                                            "flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all",
                                            product.is_available
                                                ? "bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white"
                                                : "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white"
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
                                        className="flex-1 py-2 bg-indigo-600/20 text-indigo-400 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all"
                                    >
                                        <Edit2 size={12} className="inline mr-1" /> Edit
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(product)}
                                        className="py-2 px-3 bg-red-600/20 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? 'Edit Product' : 'New Product'} size="md" variant="dark">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Product Name</label>
                        <input
                            type="text"
                            placeholder="e.g., Iced Caramel Macchiato"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Price (₱)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                required
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock Quantity</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none"
                        >
                            <option value="food">Food</option>
                            <option value="beverage">Beverage</option>
                            <option value="snacks">Snacks</option>
                            <option value="merch">Merchandise</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Description (Optional)</label>
                        <textarea
                            placeholder="Describe the product..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows="3"
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Available for sale</span>
                        <input
                            type="checkbox"
                            checked={formData.is_available !== false}
                            onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                            className="w-5 h-5 accent-indigo-500"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all">
                            {editingProduct ? <RefreshCw size={14} /> : <Plus size={14} />}
                            {editingProduct ? 'Update Product' : 'Add to Inventory'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal open={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Delete Product" size="sm" variant="dark">
                <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <Trash2 size={28} className="text-red-400" />
                    </div>
                    <h3 className="text-lg font-black text-white mb-2">Delete {showDeleteConfirm?.name}?</h3>
                    <p className="text-[10px] text-slate-500 mb-6">
                        This action cannot be undone. The product will be permanently removed from your inventory.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button onClick={() => handleDelete(showDeleteConfirm._id)} className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-black text-[10px] uppercase hover:bg-red-500 transition-all">
                            Delete Permanently
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Inventory;