import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import {
    Plus, Image as ImageIcon, Trash2, Edit3, Users,
    MapPin, DollarSign, ChevronDown, Activity,
    CheckCircle, PieChart, X, Upload, Grid, Clock,
    Crosshair, Search, AlertCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Hide Leaflet attribution watermark globally
const leafletAttributionStyle = document.createElement('style');
leafletAttributionStyle.textContent = `.leaflet-control-attribution { display: none !important; }`;
if (!document.head.querySelector('[data-leaflet-attribution-hide]')) {
    leafletAttributionStyle.setAttribute('data-leaflet-attribution-hide', '');
    document.head.appendChild(leafletAttributionStyle);
}

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

import { showToast, showConfirm } from '@/components/ui/SweetAlert2';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import { getSpaceImage } from '@/utils/imageHelper';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Sub-components for map interaction ──────────────────────────────────────

/**
 * Handles click events on the map and calls onLocationSelect with {lat, lng}.
 * Must be rendered as a child of <MapContainer>.
 */
const MapClickHandler = ({ onLocationSelect }) => {
    useMapEvents({
        click(e) {
            onLocationSelect({
                lat: e.latlng.lat.toFixed(6),
                lng: e.latlng.lng.toFixed(6),
            });
        },
    });
    return null;
};

/**
 * Flies the map view to the given center whenever it changes.
 * Prevents the map from being stuck at the initial center after programmatic updates.
 */
const MapFlyTo = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center[0] && center[1]) {
            map.flyTo(center, map.getZoom(), { animate: true, duration: 0.8 });
        }
    }, [center[0], center[1]]);
    return null;
};

// ─── Geocoding helper ─────────────────────────────────────────────────────────

const geocodeAddress = async (address) => {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
        );
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat).toFixed(6), lng: parseFloat(data[0].lon).toFixed(6) };
        }
        return null;
    } catch {
        return null;
    }
};

// ─── Default hours helper ─────────────────────────────────────────────────────

const defaultHours = () => ({
    monday:    { active: true,  open: '08:00', close: '20:00' },
    tuesday:   { active: true,  open: '08:00', close: '20:00' },
    wednesday: { active: true,  open: '08:00', close: '20:00' },
    thursday:  { active: true,  open: '08:00', close: '20:00' },
    friday:    { active: true,  open: '08:00', close: '20:00' },
    saturday:  { active: true,  open: '09:00', close: '18:00' },
    sunday:    { active: false, open: '10:00', close: '17:00' },
});

const emptyForm = () => ({
    name: '', area: '', rate_hour: '', capacity: '',
    status: 'Open Now', images: [], image: null,
    lat: '', lng: '', district_id: '', available_rooms: '',
    description: '', amenities: [],
    hours_json: defaultHours(),
});

// ─── Address Search Modal (inline) ────────────────────────────────────────────

