// Space/Pos/Products.jsx
import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/Api';
import { Package, Plus, Edit2, Trash2, Search, Loader2 } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: 'beverage',
        stock: '',
        description: ''
    });

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
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingProduct) {
                await apiPut(`/space/products/${editingProduct._id}`, formData);
                showToast({ icon: 'success', title: 'Product updated' });
            } else {
                await apiPost('/space/products', formData);
                showToast({ icon: 'success', title: 'Product created' });
            }
            setModalOpen(false);
            setEditingProduct(null);
            setFormData({ name: '', price: '', category: 'beverage', stock: '', description: '' });
            fetchProducts();
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Operation failed' });
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this product?')) {
            try {
                await apiDelete(`/space/products/${id}`);
                showToast({ icon: 'success', title: 'Product deleted' });
                fetchProducts();
            } catch (err) {
                showToast({ icon: 'error', title: 'Delete failed' });
            }
        }
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="bg-[#111114] rounded-2xl border border-white/5 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-white">Products</h1>
                    <p className="text-slate-400 text-sm">Manage your product catalog</p>
                </div>
                <Button onClick={() => { setEditingProduct(null); setFormData({ name: '', price: '', category: 'beverage', stock: '', description: '' }); setModalOpen(true); }} className="bg-indigo-600">
                    <Plus size={16} className="mr-2" /> Add Product
                </Button>
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-white/10">
                            <tr className="text-left text-slate-400 text-sm">
                                <th className="pb-3">Name</th>
                                <th className="pb-3">Category</th>
                                <th className="pb-3">Price</th>
                                <th className="pb-3">Stock</th>
                                <th className="pb-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(product => (
                                <tr key={product._id} className="border-b border-white/5">
                                    <td className="py-3 text-white">{product.name}</td>
                                    <td className="py-3"><span className="capitalize px-2 py-1 bg-white/5 rounded-full text-xs">{product.category}</span></td>
                                    <td className="py-3 text-indigo-400">₱{product.price}</td>
                                    <td className="py-3">{product.stock ?? 0}</td>
                                    <td className="py-3 flex gap-2">
                                        <button onClick={() => { setEditingProduct(product); setFormData(product); setModalOpen(true); }} className="p-1 hover:text-indigo-400"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(product._id)} className="p-1 hover:text-red-400"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? 'Edit Product' : 'New Product'} size="md" variant="dark">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="Product Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                        className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none" />
                    <input type="number" placeholder="Price" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required
                        className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none" />
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                        className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none">
                        <option value="food">Food</option>
                        <option value="beverage">Beverage</option>
                        <option value="snacks">Snacks</option>
                        <option value="merch">Merchandise</option>
                    </select>
                    <input type="number" placeholder="Stock" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none" />
                    <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none" rows="3" />
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors">Save</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Products;