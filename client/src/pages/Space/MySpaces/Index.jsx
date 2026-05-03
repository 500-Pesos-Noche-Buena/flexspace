import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import {
    Plus, Image as ImageIcon, Trash2, Edit3, Users,
    MapPin, DollarSign, ChevronDown, Activity,
    CheckCircle, PieChart, X, Upload, Grid, Clock, FileText
} from 'lucide-react';
import { showToast, showConfirm } from '@/components/ui/SweetAlert2';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import { getSpaceImage } from '@/utils/imageHelper';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MySpaces = () => {
    const [spaces, setSpaces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [openImageModal, setOpenImageModal] = useState(false);
    const [selectedSpace, setSelectedSpace] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);

    const [formData, setFormData] = useState({
        name: '', area: '', rate_hour: '', capacity: '', status: 'Open Now',
        images: [],
        image: null,
        lat: '', lng: '', district_id: '', available_rooms: '',
        description: '',
        hours_json: {
            monday: { active: true, open: '08:00', close: '20:00' },
            tuesday: { active: true, open: '08:00', close: '20:00' },
            wednesday: { active: true, open: '08:00', close: '20:00' },
            thursday: { active: true, open: '08:00', close: '20:00' },
            friday: { active: true, open: '08:00', close: '20:00' },
            saturday: { active: true, open: '09:00', close: '18:00' },
            sunday: { active: false, open: '10:00', close: '17:00' }
        }
    });

    const stats = useMemo(() => {
        return {
            total: spaces.length,
            active: spaces.filter(s => s.status === 'Open Now').length,
            capacity: spaces.reduce((acc, curr) => acc + (Number(curr.capacity) || 0), 0)
        };
    }, [spaces]);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [spaceRes, districtRes] = await Promise.all([
                apiGet('/space/spaces'),
                apiGet('/space/districts/active')
            ]);
            if (spaceRes.success) setSpaces(spaceRes.data || []);
            if (districtRes.success) setDistricts(districtRes.data || []);
        } catch {
            showToast({ icon: 'error', title: 'Failed to sync data' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleOpenCreate = () => {
        setIsEditing(false);
        setFormData({
            name: '', area: '', rate_hour: '', capacity: '',
            status: 'Open Now', images: [], image: null, lat: '', lng: '',
            district_id: '', available_rooms: '',
            description: '',
            hours_json: {
                monday: { active: true, open: '08:00', close: '20:00' },
                tuesday: { active: true, open: '08:00', close: '20:00' },
                wednesday: { active: true, open: '08:00', close: '20:00' },
                thursday: { active: true, open: '08:00', close: '20:00' },
                friday: { active: true, open: '08:00', close: '20:00' },
                saturday: { active: true, open: '09:00', close: '18:00' },
                sunday: { active: false, open: '10:00', close: '17:00' }
            }
        });
        setOpenModal(true);
    };

    const handleOpenEdit = (space) => {
        setIsEditing(true);
        setSelectedSpace(space);
        
        // Parse hours_json if it exists
        let hoursData = formData.hours_json;
        if (space.hours_json) {
            try {
                hoursData = typeof space.hours_json === 'string' 
                    ? JSON.parse(space.hours_json) 
                    : space.hours_json;
            } catch (e) {
                hoursData = formData.hours_json;
            }
        }
        
        setFormData({
            ...space,
            images: [],
            image: space.image,
            lat: space.lat || '',
            lng: space.lng || '',
            description: space.description || '',
            hours_json: hoursData
        });
        setOpenModal(true);
    };

    const handleOpenImageManager = (space) => {
        setSelectedSpace(space);
        setSelectedImages([]);
        setOpenImageModal(true);
    };

    const handleUploadImages = async () => {
        if (selectedImages.length === 0) {
            showToast({ icon: 'warning', title: 'Please select images to upload' });
            return;
        }

        setUploadingImages(true);
        try {
            const data = new FormData();
            for (let i = 0; i < selectedImages.length; i++) {
                data.append('images', selectedImages[i]);
            }

            const res = await apiPost(`/space/spaces/${selectedSpace._id}/add-images`, data);
            if (res.success) {
                showToast({ icon: 'success', title: `${selectedImages.length} image(s) added` });
                setSelectedImages([]);
                setOpenImageModal(false);
                fetchInitialData();
            }
        } catch (err) {
            showToast({ icon: 'error', title: 'Upload failed' });
        } finally {
            setUploadingImages(false);
        }
    };

    const handleRemoveSingleImage = async (imageUrl) => {
        setOpenImageModal(false);
        
        setTimeout(async () => {
            if (await showConfirm("Remove this image?", "This action cannot be undone.")) {
                try {
                    const res = await apiPost(`/space/spaces/${selectedSpace._id}/remove-image`, { image: imageUrl });
                    if (res.success) {
                        showToast({ icon: 'success', title: 'Image removed' });
                        fetchInitialData();
                        setSelectedSpace(prev => ({
                            ...prev,
                            images: prev.images.filter(img => img !== imageUrl),
                            image: prev.image === imageUrl ? (prev.images[0] || null) : prev.image
                        }));
                    }
                } catch {
                    showToast({ icon: 'error', title: 'Failed to remove image' });
                }
            }
            setOpenImageModal(true);
        }, 100);
    };

    const handleSetPrimaryImage = async (imageUrl) => {
        try {
            const res = await apiPost(`/space/spaces/${selectedSpace._id}/set-primary`, { image: imageUrl });
            if (res.success) {
                showToast({ icon: 'success', title: 'Primary image updated' });
                fetchInitialData();
                setSelectedSpace(prev => ({
                    ...prev,
                    image: imageUrl
                }));
            }
        } catch {
            showToast({ icon: 'error', title: 'Failed to update primary image' });
        }
    };

    const handleHoursChange = (day, field, value) => {
        setFormData({
            ...formData,
            hours_json: {
                ...formData.hours_json,
                [day]: {
                    ...formData.hours_json[day],
                    [field]: value
                }
            }
        });
    };

    const handleSave = async () => {
        try {
            const url = isEditing ? `/space/spaces/${selectedSpace._id}/update` : '/space/spaces';
            const data = new FormData();

            Object.keys(formData).forEach(key => {
                if (key === 'images' && formData.images && formData.images.length > 0) {
                    for (let i = 0; i < formData.images.length; i++) {
                        if (formData.images[i] instanceof File) {
                            data.append('images', formData.images[i]);
                        }
                    }
                } else if (key === 'image') {
                    if (formData.image instanceof File) {
                        data.append('image', formData.image);
                    }
                } else if (key === 'hours_json') {
                    data.append('hours_json', JSON.stringify(formData.hours_json));
                } else if (key === 'description') {
                    if (formData.description) {
                        data.append('description', formData.description);
                    }
                } else if (key !== 'images' && formData[key] !== undefined && formData[key] !== null) {
                    data.append(key, formData[key].toString());
                }
            });

            const res = await apiPost(url, data);
            if (res.success) {
                showToast({ icon: 'success', title: isEditing ? 'Space updated' : 'Listing published' });
                setOpenModal(false);
                fetchInitialData();
            }
        } catch (err) {
            console.error(err);
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
            } catch {
                showToast({ icon: 'error', title: 'Delete failed' });
            }
        }
    };

    const renderImageGallery = (space) => {
        const images = space.images && space.images.length > 0 ? space.images : (space.image ? [space.image] : []);
        const primaryImage = space.image || (images[0]);

        return (
            <div className="relative h-56 bg-white/5 overflow-hidden cursor-pointer" onClick={() => handleOpenImageManager(space)}>
                {primaryImage ? (
                    <img
                        src={getSpaceImage(space)}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        alt={space.name}
                        onError={(e) => {
                            console.error('Failed to load image:', primaryImage);
                            e.target.src = '/placeholders/space.jpg';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-800">
                        <ImageIcon size={48} strokeWidth={1} />
                    </div>
                )}
                {images.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg">
                        <p className="text-white text-[8px] font-black">+{images.length - 1} more</p>
                    </div>
                )}
                <div className="absolute top-5 left-5">
                    <span className="px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black text-white uppercase tracking-wider">₱{space.rate_hour}/hr</span>
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="sm" variant="outline" className="bg-white/20 text-white border-white/50">
                        <Grid size={14} className="mr-2" /> Manage Images
                    </Button>
                </div>
            </div>
        );
    };

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-12">
            {/* Header Section */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Space Gallery</h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Inventory & Environment Management</p>
                </div>
                <Button
                    onClick={handleOpenCreate}
                    className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 group active:scale-95"
                >
                    <Plus size={14} className="group-hover:rotate-90 transition-transform" /> New Listing
                </Button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <div className="bg-indigo-500/5 border border-indigo-500/10 p-5 rounded-4xl flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><PieChart size={20} /></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Listings</p><p className="text-xl font-[1000] text-white italic tracking-tighter">{stats.total}</p></div>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-4xl flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle size={20} /></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Active Spaces</p><p className="text-xl font-[1000] text-white italic tracking-tighter">{stats.active}</p></div>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-4xl flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Activity size={20} /></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Capacity</p><p className="text-xl font-[1000] text-white italic tracking-tighter">{stats.capacity}</p></div>
                </div>
            </div>

            {/* Grid Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? [1, 2, 3].map((i) => (
                    <div key={i} className="h-96 bg-[#111114] border border-white/5 animate-pulse rounded-[2.5rem]" />
                )) : spaces.length > 0 ? spaces.map((space) => (
                    <Card key={space._id} className="bg-[#111114] border-white/5 overflow-hidden group shadow-2xl hover:border-indigo-500/30 transition-all duration-500">
                        {renderImageGallery(space)}
                        <CardContent className="p-8">
                            <div className="mb-4">
                                <h3 className="text-xl font-black text-white italic uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{space.name}</h3>
                                <div className="flex items-center gap-1 mt-1 text-slate-500"><MapPin size={10} /><p className="text-[10px] font-bold uppercase tracking-widest">{space.area}</p></div>
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
                                <Button onClick={() => handleOpenEdit(space)} variant="outline" className="flex-1 py-4 bg-white/5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 border-white/10">
                                    <Edit3 size={14} /> Edit
                                </Button>
                                <Button onClick={() => handleDelete(space._id)} variant="destructive" className="w-14 h-14 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20">
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )) : (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-50">
                        <ImageIcon size={48} className="mx-auto text-slate-700 mb-4" />
                        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No spaces found in your gallery.</p>
                    </div>
                )}
            </div>

            {/* Image Management Modal */}
            <Modal open={openImageModal} onClose={() => setOpenImageModal(false)} title={`Manage Images - ${selectedSpace?.name}`} size="lg" variant="dark">
                <div className="space-y-6 py-2">
                    {/* Upload Section */}
                    <div className="border-2 border-dashed border-white/5 rounded-4xl p-4 group hover:border-indigo-500/30 transition-all">
                        <label className="cursor-pointer block">
                            <div className="text-center py-4">
                                <Upload size={32} className="text-slate-700 mx-auto mb-3 group-hover:text-indigo-500 transition-colors" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Click to select images</p>
                                <p className="text-[8px] text-slate-600 mt-1">Max 10 images, 5MB each (JPG, PNG, GIF)</p>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                    const files = Array.from(e.target.files);
                                    if (selectedImages.length + files.length > 10) {
                                        showToast({ icon: 'warning', title: 'Maximum 10 images total' });
                                        return;
                                    }
                                    setSelectedImages([...selectedImages, ...files]);
                                    e.target.value = '';
                                }}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {/* Selected Images Preview */}
                    {selectedImages.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-slate-500 mb-2">New Images ({selectedImages.length})</p>
                            <div className="grid grid-cols-4 gap-2">
                                {selectedImages.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 group">
                                        <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" alt={`New ${idx + 1}`} />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedImages(selectedImages.filter((_, i) => i !== idx));
                                            }}
                                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={handleUploadImages} disabled={uploadingImages} className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500">
                                {uploadingImages ? 'Uploading...' : `Upload ${selectedImages.length} Image(s)`}
                            </Button>
                        </div>
                    )}

                    {/* Existing Images Gallery */}
                    {selectedSpace?.images && selectedSpace.images.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-slate-500 mb-2">Existing Images ({selectedSpace.images.length})</p>
                            <div className="grid grid-cols-4 gap-2">
                                {selectedSpace.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 group">
                                        <img 
                                            src={getSpaceImage({ ...selectedSpace, image: img })} 
                                            className="w-full h-full object-cover" 
                                            alt={`Image ${idx + 1}`}
                                            onError={(e) => e.target.src = '/placeholders/space.jpg'}
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSetPrimaryImage(img);
                                                }}
                                                className="text-white border border-white/50 rounded px-2 py-1 text-[8px] font-black hover:bg-white/20 transition-all"
                                            >
                                                Set as Primary
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveSingleImage(img);
                                                }}
                                                className="text-red-400 border border-red-500/50 rounded px-2 py-1 text-[8px] font-black hover:bg-red-500/20 transition-all"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        {selectedSpace.image === img && (
                                            <div className="absolute top-1 left-1 bg-emerald-500/80 text-white text-[8px] font-black px-1 py-0.5 rounded">
                                                Primary
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Create/Edit Space Modal */}
            <Modal open={openModal} onClose={() => setOpenModal(false)} title={isEditing ? "Modify Space" : "Create Listing"} size="lg" variant="dark">
                <div className="space-y-6 py-2 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">
                    {/* Basic Info */}
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

                    {/* Pricing & Capacity */}
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

                    {/* Location */}
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

                    {/* Additional Info */}
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

                    {/* Description */}
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows="4"
                            placeholder="Describe your space... (amenities, atmosphere, ideal for, etc.)"
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold resize-none"
                        />
                    </div>

                    {/* Weekly Schedule */}
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center gap-2 mb-6">
                            <Clock size={16} className="text-indigo-400" />
                            <h3 className="text-sm font-black text-white uppercase tracking-tighter">Weekly Schedule</h3>
                        </div>
                        <div className="space-y-3">
                            {days.map((day, index) => (
                                <div key={day} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.hours_json[day]?.active ?? true}
                                            onChange={(e) => handleHoursChange(day, 'active', e.target.checked)}
                                            className="w-4 h-4 accent-indigo-500 rounded"
                                        />
                                        <span className="text-xs font-black capitalize text-slate-300">{dayLabels[index]}</span>
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="time"
                                            value={formData.hours_json[day]?.open || '09:00'}
                                            onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                                            disabled={!formData.hours_json[day]?.active}
                                            className="bg-transparent text-xs font-bold text-white outline-none focus:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                        />
                                        <span className="text-[10px] font-black text-slate-500">TO</span>
                                        <input
                                            type="time"
                                            value={formData.hours_json[day]?.close || '18:00'}
                                            onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                                            disabled={!formData.hours_json[day]?.active}
                                            className="bg-transparent text-xs font-bold text-white outline-none focus:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Images Upload */}
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Space Images (Max 10)</label>
                        <div className="mt-2">
                            <label className="cursor-pointer">
                                <div className="border-2 border-dashed border-white/5 rounded-4xl p-4 group hover:border-indigo-500/30 transition-all text-center">
                                    <ImageIcon size={32} className="text-slate-700 mx-auto mb-3 group-hover:text-indigo-500 transition-colors" />
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Click to select images</p>
                                    <p className="text-[8px] text-slate-600 mt-1">Max 10 images, 5MB each (JPG, PNG, GIF)</p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files);
                                        if (files.length > 10) {
                                            showToast({ icon: 'warning', title: 'Maximum 10 images allowed' });
                                            return;
                                        }
                                        setFormData({ ...formData, images: [...formData.images, ...files] });
                                        e.target.value = '';
                                    }}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {/* Image Preview Grid */}
                        {formData.images && formData.images.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/10 group/image">
                                        <img
                                            src={img instanceof File ? URL.createObjectURL(img) : getSpaceImage({ ...selectedSpace, image: img })}
                                            className="w-full h-full object-cover"
                                            alt={`Preview ${idx + 1}`}
                                            onError={(e) => e.target.src = '/placeholders/space.jpg'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newImages = [...formData.images];
                                                newImages.splice(idx, 1);
                                                setFormData({ ...formData, images: newImages });
                                            }}
                                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-red-600"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Show existing images in edit mode */}
                        {isEditing && selectedSpace?.images && selectedSpace.images.length > 0 && formData.images.length === 0 && (
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                {selectedSpace.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/10">
                                        <img 
                                            src={getSpaceImage({ ...selectedSpace, image: img })} 
                                            className="w-full h-full object-cover" 
                                            alt={`Existing ${idx + 1}`}
                                            onError={(e) => e.target.src = '/placeholders/space.jpg'}
                                        />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <span className="text-white text-[8px] font-black">Existing</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setOpenModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg shadow-indigo-900/40 hover:bg-indigo-500 transition-all active:scale-[0.98]">
                            {isEditing ? "Update Space" : "Publish Listing"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MySpaces;