import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/Api';
import { 
    Plus, Edit3, Trash2, MapPin, Search, X, 
    Loader2, CheckCircle
} from 'lucide-react';
import { showToast, showConfirm } from '@/components/ui/SweetAlert2';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { useTheme } from '@/hooks/useTheme';
import { DistrictModal } from '@/components/modal';

const AdminLocations = () => {
    const { themeColor } = useTheme();
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [openModal, setOpenModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', code: '' });

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
        setIsSubmitting(true);
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
        } finally {
            setIsSubmitting(false);
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
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-foreground italic uppercase tracking-tighter">District Management</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest">
                        Manage districts for Iloilo and nationwide expansion
                    </p>
                </div>
                <button
                    onClick={() => { resetForm(); setOpenModal(true); }}
                    className={cn(
                        "bg-primary text-primary-foreground px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl active:scale-95",
                        getButtonColor()
                    )}
                >
                    <Plus size={14} /> Add District
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-card border-border p-6 rounded-[2.5rem] shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Districts</p>
                            <p className="text-2xl font-[1000] italic mt-1 text-primary">{districts.length}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                            <MapPin size={18} className="text-muted-foreground" />
                        </div>
                    </div>
                </div>
                <div className="bg-card border-border p-6 rounded-[2.5rem] shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Districts</p>
                            <p className="text-2xl font-[1000] italic mt-1 text-emerald-600 dark:text-emerald-400">{districts.filter(d => d.isActive !== false).length}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                            <CheckCircle size={18} className="text-muted-foreground" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search districts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 outline-none transition-all"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Districts List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : districts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {districts.map((item) => (
                        <Card key={item._id} className="bg-card border-border hover:border-primary/30 transition-all shadow-lg">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-primary/10">
                                            <MapPin size={14} className="text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-foreground">{item.name}</h3>
                                            {item.code && (
                                                <p className="text-[8px] font-mono text-muted-foreground mt-0.5">{item.code}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item)}
                                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-all"
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
                <div className="text-center py-12 bg-card rounded-2xl border border-border">
                    <MapPin size={48} className="text-muted-foreground mx-auto mb-4" />
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">No districts found</p>
                    <p className="text-[8px] text-muted-foreground/60 mt-1">Click "Add District" to create your first district</p>
                </div>
            )}

            {/* District Modal */}
            <DistrictModal
                isOpen={openModal}
                onClose={() => setOpenModal(false)}
                onSubmit={handleSave}
                editingItem={editingItem}
                formData={formData}
                setFormData={setFormData}
                isSubmitting={isSubmitting}
            />
        </div>
    );
};

export default AdminLocations;