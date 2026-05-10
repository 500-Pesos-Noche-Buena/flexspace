import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/Api';
import { 
    Plus, Edit3, Trash2, MapPin, Search, X, 
    Loader2, CheckCircle
} from 'lucide-react';
import { showToast, showConfirm } from '@/components/ui/SweetAlert2';
import { Modal } from '@/components/ui/Modal';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';

const AdminLocations = () => {
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [openModal, setOpenModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ name: '', code: '' });

    const fetchDistricts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiGet(`/admin/locations/districts?search=${searchTerm}`);
            if (res.success) {
                setDistricts(res.data || []);
            }
        } catch (error) {
            showToast({ icon: 'error', title: 'Failed to load districts' });
        } finally {
            setLoading(false);
        }
    }, [searchTerm]);

    useEffect(() => {
        fetchDistricts();
    }, [fetchDistricts]);

    const handleSave = async () => {
        if (!formData.name.trim()) {
            showToast({ icon: 'warning', title: 'Name is required' });
            return;
        }

        try {
            const data = {
                name: formData.name,
                code: formData.code.toUpperCase() || formData.name.substring(0, 3).toUpperCase()
            };

            if (editingItem) {
                await apiPut(`/admin/locations/districts/${editingItem._id}`, data);
                showToast({ icon: 'success', title: 'District updated' });
            } else {
                await apiPost('/admin/locations/districts', data);
                showToast({ icon: 'success', title: 'District added' });
            }
            
            setOpenModal(false);
            resetForm();
            fetchDistricts();
        } catch (error) {
            showToast({ icon: 'error', title: error.message || 'Operation failed' });
        }
    };

    const handleDelete = async (item) => {
        const confirmed = await showConfirm(
            `Delete ${item.name}?`,
            'This will permanently remove this district. Spaces in this district will be affected.',
            'Yes, delete'
        );
        
        if (confirmed) {
            try {
                await apiDelete(`/admin/locations/districts/${item._id}`);
                showToast({ icon: 'success', title: 'District deleted' });
                fetchDistricts();
            } catch (error) {
                showToast({ icon: 'error', title: error.message || 'Delete failed' });
            }
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({ name: item.name, code: item.code || '' });
        setOpenModal(true);
    };

    const resetForm = () => {
        setEditingItem(null);
        setFormData({ name: '', code: '' });
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="mb-6 flex flex-row justify-between items-center gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase italic">
                        District Management
                    </h1>
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-widest">
                        Manage districts for Iloilo and nationwide expansion
                    </p>
                </div>
                <button
                    onClick={() => { resetForm(); setOpenModal(true); }}
                    className="px-4 py-2 bg-indigo-600 rounded-xl text-[10px] font-black text-white uppercase tracking-wider hover:bg-indigo-500 transition-all flex items-center gap-2"
                >
                    <Plus size={14} /> Add District
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[#111114] p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                            <MapPin size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Districts</p>
                            <p className="text-xl font-black text-white">{districts.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[#111114] p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <CheckCircle size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active</p>
                            <p className="text-xl font-black text-white">{districts.filter(d => d.isActive !== false).length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search districts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-[#111114] border border-white/5 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-indigo-500/50 outline-none transition-all"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Districts List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            ) : districts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {districts.map((item) => (
                        <Card key={item._id} className="bg-[#111114] border-white/5 hover:border-indigo-500/30 transition-all">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-indigo-500/10">
                                            <MapPin size={14} className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-white">{item.name}</h3>
                                            {item.code && (
                                                <p className="text-[8px] font-mono text-slate-500 mt-0.5">{item.code}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item)}
                                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-[#111114] rounded-2xl border border-white/5">
                    <MapPin size={32} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">No districts found</p>
                    <p className="text-[8px] text-slate-600 mt-1">Click "Add District" to create your first district</p>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                open={openModal}
                onClose={() => setOpenModal(false)}
                title={editingItem ? 'Edit District' : 'Add District'}
                size="md"
                variant="dark"
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">District Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Molo, Jaro, City Proper"
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all outline-none"
                        />
                    </div>
                    
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Code (Optional)</label>
                        <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            placeholder="e.g., MOL, JAR, CTP"
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all outline-none uppercase"
                        />
                        <p className="text-[7px] text-slate-600 mt-1 ml-1">Auto-generated from name if left empty</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setOpenModal(false)}
                            className="flex-1 py-3 text-[10px] font-black text-slate-500 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg shadow-indigo-900/40 hover:bg-indigo-500 transition-all"
                        >
                            {editingItem ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminLocations;