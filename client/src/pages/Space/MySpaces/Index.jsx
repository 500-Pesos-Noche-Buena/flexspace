import React, { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { 
    Plus, Image as ImageIcon, Trash2, Edit3, Users, 
    MapPin, DollarSign, ChevronDown, Activity, 
    CheckCircle, PieChart, Info 
} from 'lucide-react';
import { showToast, showConfirm } from '@/components/ui/SweetAlert2';
import { Modal } from '@/components/ui/Modal';
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MySpaces = () => {
    const [spaces, setSpaces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [selectedSpace, setSelectedSpace] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState({
        name: '', area: '', rate_hour: '', capacity: '', status: 'Open Now',
        image: null, lat: '', lng: '', district_id: '', available_rooms: ''
    });

    // --- Stats Calculation ---
    const stats = useMemo(() => {
        return {
            total: spaces.length,
            active: spaces.filter(s => s.status === 'Open Now').length,
            capacity: spaces.reduce((acc, curr) => acc + (Number(curr.capacity) || 0), 0)
        };
    }, [spaces]);

    useEffect(() => { fetchInitialData(); }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [spaceRes, districtRes] = await Promise.all([
                apiGet('/space/spaces'),
                apiGet('/space/districts/active')
            ]);
            if (spaceRes.success) setSpaces(spaceRes.data || []);
            if (districtRes.success) setDistricts(districtRes.data || []);
        } catch (err) {
            showToast({ icon: 'error', title: 'Failed to sync data' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setIsEditing(false);
        setFormData({ 
            name: '', area: '', rate_hour: '', capacity: '', 
            status: 'Open Now', image: null, lat: '', lng: '', 
            district_id: '', available_rooms: '' 
        });
        setOpenModal(true);
    };

    const handleOpenEdit = (space) => {
        setIsEditing(true);
        setSelectedSpace(space);
        setFormData({
            ...space,
            image: space.image, // Keep existing filename for preview logic
            lat: space.lat || '',
            lng: space.lng || ''
        });
        setOpenModal(true);
    };

    const handleSave = async () => {
        try {
            const url = isEditing ? `/space/spaces/${selectedSpace._id}/update` : '/space/spaces';
            const data = new FormData();
            
            Object.keys(formData).forEach(key => {
                if (key === 'image') {
                    // Only append if it's a new file upload
                    if (formData.image instanceof File) data.append('image', formData.image);
                } else {
                    data.append(key, formData[key] || '');
                }
            });

            const res = await apiPost(url, data);
            if (res.success) {
                showToast({ icon: 'success', title: isEditing ? 'Space updated' : 'Listing published' });
                setOpenModal(false);
                fetchInitialData();
            }
        } catch (err) { 
            showToast({ icon: 'error', title: 'Action failed' }); 
        }
    };

    const handleDelete = async (id) => {
        if (await showConfirm("Delete this space?", "This will permanently remove the listing.")) {
            try {
                const res = await apiPost(`/space/spaces/${id}/delete`);
                if (res.success) {
                    showToast({ icon: 'success', title: 'Space removed' });
                    setSpaces(prev => prev.filter(s => s._id !== id));
                }
            } catch (err) { 
                showToast({ icon: 'error', title: 'Delete failed' }); 
            }
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-12">
            
         {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Space Gallery</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Inventory & Environment Management</p>
            </div>
            <button 
                onClick={handleOpenCreate} 
                className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 group active:scale-95"
            >
                <Plus size={14} className="group-hover:rotate-90 transition-transform" /> New Listing
            </button>
        </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {[
                    { label: 'Total Listings', val: stats.total, icon: <PieChart size={14}/>, color: 'text-indigo-400' },
                    { label: 'Active Spaces', val: stats.active, icon: <CheckCircle size={14}/>, color: 'text-emerald-400' },
                    { label: 'Total Capacity', val: stats.capacity, icon: <Activity size={14}/>, color: 'text-amber-400' }
                ].map((stat, i) => (
                    <div key={i} className="bg-[#111114] border border-white/5 p-6 rounded-4xl flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                            <p className={`text-2xl font-black italic ${stat.color}`}>{stat.val}</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl text-slate-400">{stat.icon}</div>
                    </div>
                ))}
            </div>

            {/* Grid Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? [1, 2, 3].map((i) => <div key={i} className="h-96 bg-[#111114] border border-white/5 animate-pulse rounded-[2.5rem]" />) :
                    spaces.length > 0 ? spaces.map((space) => (
                        <div key={space._id} className="bg-[#111114] rounded-[2.5rem] border border-white/5 overflow-hidden group shadow-2xl hover:border-indigo-500/30 transition-all duration-500">
                            <div className="relative h-56 bg-white/5 overflow-hidden">
                                {space.image ? (
                                    <img src={`${API_URL}/uploads/spaces/${space.image}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={space.name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-800"><ImageIcon size={48} strokeWidth={1} /></div>
                                )}
                                <div className="absolute top-5 left-5">
                                    <span className="px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black text-white uppercase tracking-wider">₱{space.rate_hour}/hr</span>
                                </div>
                            </div>

                            <div className="p-8">
                                <div className="mb-4">
                                    <h3 className="text-xl font-black text-white italic uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{space.name}</h3>
                                    <div className="flex items-center gap-1 mt-1 text-slate-500">
                                        <MapPin size={10} />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">{space.area}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Available</p>
                                        <p className="text-xs font-black italic text-white">{space.available_rooms || 'N/A'}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                        <p className={cn("text-[8px] font-black uppercase tracking-tighter", space.status === 'Open Now' ? 'text-emerald-500' : 'text-rose-500')}>{space.status}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenEdit(space)} className="flex-1 py-4 bg-white/5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2">
                                        <Edit3 size={14} /> Edit
                                    </button>
                                    <button onClick={() => handleDelete(space._id)} className="w-14 h-14 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-50">
                            <ImageIcon size={48} className="mx-auto text-slate-700 mb-4" />
                            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No spaces found in your gallery.</p>
                        </div>
                    )}
            </div>

            {/* Modal - Optimized for Mobile Viewports */}
            <Modal open={openModal} onClose={() => setOpenModal(false)} title={isEditing ? "Modify Space" : "Create Listing"} size="lg">
                <div className="space-y-6 py-2 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">
                    
                    {/* Row 1: Name and District */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Space Name</label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">District / Location</label>
                            <div className="relative group">
                                <select
                                    value={formData.district_id}
                                    onChange={(e) => {
                                        const d = districts.find(x => x._id === e.target.value);
                                        setFormData({ ...formData, district_id: e.target.value, area: d ? d.name : '' });
                                    }}
                                    className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold appearance-none cursor-pointer"
                                >
                                    <option value="" disabled className="bg-[#111114]">Select District</option>
                                    {districts.map(d => <option key={d._id} value={d._id} className="bg-[#111114]">{d.name}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-slate-600 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Rate and Capacity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Hourly Rate (PHP)</label>
                            <div className="relative">
                                <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                <input type="number" value={formData.rate_hour} onChange={(e) => setFormData({ ...formData, rate_hour: e.target.value })} className="w-full mt-2 pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Total Capacity</label>
                            <div className="relative">
                                <Users size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                <input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="w-full mt-2 pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold" />
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Coordinates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Latitude</label>
                            <input type="number" step="any" value={formData.lat} onChange={(e) => setFormData({ ...formData, lat: e.target.value })} placeholder="10.69..." className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Longitude</label>
                            <input type="number" step="any" value={formData.lng} onChange={(e) => setFormData({ ...formData, lng: e.target.value })} placeholder="122.54..." className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold" />
                        </div>
                    </div>

                    {/* Row 4: Rooms and Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Available Rooms</label>
                            <input type="text" value={formData.available_rooms} onChange={(e) => setFormData({ ...formData, available_rooms: e.target.value })} placeholder="e.g. 2 Rooms" className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Status</label>
                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold appearance-none">
                                <option value="Open Now" className="bg-[#111114]">Open Now</option>
                                <option value="Closed" className="bg-[#111114]">Closed</option>
                                <option value="Full" className="bg-[#111114]">Full</option>
                            </select>
                        </div>
                    </div>

                    {/* Image Upload with Preview */}
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Cover Image</label>
                        <div className="mt-2 h-48 border-2 border-dashed border-white/5 rounded-4xl flex flex-col items-center justify-center gap-3 group hover:border-indigo-500/30 transition-all relative overflow-hidden bg-white/2 cursor-pointer">
                            {formData.image ? (
                                <div className="absolute inset-0 w-full h-full">
                                    <img
                                        src={formData.image instanceof File ? URL.createObjectURL(formData.image) : `${API_URL}/uploads/spaces/${formData.image}`}
                                        className="w-full h-full object-cover"
                                        alt="Preview"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Replace Photo</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <ImageIcon size={32} className="text-slate-700 group-hover:text-indigo-500 transition-colors" />
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Drop Image or Click</p>
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button onClick={() => setOpenModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Discard</button>
                        <button onClick={handleSave} className="flex-2 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg shadow-indigo-900/40 hover:bg-indigo-500 transition-all active:scale-[0.98]">
                            {isEditing ? "Update Space" : "Publish Listing"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MySpaces;