const AddressSearchBar = ({ onResult }) => {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setSearching(true);
        const result = await geocodeAddress(query);
        setSearching(false);
        if (result) {
            onResult(result);
        } else {
            showToast({ icon: 'warning', title: 'Address not found. Try a more specific query.' });
        }
    };

    return (
        <div className="flex gap-2 mb-3">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search address or landmark…"
                className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-indigo-500 transition-all font-medium placeholder:text-slate-600"
            />
            <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1"
            >
                <Search size={12} />
                {searching ? 'Searching…' : 'Go'}
            </button>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

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
    const [formData, setFormData] = useState(emptyForm());

    const stats = useMemo(() => ({
        total: spaces.length,
        active: spaces.filter(s => s.status === 'Open Now').length,
        capacity: spaces.reduce((acc, curr) => acc + (Number(curr.capacity) || 0), 0),
    }), [spaces]);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [spaceRes, districtRes] = await Promise.all([
                apiGet('/space/spaces'),
                apiGet('/space/districts/active'),
            ]);
            if (spaceRes.success) setSpaces(spaceRes.data || []);
            if (districtRes.success) setDistricts(districtRes.data || []);
        } catch {
            showToast({ icon: 'error', title: 'Failed to sync data' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const setLocation = useCallback(({ lat, lng }) => {
        setFormData(prev => ({ ...prev, lat, lng }));
    }, []);

    const handleHoursChange = (day, field, value) => {
        setFormData(prev => ({
            ...prev,
            hours_json: { ...prev.hours_json, [day]: { ...prev.hours_json[day], [field]: value } },
        }));
    };

    // ── Modal open/close ──────────────────────────────────────────────────────

    const handleOpenCreate = () => {
        setIsEditing(false);
        setSelectedSpace(null);
        setFormData(emptyForm());
        setOpenModal(true);
    };

    const handleOpenEdit = (space) => {
        setIsEditing(true);
        setSelectedSpace(space);
        let hoursData = defaultHours();
        if (space.hours_json) {
            try {
                hoursData = typeof space.hours_json === 'string'
                    ? JSON.parse(space.hours_json)
                    : space.hours_json;
            } catch { /* keep defaults */ }
        }
        setFormData({
            ...emptyForm(),
            ...space,
            images: [],
            image: space.image || null,
            lat: space.lat || '',
            lng: space.lng || '',
            description: space.description || '',
            amenities: space.amenities || [],
            hours_json: hoursData,
        });
        setOpenModal(true);
    };

    const handleOpenImageManager = (space) => {
        setSelectedSpace(space);
        setSelectedImages([]);
        setOpenImageModal(true);
    };

    // ── Image actions ─────────────────────────────────────────────────────────

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
                fetchInitialData();
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
                        fetchInitialData();
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
                fetchInitialData();
                setSelectedSpace(prev => ({ ...prev, image: imageUrl }));
            }
        } catch {
            showToast({ icon: 'error', title: 'Failed to update primary image' });
        }
    };

    // ── Save / Delete ─────────────────────────────────────────────────────────

    const handleSave = async () => {
        try {
            const url = isEditing
                ? `/space/spaces/${selectedSpace._id}/update`
                : '/space/spaces';
            const data = new FormData();

            Object.keys(formData).forEach(key => {
                if (key === 'images') {
                    formData.images.forEach(f => { if (f instanceof File) data.append('images', f); });
                } else if (key === 'image') {
                    if (formData.image instanceof File) data.append('image', formData.image);
                } else if (key === 'hours_json') {
                    data.append('hours_json', JSON.stringify(formData.hours_json));
                } else if (key === 'amenities') {
                    data.append('amenities', JSON.stringify(formData.amenities));
                } else if (formData[key] !== undefined && formData[key] !== null) {
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

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            showToast({ icon: 'error', title: 'Geolocation not supported by your browser' });
            return;
        }
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setLocation({
                    lat: coords.latitude.toFixed(6),
                    lng: coords.longitude.toFixed(6),
                });
                showToast({ icon: 'success', title: '📍 Location set to your current position!' });
            },
            () => showToast({ icon: 'error', title: 'Unable to get your location. Check browser permissions.' })
        );
    };

    // ── Render helpers ────────────────────────────────────────────────────────

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

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Map center derived from formData — falls back to Iloilo City
    const mapCenter = [
        parseFloat(formData.lat) || 10.7202,
        parseFloat(formData.lng) || 122.5621,
    ];
    const hasLocation = !!(formData.lat && formData.lng);

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-12">
            {/* Header */}
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

            {/* Stats */}
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

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? [1, 2, 3].map(i => (
                    <div key={i} className="h-96 bg-[#111114] border border-white/5 animate-pulse rounded-[2.5rem]" />
                )) : spaces.length > 0 ? spaces.map(space => (
                    <Card key={space._id} className="bg-[#111114] border-white/5 overflow-hidden group shadow-2xl hover:border-indigo-500/30 transition-all duration-500">
                        {renderImageGallery(space)}
                        <CardContent className="p-8">
                            <div className="mb-4">
                                <h3 className="text-xl font-black text-white italic uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{space.name}</h3>
                                <div className="flex items-center gap-1 mt-1 text-slate-500">
                                    <MapPin size={10} /><p className="text-[10px] font-bold uppercase tracking-widest">{space.area}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Available</p>
                                    <p className="text-xs font-black italic text-white">{space.available_rooms || 'N/A'}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                    <p className={cn("text-[8px] font-black uppercase tracking-tighter", space.status === 'Open Now' ? 'text-emerald-500' : 'text-rose-500')}>
                                        {space.status}
                                    </p>
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

            {/* ── Image Management Modal ─────────────────────────────────────────── */}
            <Modal open={openImageModal} onClose={() => setOpenImageModal(false)} title={`Manage Images — ${selectedSpace?.name}`} size="lg" variant="dark">
                <div className="space-y-6 py-2">
                    <div className="border-2 border-dashed border-white/5 rounded-4xl p-4 group hover:border-indigo-500/30 transition-all">
                        <label className="cursor-pointer block">
                            <div className="text-center py-4">
                                <Upload size={32} className="text-slate-700 mx-auto mb-3 group-hover:text-indigo-500 transition-colors" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Click to select images</p>
                                <p className="text-[8px] text-slate-600 mt-1">Max 10 images, 5MB each (JPG, PNG, GIF)</p>
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
            </Modal>

            {/* ── Create / Edit Modal ────────────────────────────────────────────── */}
            <Modal open={openModal} onClose={() => setOpenModal(false)} title={isEditing ? "Modify Space" : "Create Listing"} size="xl" variant="dark">
                <div className="space-y-6 py-2 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Space Name</label>
                            <input type="text" value={formData.name}
                                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">District / Location</label>
                            <div className="relative">
                                <select value={formData.district_id}
                                    onChange={(e) => {
                                        const d = districts.find(x => x._id === e.target.value);
                                        setFormData(p => ({ ...p, district_id: e.target.value, area: d ? d.name : '' }));
                                    }}
                                    className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold appearance-none cursor-pointer">
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
                                <DollarSign size={14} className="absolute left-4 top-1/2 translate-y-1.5 text-slate-600" />
                                <input type="number" value={formData.rate_hour}
                                    onChange={(e) => setFormData(p => ({ ...p, rate_hour: e.target.value }))}
                                    className="w-full mt-2 pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Total Capacity</label>
                            <div className="relative">
                                <Users size={14} className="absolute left-4 top-1/2 translate-y-1.5 text-slate-600" />
                                <input type="number" value={formData.capacity}
                                    onChange={(e) => setFormData(p => ({ ...p, capacity: e.target.value }))}
                                    className="w-full mt-2 pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold" />
                            </div>
                        </div>
                    </div>

                    {/* ── Map Location Picker ──────────────────────────────────────────── */}
                    <div className="bg-linear-to-br from-indigo-950/30 to-purple-950/30 rounded-2xl p-4 border border-indigo-500/20">
                        <div className="flex items-center gap-2 mb-3">
                            <MapPin size={14} className="text-indigo-400" />
                            <label className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Shop Location on Map</label>
                        </div>

                        {/* Address search bar */}
                        <AddressSearchBar onResult={setLocation} />

                        {/* Quick-action buttons */}
                        <div className="flex gap-2 mb-3">
                            <button type="button" onClick={handleUseMyLocation}
                                className="bg-black/50 backdrop-blur-md text-white text-[10px] font-black px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-indigo-600 transition-all border border-white/10">
                                <Crosshair size={12} /> Use My Location
                            </button>
                            {hasLocation && (
                                <button type="button" onClick={() => setFormData(p => ({ ...p, lat: '', lng: '' }))}
                                    className="bg-black/50 text-rose-400 text-[10px] font-black px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-rose-500/20 transition-all border border-rose-500/20">
                                    <X size={12} /> Clear Pin
                                </button>
                            )}
                        </div>

                        {/* Map */}
                        <div className="rounded-xl overflow-hidden border border-white/10" style={{ height: 280 }}>
                            <MapContainer
                                center={mapCenter}
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                                className="z-0"
                                attributionControl={false}
                            >
                                <TileLayer
                                    attribution=""
                                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                />

                                {/* Fly to new location whenever lat/lng changes */}
                                <MapFlyTo center={mapCenter} />

                                {/* Click anywhere on map to place pin */}
                                <MapClickHandler onLocationSelect={setLocation} />

                                {/* Draggable marker — only shown when a location is set */}
                                {hasLocation && (
                                    <Marker
                                        position={mapCenter}
                                        draggable
                                        eventHandlers={{
                                            dragend(e) {
                                                const { lat, lng } = e.target.getLatLng();
                                                setLocation({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
                                            },
                                        }}
                                    >
                                        <Popup>
                                            <span className="text-xs font-bold">Your shop is here</span><br />
                                            <span className="text-[10px] text-slate-500">Drag to fine-tune</span>
                                        </Popup>
                                    </Marker>
                                )}
                            </MapContainer>
                        </div>

                        {/* Hint text below map */}
                        <p className="text-[9px] text-slate-500 mt-2 text-center">
                            Click anywhere on the map · Drag the pin · Or search an address above
                        </p>

                        {/* Coordinates readout */}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1">
                                    <MapPin size={10} /> Latitude
                                </label>
                                <input type="number" step="any" value={formData.lat}
                                    onChange={(e) => setFormData(p => ({ ...p, lat: e.target.value }))}
                                    placeholder="Click on map"
                                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-mono" />
                            </div>
                            <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1">
                                    <MapPin size={10} /> Longitude
                                </label>
                                <input type="number" step="any" value={formData.lng}
                                    onChange={(e) => setFormData(p => ({ ...p, lng: e.target.value }))}
                                    placeholder="Click on map"
                                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-mono" />
                            </div>
                        </div>

                        {/* Status indicator */}
                        {hasLocation ? (
                            <div className="mt-3 flex items-center gap-2 text-[9px] text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">
                                <CheckCircle size={12} />
                                Location pinned! Customers will find your shop at this exact spot.
                            </div>
                        ) : (
                            <div className="mt-3 flex items-center gap-2 text-[9px] text-yellow-400 bg-yellow-500/10 px-3 py-2 rounded-lg">
                                <AlertCircle size={12} />
                                No location set yet — click on the map, search an address, or use your current location.
                            </div>
                        )}
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Available Rooms</label>
                            <input type="text" value={formData.available_rooms}
                                onChange={(e) => setFormData(p => ({ ...p, available_rooms: e.target.value }))}
                                placeholder="e.g. 2 Rooms"
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Status</label>
                            <select value={formData.status}
                                onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold appearance-none">
                                <option value="Open Now" className="bg-[#111114]">Open Now</option>
                                <option value="Closed" className="bg-[#111114]">Closed</option>
                                <option value="Full" className="bg-[#111114]">Full</option>
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Description</label>
                        <textarea value={formData.description}
                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                            rows={4}
                            placeholder="Describe your space… (amenities, atmosphere, ideal for, etc.)"
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold resize-none" />
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
                                        <input type="checkbox"
                                            checked={formData.hours_json[day]?.active ?? true}
                                            onChange={(e) => handleHoursChange(day, 'active', e.target.checked)}
                                            className="w-4 h-4 accent-indigo-500 rounded" />
                                        <span className="text-xs font-black capitalize text-slate-300">{dayLabels[index]}</span>
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input type="time"
                                            value={formData.hours_json[day]?.open || '09:00'}
                                            onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                                            disabled={!formData.hours_json[day]?.active}
                                            className="bg-transparent text-xs font-bold text-white outline-none focus:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed" />
                                        <span className="text-[10px] font-black text-slate-500">TO</span>
                                        <input type="time"
                                            value={formData.hours_json[day]?.close || '18:00'}
                                            onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                                            disabled={!formData.hours_json[day]?.active}
                                            className="bg-transparent text-xs font-bold text-white outline-none focus:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed" />
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
                                <input type="file" accept="image/*" multiple
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files);
                                        if (files.length > 10) {
                                            showToast({ icon: 'warning', title: 'Maximum 10 images allowed' });
                                            return;
                                        }
                                        setFormData(p => ({ ...p, images: [...p.images, ...files] }));
                                        e.target.value = '';
                                    }}
                                    className="hidden" />
                            </label>
                        </div>

                        {formData.images?.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/10 group/image">
                                        <img
                                            src={img instanceof File ? URL.createObjectURL(img) : getSpaceImage({ ...selectedSpace, image: img })}
                                            className="w-full h-full object-cover"
                                            alt={`Preview ${idx + 1}`}
                                            onError={(e) => { e.target.src = '/placeholders/space.jpg'; }}
                                        />
                                        <button type="button"
                                            onClick={() => setFormData(p => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))}
                                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-red-600">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {isEditing && selectedSpace?.images?.length > 0 && formData.images.length === 0 && (
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                {selectedSpace.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/10">
                                        <img src={getSpaceImage({ ...selectedSpace, image: img })} className="w-full h-full object-cover"
                                            alt={`Existing ${idx + 1}`} onError={(e) => { e.target.src = '/placeholders/space.jpg'; }} />
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
                        <Button variant="ghost" onClick={() => setOpenModal(false)}
                            className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">
                            Cancel
                        </Button>
                        <Button onClick={handleSave}
                            className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg shadow-indigo-900/40 hover:bg-indigo-500 transition-all active:scale-[0.98]">
                            {isEditing ? "Update Space" : "Publish Listing"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MySpaces;