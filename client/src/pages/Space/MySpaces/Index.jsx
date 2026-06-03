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
import { useTheme } from '@/hooks/useTheme';

const MySpaces = () => {
    const { themeColor } = useTheme();
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
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = days[now.getDay()];
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
        
        const timeToMinutes = (timeStr) => {
            if (!timeStr) return 0;
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };
        
        const hours = space.hours_json;
        const todayHours = hours?.[currentDay];
        
        let isOpenBySchedule = false;
        
        if (todayHours && todayHours.active === true) {
            const openMinutes = timeToMinutes(todayHours.open);
            const closeMinutes = timeToMinutes(todayHours.close);
            
            if (closeMinutes < openMinutes) {
                isOpenBySchedule = currentTimeMinutes >= openMinutes || currentTimeMinutes <= closeMinutes;
            } else {
                isOpenBySchedule = currentTimeMinutes >= openMinutes && currentTimeMinutes <= closeMinutes;
            }
        } else if (!hours || Object.keys(hours).length === 0) {
            isOpenBySchedule = true;
        }
        
        const totalCapacity = space.capacity || 0;
        const occupied = space.occupied_seats || 0;
        const isFull = totalCapacity > 0 && occupied >= totalCapacity;
        
        if (!isOpenBySchedule) return 'Closed';
        if (isFull) return 'Full';
        return 'Open Now';
    };

    const toggleNameExpand = (spaceId, e) => {
        e.stopPropagation();
        setExpandedNames(prev => ({
            ...prev,
            [spaceId]: !prev[spaceId]
        }));
    };

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

    const getButtonHoverColor = () => {
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

    const renderImageGallery = (space) => {
        const images = space.images?.length > 0 ? space.images : (space.image ? [space.image] : []);
        const primaryImage = space.image || images[0];
        return (
            <div className="relative h-56 bg-muted overflow-hidden cursor-pointer" onClick={() => handleOpenImageManager(space)}>
                {primaryImage ? (
                    <img
                        src={getSpaceImage(space)}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        alt={space.name}
                        onError={(e) => { e.target.src = '/placeholders/space.jpg'; }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
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
                    <h1 className="text-2xl font-black text-foreground tracking-tight uppercase italic">Space Gallery</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest">Inventory & Environment Management</p>
                </div>
                <button
                    onClick={() => navigate('/space/my-spaces/create')}
                    className={cn(
                        "bg-primary text-primary-foreground px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl active:scale-95",
                        getButtonHoverColor()
                    )}
                >
                    <Plus size={14} /> New Listing
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <div className="bg-primary/5 border border-primary/10 p-5 rounded-4xl flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <PieChart size={20} style={{ color: `var(--theme-primary)` }} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Total Listings</p>
                        <p className="text-xl font-[1000] text-foreground italic tracking-tighter">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-4xl flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Open Now</p>
                        <p className="text-xl font-[1000] text-foreground italic tracking-tighter">{stats.active}</p>
                    </div>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-4xl flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                        <Activity size={20} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Total Capacity</p>
                        <p className="text-xl font-[1000] text-foreground italic tracking-tighter">{stats.capacity}</p>
                    </div>
                </div>
            </div>

            {/* Grid - 2 columns on large screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? [1, 2].map(i => (
                    <div key={i} className="h-96 bg-card border border-border animate-pulse rounded-[2.5rem]" />
                )) : spaces.length > 0 ? spaces.map(space => {
                    const isExpanded = expandedNames[space._id];
                    const displayName = isExpanded ? space.name : truncateText(space.name, 30);
                    const needsTruncation = space.name && space.name.length > 30;
                    const dynamicStatus = getDynamicStatus(space);
                    
                    return (
                        <Card key={space._id} className="bg-card border-border overflow-hidden group shadow-2xl hover:border-primary/30 transition-all duration-500">
                            {renderImageGallery(space)}
                            <CardContent className="p-8">
                                <div className="mb-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl font-black text-foreground italic uppercase tracking-tight group-hover:text-primary transition-colors wrap-break-word whitespace-normal leading-tight">
                                                {displayName}
                                            </h3>
                                            {needsTruncation && (
                                                <button
                                                    onClick={(e) => toggleNameExpand(space._id, e)}
                                                    className="text-[8px] text-primary hover:text-primary/80 font-black uppercase tracking-wider mt-1 flex items-center gap-1"
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
                                    <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                                        <MapPin size={10} /><p className="text-[10px] font-bold uppercase tracking-widest truncate">{space.area}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    <div className="p-4 bg-muted rounded-2xl border border-border flex flex-col items-center justify-center">
                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Available</p>
                                        <p className="text-xs font-black italic text-foreground">{space.available_rooms || 'N/A'}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-2xl border border-border flex flex-col items-center justify-center">
                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                                        <p className={cn(
                                            "text-[8px] font-black uppercase tracking-tighter",
                                            dynamicStatus === 'Open Now' ? 'text-emerald-600 dark:text-emerald-400' : 
                                            dynamicStatus === 'Full' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                                        )}>
                                            {dynamicStatus}
                                        </p>
                                    </div>
                                </div>
                                {space.amenities?.length > 0 && (
                                    <div className="mb-6 flex flex-wrap gap-1">
                                        {space.amenities.slice(0, 3).map((amenity, idx) => (
                                            <span key={idx} className="text-[7px] px-2 py-1 bg-muted rounded-full text-muted-foreground">
                                                {amenity}
                                            </span>
                                        ))}
                                        {space.amenities.length > 3 && (
                                            <span className="text-[7px] px-2 py-1 bg-muted rounded-full text-muted-foreground">
                                                +{space.amenities.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleViewDetails(space)}
                                        variant="outline"
                                        className="flex-1 py-4 bg-muted text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-2 border-border"
                                    >
                                        <Eye size={14} /> View
                                    </Button>
                                    <Button
                                        onClick={() => navigate(`/space/my-spaces/edit/${space._id}`)}
                                        variant="outline"
                                        className="flex-1 py-4 bg-muted text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-2 border-border"
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
                    <div className="col-span-2 py-20 text-center border-2 border-dashed border-border rounded-[3rem] opacity-50">
                        <ImageIcon size={48} className="mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No spaces found in your gallery.</p>
                        <button
                            onClick={() => navigate('/space/my-spaces/create')}
                            className={cn(
                                "mt-4 bg-primary text-primary-foreground px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl active:scale-95",
                                getButtonHoverColor()
                            )}
                        >
                            <Plus size={14} /> Create Your First Space
                        </button>
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
                    <div className="relative bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 p-6 border border-border">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-foreground">Manage Images — {selectedSpace?.name}</h3>
                            <button onClick={() => setOpenImageModal(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-6">
                            {/* Upload Section */}
                            <div className="border-2 border-dashed border-border rounded-4xl p-4 group hover:border-primary/30 transition-all">
                                <label className="cursor-pointer block">
                                    <div className="text-center py-4">
                                        <Upload size={32} className="text-muted-foreground mx-auto mb-3 group-hover:text-primary transition-colors" />
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Click to select images</p>
                                        <p className="text-[8px] text-muted-foreground/60 mt-1">Max 10 images, 50MB each (JPG, PNG, GIF, WEBP)</p>
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
                                    <p className="text-[10px] font-black text-muted-foreground mb-2">New Images ({selectedImages.length})</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {selectedImages.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border group">
                                                <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" alt={`New ${idx + 1}`} />
                                                <button type="button" onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleUploadImages}
                                        disabled={uploadingImages}
                                        className={cn(
                                            "w-full mt-3 bg-primary text-primary-foreground px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50",
                                            getButtonHoverColor()
                                        )}
                                    >
                                        {uploadingImages ? 'Uploading…' : `Upload ${selectedImages.length} Image(s)`}
                                    </button>
                                </div>
                            )}

                            {selectedSpace?.images?.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground mb-2">Existing Images ({selectedSpace.images.length})</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {selectedSpace.images.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border group">
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