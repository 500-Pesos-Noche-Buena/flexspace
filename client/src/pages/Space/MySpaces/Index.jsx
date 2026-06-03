import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ViewSpaceModal } from '@/components/modal';
import { apiGet, apiPost } from '@/utils/Api';
import {
    Plus, Image as ImageIcon, Trash2, Edit3, Users,
    MapPin, Activity, CheckCircle, PieChart, Grid,
    X, Upload, Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import { showToast, showConfirm } from '@/components/ui/SweetAlert2';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import { getSpaceImage } from '@/utils/imageHelper';

const MySpaces = () => {
    const navigate = useNavigate();
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openImageModal, setOpenImageModal] = useState(false);
    const [selectedSpace, setSelectedSpace] = useState(null);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const [expandedNames, setExpandedNames] = useState({});

    const [openViewModal, setOpenViewModal] = useState(false);
    const [viewingSpace, setViewingSpace] = useState(null);

// Helper function to get dynamic status based on schedule and capacity
const getDynamicStatus = (space) => {
    if (!space) return 'Closed';
    
    const now = new Date();
    // Fix: Use valid weekday option
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Helper to convert time string to minutes
    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };
    
    // Check operating hours
    const hours = space.hours_json;
    const todayHours = hours?.[currentDay];
    
    let isOpenBySchedule = false;
    
    if (todayHours && todayHours.active === true) {
        const openMinutes = timeToMinutes(todayHours.open);
        const closeMinutes = timeToMinutes(todayHours.close);
        
        // Handle overnight hours
        if (closeMinutes < openMinutes) {
            isOpenBySchedule = currentTimeMinutes >= openMinutes || currentTimeMinutes <= closeMinutes;
        } else {
            isOpenBySchedule = currentTimeMinutes >= openMinutes && currentTimeMinutes <= closeMinutes;
        }
    } else if (!hours || Object.keys(hours).length === 0) {
        // If no schedule defined, assume always open
        isOpenBySchedule = true;
    }
    
    // Check capacity
    const totalCapacity = space.capacity || 0;
    const occupied = space.occupied_seats || 0;
    const isFull = totalCapacity > 0 && occupied >= totalCapacity;
    
    if (!isOpenBySchedule) {
        return 'Closed';
    }
    
    if (isFull) {
        return 'Full';
    }
    
    return 'Open Now';
};

    // Toggle expand/collapse for long names
    const toggleNameExpand = (spaceId, e) => {
        e.stopPropagation();
        setExpandedNames(prev => ({
            ...prev,
            [spaceId]: !prev[spaceId]
        }));
    };

    // Truncate text function
    const truncateText = (text, maxLength = 30) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const handleViewDetails = (space) => {
        setViewingSpace(space);
        setOpenViewModal(true);
    };

    const stats = useMemo(() => ({
        total: spaces.length,
        active: spaces.filter(s => getDynamicStatus(s) === 'Open Now').length,
        capacity: spaces.reduce((acc, curr) => acc + (Number(curr.capacity) || 0), 0),
    }), [spaces]);

    const fetchSpaces = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiGet('/space/spaces');
            if (response.success) setSpaces(response.data || []);
        } catch (error) {
            showToast({ icon: 'error', title: 'Failed to fetch spaces' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSpaces(); }, [fetchSpaces]);

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
            selectedImages.forEach(f => data.append('images', f));
            const res = await apiPost(`/space/spaces/${selectedSpace._id}/add-images`, data);
            if (res.success) {
                showToast({ icon: 'success', title: `${selectedImages.length} image(s) added` });
                setSelectedImages([]);
                setOpenImageModal(false);
                fetchSpaces();
            }
        } catch {
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
                        fetchSpaces();
                        setSelectedSpace(prev => ({
                            ...prev,
                            images: prev.images.filter(img => img !== imageUrl),
                            image: prev.image === imageUrl ? (prev.images.find(i => i !== imageUrl) || null) : prev.image,
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
                fetchSpaces();
                setSelectedSpace(prev => ({ ...prev, image: imageUrl }));
            }
        } catch {
            showToast({ icon: 'error', title: 'Failed to update primary image' });
        }
    };

    const renderImageGallery = (space) => {
        const images = space.images?.length > 0 ? space.images : (space.image ? [space.image] : []);
        const primaryImage = space.image || images[0];
        return (
            <div className="relative h-56 bg-white/5 overflow-hidden cursor-pointer" onClick={() => handleOpenImageManager(space)}>
                {primaryImage ? (
                    <img
                        src={getSpaceImage(space)}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        alt={space.name}
                        onError={(e) => { e.target.src = '/placeholders/space.jpg'; }}
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
                    <span className="px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black text-white uppercase tracking-wider">
                        ₱{space.rate_hour}/hr
                    </span>
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="sm" variant="outline" className="bg-white/20 text-white border-white/50">
                        <Grid size={14} className="mr-2" /> Manage Images
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-12">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Space Gallery</h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Inventory & Environment Management</p>
                </div>
                <Button
                    onClick={() => navigate('/space/my-spaces/create')}
                    className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 group active:scale-95"
                >
                    <Plus size={14} className="group-hover:rotate-90 transition-transform" /> New Listing
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <div className="bg-indigo-500/5 border border-indigo-500/10 p-5 rounded-4xl flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><PieChart size={20} /></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Listings</p><p className="text-xl font-[1000] text-white italic tracking-tighter">{stats.total}</p></div>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-4xl flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle size={20} /></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Open Now</p><p className="text-xl font-[1000] text-white italic tracking-tighter">{stats.active}</p></div>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-4xl flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Activity size={20} /></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Capacity</p><p className="text-xl font-[1000] text-white italic tracking-tighter">{stats.capacity}</p></div>
                </div>
            </div>

            {/* Grid - 2 columns on large screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? [1, 2].map(i => (
                    <div key={i} className="h-96 bg-[#111114] border border-white/5 animate-pulse rounded-[2.5rem]" />
                )) : spaces.length > 0 ? spaces.map(space => {
                    const isExpanded = expandedNames[space._id];
                    const displayName = isExpanded ? space.name : truncateText(space.name, 30);
                    const needsTruncation = space.name && space.name.length > 30;
                    const dynamicStatus = getDynamicStatus(space);
                    
                    return (
                        <Card key={space._id} className="bg-[#111114] border-white/5 overflow-hidden group shadow-2xl hover:border-indigo-500/30 transition-all duration-500">
                            {renderImageGallery(space)}
                            <CardContent className="p-8">
                                <div className="mb-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl font-black text-white italic uppercase tracking-tight group-hover:text-indigo-400 transition-colors wrap-break-word whitespace-normal leading-tight">
                                                {displayName}
                                            </h3>
                                            {needsTruncation && (
                                                <button
                                                    onClick={(e) => toggleNameExpand(space._id, e)}
                                                    className="text-[8px] text-indigo-400 hover:text-indigo-300 font-black uppercase tracking-wider mt-1 flex items-center gap-1"
                                                >
                                                    {isExpanded ? (
                                                        <>See less <ChevronUp size={10} /></>
                                                    ) : (
                                                        <>See more <ChevronDown size={10} /></>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 text-slate-500">
                                        <MapPin size={10} /><p className="text-[10px] font-bold uppercase tracking-widest truncate">{space.area}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Available</p>
                                        <p className="text-xs font-black italic text-white">{space.available_rooms || 'N/A'}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                        <p className={cn(
                                            "text-[8px] font-black uppercase tracking-tighter",
                                            dynamicStatus === 'Open Now' ? 'text-emerald-500' : 
                                            dynamicStatus === 'Full' ? 'text-amber-500' : 'text-rose-500'
                                        )}>
                                            {dynamicStatus}
                                        </p>
                                    </div>
                                </div>
                                {space.amenities?.length > 0 && (
                                    <div className="mb-6 flex flex-wrap gap-1">
                                        {space.amenities.slice(0, 3).map((amenity, idx) => (
                                            <span key={idx} className="text-[7px] px-2 py-1 bg-white/5 rounded-full text-slate-400">
                                                {amenity}
                                            </span>
                                        ))}
                                        {space.amenities.length > 3 && (
                                            <span className="text-[7px] px-2 py-1 bg-white/5 rounded-full text-slate-400">
                                                +{space.amenities.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleViewDetails(space)}
                                        variant="outline"
                                        className="flex-1 py-4 bg-white/5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 border-white/10"
                                    >
                                        <Eye size={14} /> View
                                    </Button>
                                    <Button
                                        onClick={() => navigate(`/space/my-spaces/edit/${space._id}`)}
                                        variant="outline"
                                        className="flex-1 py-4 bg-white/5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 border-white/10"
                                    >
                                        <Edit3 size={14} /> Edit
                                    </Button>
                                    <Button
                                        onClick={() => handleDelete(space._id)}
                                        variant="destructive"
                                        className="w-14 h-14 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                }) : (
                    <div className="col-span-2 py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-50">
                        <ImageIcon size={48} className="mx-auto text-slate-700 mb-4" />
                        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No spaces found in your gallery.</p>
                        <Button onClick={() => navigate('/space/my-spaces/create')} className="mt-4 bg-indigo-600">
                            Create Your First Space
                        </Button>
                    </div>
                )}
            </div>

            <ViewSpaceModal
                isOpen={openViewModal}
                onClose={() => setOpenViewModal(false)}
                space={viewingSpace}
            />

            {/* Image Management Modal */}
            {openImageModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/80" onClick={() => setOpenImageModal(false)} />
                    <div className="relative bg-[#111114] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 p-6 border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-white">Manage Images — {selectedSpace?.name}</h3>
                            <button onClick={() => setOpenImageModal(false)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-6">
                            {/* Upload Section */}
                            <div className="border-2 border-dashed border-white/5 rounded-4xl p-4 group hover:border-indigo-500/30 transition-all">
                                <label className="cursor-pointer block">
                                    <div className="text-center py-4">
                                        <Upload size={32} className="text-slate-700 mx-auto mb-3 group-hover:text-indigo-500 transition-colors" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Click to select images</p>
                                        <p className="text-[8px] text-slate-600 mt-1">Max 10 images, 50MB each (JPG, PNG, GIF, WEBP)</p>
                                    </div>
                                    <input type="file" accept="image/*" multiple onChange={(e) => {
                                        const files = Array.from(e.target.files);
                                        if (selectedImages.length + files.length > 10) {
                                            showToast({ icon: 'warning', title: 'Maximum 10 images total' });
                                            return;
                                        }
                                        setSelectedImages(prev => [...prev, ...files]);
                                        e.target.value = '';
                                    }} className="hidden" />
                                </label>
                            </div>

                            {selectedImages.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 mb-2">New Images ({selectedImages.length})</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {selectedImages.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 group">
                                                <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" alt={`New ${idx + 1}`} />
                                                <button type="button" onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button onClick={handleUploadImages} disabled={uploadingImages} className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500">
                                        {uploadingImages ? 'Uploading…' : `Upload ${selectedImages.length} Image(s)`}
                                    </Button>
                                </div>
                            )}

                            {selectedSpace?.images?.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 mb-2">Existing Images ({selectedSpace.images.length})</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {selectedSpace.images.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 group">
                                                <img src={getSpaceImage({ ...selectedSpace, image: img })} className="w-full h-full object-cover" alt={`Image ${idx + 1}`}
                                                    onError={(e) => { e.target.src = '/placeholders/space.jpg'; }} />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                                    <button type="button" onClick={() => handleSetPrimaryImage(img)}
                                                        className="text-white border border-white/50 rounded px-2 py-1 text-[8px] font-black hover:bg-white/20 transition-all">
                                                        Set as Primary
                                                    </button>
                                                    <button type="button" onClick={() => handleRemoveSingleImage(img)}
                                                        className="text-red-400 border border-red-500/50 rounded px-2 py-1 text-[8px] font-black hover:bg-red-500/20 transition-all">
                                                        Remove
                                                    </button>
                                                </div>
                                                {selectedSpace.image === img && (
                                                    <div className="absolute top-1 left-1 bg-emerald-500/80 text-white text-[8px] font-black px-1 py-0.5 rounded">Primary</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MySpaces;