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

// Map Components
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

const MapFlyTo = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center[0] && center[1]) {
            map.flyTo(center, map.getZoom(), { animate: true, duration: 0.8 });
        }
    }, [center[0], center[1]]);
    return null;
};

// Geocoding helper
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

// Default hours helper
const defaultHours = () => ({
    monday: { active: true, open: '08:00', close: '20:00' },
    tuesday: { active: true, open: '08:00', close: '20:00' },
    wednesday: { active: true, open: '08:00', close: '20:00' },
    thursday: { active: true, open: '08:00', close: '20:00' },
    friday: { active: true, open: '08:00', close: '20:00' },
    saturday: { active: true, open: '09:00', close: '18:00' },
    sunday: { active: false, open: '10:00', close: '17:00' },
});

const emptyForm = () => ({
    name: '', area: '', rate_hour: '', capacity: '',
    status: 'Open Now', images: [], image: null,
    lat: '', lng: '', district_id: '', available_rooms: '',
    description: '', amenities: [],
    hours_json: defaultHours(),
});

// Address Search Modal
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

// Main Component
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
    const [rooms, setRooms] = useState([]);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [roomForm, setRoomForm] = useState({
        name: '',
        type: 'private_office',
        capacity: 1,
        rate_hour: '',
        description: '',
        amenities: [],
        is_airconditioned: true,
        has_window: false,
        floor_number: 1
    });
    const [roomAmenityInput, setRoomAmenityInput] = useState('');

    const fetchRooms = async (spaceId) => {
        try {
            const res = await apiGet(`/space/spaces/${spaceId}/rooms`);
            if (res.success) setRooms(res.data);
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
        }
    };

    const handleOpenRoomModal = (space, room = null) => {
        setSelectedSpace(space);
        if (room) {
            setEditingRoom(room);
            setRoomForm({
                name: room.name,
                type: room.type,
                capacity: room.capacity,
                rate_hour: room.rate_hour || '',
                description: room.description || '',
                amenities: room.amenities || [],
                is_airconditioned: room.is_airconditioned,
                has_window: room.has_window,
                floor_number: room.floor_number
            });
        } else {
            setEditingRoom(null);
            setRoomForm({
                name: '',
                type: 'private_office',
                capacity: 1,
                rate_hour: '',
                description: '',
                amenities: [],
                is_airconditioned: true,
                has_window: false,
                floor_number: 1
            });
        }
        setShowRoomModal(true);
    };


    const saveRoom = async () => {
        if (!roomForm.name.trim()) {
            showToast({ icon: 'warning', title: 'Room name required' });
            return;
        }

        try {
            const url = editingRoom
                ? `/space/rooms/${editingRoom._id}`
                : `/space/spaces/${selectedSpace._id}/rooms`;
            const method = editingRoom ? 'PUT' : 'POST';

            const formDataToSend = {
                ...roomForm,
                rate_hour: roomForm.rate_hour ? Number(roomForm.rate_hour) : null
            };

            const res = await apiPost(url, formDataToSend);
            if (res.success) {
                showToast({ icon: 'success', title: editingRoom ? 'Room updated' : 'Room added' });
                setShowRoomModal(false);
                fetchRooms(selectedSpace._id);
            }
        } catch (error) {
            showToast({ icon: 'error', title: 'Failed to save room' });
        }
    };

    // Delete room
    const deleteRoom = async (room) => {
        if (await showConfirm(`Delete "${room.name}"?`, 'This will permanently remove this room.')) {
            try {
                const res = await apiPost(`/space/rooms/${room._id}/delete`, {});
                if (res.success) {
                    showToast({ icon: 'success', title: 'Room deleted' });
                    fetchRooms(selectedSpace._id);
                }
            } catch (error) {
                showToast({ icon: 'error', title: 'Failed to delete room' });
            }
        }
    };


    // Add room amenity
    const addRoomAmenity = () => {
        if (!roomAmenityInput.trim()) return;
        if (roomForm.amenities.includes(roomAmenityInput.trim())) {
            showToast({ icon: 'warning', title: 'Amenity already added' });
            return;
        }
        setRoomForm(prev => ({
            ...prev,
            amenities: [...prev.amenities, roomAmenityInput.trim()]
        }));
        setRoomAmenityInput('');
    };

    const removeRoomAmenity = (amenity) => {
        setRoomForm(prev => ({
            ...prev,
            amenities: prev.amenities.filter(a => a !== amenity)
        }));
    };

    // Amenities state
    const [amenityInput, setAmenityInput] = useState('');

    useEffect(() => {
        if (isEditing && selectedSpace?._id) {
            fetchRooms(selectedSpace._id);
        }
    }, [isEditing, selectedSpace?._id]);

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

    // Amenity Functions
    const addAmenity = () => {
        if (!amenityInput.trim()) {
            showToast({ icon: 'warning', title: 'Please enter an amenity' });
            return;
        }

        if (formData.amenities.includes(amenityInput.trim())) {
            showToast({ icon: 'warning', title: 'Amenity already added' });
            setAmenityInput('');
            return;
        }

        setFormData(prev => ({
            ...prev,
            amenities: [...prev.amenities, amenityInput.trim()]
        }));
        setAmenityInput('');
        showToast({ icon: 'success', title: 'Amenity added', duration: 1000 });
    };

    const removeAmenity = (amenityToRemove) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.filter(a => a !== amenityToRemove)
        }));
    };

    const setLocation = useCallback(({ lat, lng }) => {
        setFormData(prev => ({ ...prev, lat, lng }));
    }, []);

    const handleHoursChange = (day, field, value) => {
        setFormData(prev => ({
            ...prev,
            hours_json: { ...prev.hours_json, [day]: { ...prev.hours_json[day], [field]: value } },
        }));
    };

    // Modal handlers
    const handleOpenCreate = () => {
        setIsEditing(false);
        setSelectedSpace(null);
        setFormData(emptyForm());
        setAmenityInput('');
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
        setAmenityInput('');
        setOpenModal(true);
    };

    const handleOpenImageManager = (space) => {
        setSelectedSpace(space);
        setSelectedImages([]);
        setOpenImageModal(true);
    };

    // Image actions
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

    // Save / Delete
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

    // Render helpers
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

    const mapCenter = [
        parseFloat(formData.lat) || 10.7202,
        parseFloat(formData.lng) || 122.5621,
    ];
    const hasLocation = !!(formData.lat && formData.lng);

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
                            {/* Display amenities in card */}
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

            {/* Create / Edit Modal */}
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

                    {/* Map Location Picker */}
                    {/* Map Location Picker - FULLY RESPONSIVE (Mobile + Desktop) */}
                    <div className="bg-linear-to-br from-indigo-950/30 to-purple-950/30 rounded-2xl p-4 md:p-6 border border-indigo-500/20">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-4 md:mb-6">
                            <MapPin size={16} className="text-indigo-400" />
                            <label className="text-[11px] md:text-xs text-indigo-400 font-black uppercase tracking-widest">Shop Location on Map</label>
                        </div>

                        {/* Address Search Bar - Full width on mobile */}
                        <div className="mb-4">
                            <AddressSearchBar onResult={setLocation} />
                        </div>

                        {/* Action Buttons - Stack on mobile, side by side on desktop */}
                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <button
                                type="button"
                                onClick={handleUseMyLocation}
                                className="w-full sm:w-auto bg-black/50 backdrop-blur-md text-white text-[11px] md:text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all border border-white/10"
                            >
                                <Crosshair size={14} />
                                <span>Use My Location</span>
                            </button>
                            {hasLocation && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, lat: '', lng: '' }))}
                                    className="w-full sm:w-auto bg-black/50 text-rose-400 text-[11px] md:text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-all border border-rose-500/20"
                                >
                                    <X size={14} />
                                    <span>Clear Pin</span>
                                </button>
                            )}
                        </div>

                        {/* Map Container - Responsive height */}
                        <div className="rounded-xl overflow-hidden border border-white/10 mb-3" style={{ height: '280px' }}>
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
                                <MapFlyTo center={mapCenter} />
                                <MapClickHandler onLocationSelect={setLocation} />
                                {hasLocation && (
                                    <Marker
                                        position={mapCenter}
                                        draggable
                                        eventHandlers={{
                                            dragend(e) {
                                                const { lat, lng } = e.target.getLatLng();
                                                setLocation({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
                                            }
                                        }}
                                    >
                                        <Popup>
                                            <span className="text-xs font-bold">Your shop is here</span>
                                            <br />
                                            <span className="text-[10px] text-slate-500">Drag to fine-tune</span>
                                        </Popup>
                                    </Marker>
                                )}
                            </MapContainer>
                        </div>

                        {/* Map Instructions */}
                        <p className="text-[9px] md:text-[10px] text-slate-500 text-center mb-4">
                            📍 Click anywhere on the map · Drag the pin · Or search an address above
                        </p>

                        {/* Coordinates Inputs - Responsive grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <div className="bg-black/40 rounded-xl p-3 md:p-4 border border-white/5">
                                <label className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1 mb-1">
                                    <MapPin size={12} /> Latitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.lat}
                                    onChange={(e) => setFormData(p => ({ ...p, lat: e.target.value }))}
                                    placeholder="Click on map"
                                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-mono"
                                />
                            </div>
                            <div className="bg-black/40 rounded-xl p-3 md:p-4 border border-white/5">
                                <label className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1 mb-1">
                                    <MapPin size={12} /> Longitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.lng}
                                    onChange={(e) => setFormData(p => ({ ...p, lng: e.target.value }))}
                                    placeholder="Click on map"
                                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-mono"
                                />
                            </div>
                        </div>

                        {/* Status Message - Responsive */}
                        {hasLocation ? (
                            <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-emerald-400 bg-emerald-500/10 px-3 py-2.5 rounded-lg">
                                <CheckCircle size={14} />
                                <span>Location pinned! Customers will find your shop at this exact spot.</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-yellow-400 bg-yellow-500/10 px-3 py-2.5 rounded-lg">
                                <AlertCircle size={14} />
                                <span>No location set yet — click on the map, search an address, or use your current location.</span>
                            </div>
                        )}
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Available Rooms</label>
                            <input type="text" value={formData.available_rooms} onChange={(e) => setFormData(p => ({ ...p, available_rooms: e.target.value }))} placeholder="e.g. 2 Rooms, 5 Private Offices" className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Status</label>
                            <select value={formData.status} onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))} className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold appearance-none">
                                <option value="Open Now" className="bg-[#111114]">Open Now</option>
                                <option value="Closed" className="bg-[#111114]">Closed</option>
                                <option value="Full" className="bg-[#111114]">Full</option>
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Description</label>
                        <textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={4} placeholder="Describe your space… (amenities, atmosphere, ideal for, etc.)" className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold resize-none" />
                    </div>

                    {/* Amenities Section - FULLY RESPONSIVE */}
                    <div className="bg-linear-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-4 sm:p-6 border border-white/10">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <span className="text-sm sm:text-base">✨</span>
                                </div>
                                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-tighter">
                                    Amenities & Services
                                </h3>
                            </div>
                            <span className="text-[8px] sm:text-[9px] text-slate-500 text-left sm:text-right">
                                Add any amenity your space offers
                            </span>
                        </div>

                        {/* Current Amenities Display */}
                        {formData.amenities.length > 0 && (
                            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                                <p className="text-[8px] sm:text-[9px] font-black text-emerald-400 uppercase tracking-wider mb-2 sm:mb-3">
                                    ✓ Current Amenities ({formData.amenities.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {formData.amenities.map((amenity, idx) => (
                                        <span
                                            key={idx}
                                            onClick={() => removeAmenity(amenity)}
                                            className="group inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-medium cursor-pointer hover:bg-red-500/30 hover:text-red-300 transition-all"
                                        >
                                            <span className="max-w-30 sm:max-w-none truncate">{amenity}</span>
                                            <X size={10} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add New Amenity */}
                        <div>
                            <label className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">
                                Add New Amenity
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={amenityInput}
                                        onChange={(e) => setAmenityInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addAmenity()}
                                        placeholder="Type any amenity (e.g., Rooftop Access, 24/7 Security...)"
                                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs sm:text-sm outline-none focus:border-emerald-500 placeholder:text-slate-600"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={addAmenity}
                                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap"
                                >
                                    + Add
                                </button>
                            </div>
                            <p className="text-[7px] sm:text-[8px] text-slate-500 mt-1.5 sm:mt-2">
                                💡 Tip: You can add ANY amenity - be specific! Examples: "Standing Desks", "Phone Booths", "Outdoor Terrace", "Nap Room"
                            </p>
                        </div>

                        {/* Quick Add Examples - Horizontal Scroll on Mobile */}
                        <div className="mt-4 pt-3 border-t border-white/10">
                            <p className="text-[7px] sm:text-[8px] text-slate-500 mb-2">Quick add examples:</p>
                            <div className="overflow-x-auto pb-2 -mx-1 px-1">
                                <div className="flex flex-nowrap sm:flex-wrap gap-1 min-w-max sm:min-w-0">
                                    {["High-speed WiFi", "Air Conditioning", "Parking", "Coffee/Tea", "Meeting Rooms", "Printing", "Lockers", "CCTV", "Shower", "Kitchen"].map(ex => (
                                        <button
                                            key={ex}
                                            type="button"
                                            onClick={() => {
                                                if (!formData.amenities.includes(ex)) {
                                                    setFormData(prev => ({ ...prev, amenities: [...prev.amenities, ex] }));
                                                    showToast({ icon: 'success', title: `Added "${ex}"`, duration: 800 });
                                                }
                                            }}
                                            className="whitespace-nowrap text-[7px] sm:text-[8px] px-1.5 sm:px-2 py-1 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-all shrink-0"
                                        >
                                            + {ex.length > 15 ? ex.substring(0, 12) + '…' : ex}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ========== ROOMS SECTION - MOVED INSIDE MODAL ========== */}
                    {isEditing && selectedSpace && (
                        <div className="bg-linear-to-br from-purple-800/30 to-pink-800/30 rounded-2xl p-6 border border-purple-500/20">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                        <span className="text-sm">🏠</span>
                                    </div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-tighter">Rooms / Sub-spaces</h3>
                                </div>
                                <Button onClick={() => handleOpenRoomModal(selectedSpace)} className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg">
                                    <Plus size={12} className="mr-1" /> Add Room
                                </Button>
                            </div>

                            {rooms.length === 0 ? (
                                <div className="text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <p className="text-[10px] text-slate-400">No rooms added yet</p>
                                    <p className="text-[8px] text-slate-500 mt-1">Add private offices, meeting rooms, or study pods</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {rooms.map(room => (
                                        <div key={room._id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-sm font-black text-white">{room.name}</h4>
                                                    <span className="text-[8px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full uppercase">{room.type.replace('_', ' ')}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-[9px] text-slate-400">
                                                    <span>👥 Capacity: {room.capacity}</span>
                                                    {room.rate_hour && <span>💰 ₱{room.rate_hour}/hr</span>}
                                                    <span>🏢 Floor {room.floor_number}</span>
                                                    {room.has_window && <span>🪟 Window</span>}
                                                </div>
                                                {room.amenities.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {room.amenities.slice(0, 3).map((a, i) => (<span key={i} className="text-[7px] px-1.5 py-0.5 bg-white/5 rounded-full text-slate-400">{a}</span>))}
                                                        {room.amenities.length > 3 && (<span className="text-[7px] px-1.5 py-0.5 bg-white/5 rounded-full text-slate-400">+{room.amenities.length - 3}</span>)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleOpenRoomModal(selectedSpace, room)} className="p-2 hover:bg-white/10 rounded-lg transition-all"><Edit3 size={14} className="text-slate-400" /></button>
                                                <button onClick={() => deleteRoom(room)} className="p-2 hover:bg-red-500/20 rounded-lg transition-all"><Trash2 size={14} className="text-red-400" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-[8px] text-slate-500 mt-4 text-center">💡 Perfect for: Smart Space in Plaza Libertad - add the main coworking area + individual private rooms</p>
                        </div>
                    )}

                    {/* Weekly Schedule - ULTRA RESPONSIVE (320px and below) */}
                    <div className="bg-white/5 rounded-2xl p-3 sm:p-6 border border-white/10">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-6">
                            <Clock size={12} className="sm:size-16 text-indigo-400" />
                            <h3 className="text-[10px] sm:text-sm font-black text-white uppercase tracking-tighter">Weekly Schedule</h3>
                        </div>

                        <div className="space-y-2 sm:space-y-3">
                            {days.map((day, index) => (
                                <div key={day} className="block p-2.5 sm:p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                    {/* Day row with checkbox */}
                                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                                        <label className="flex items-center gap-1.5 sm:gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.hours_json[day]?.active ?? true}
                                                onChange={(e) => handleHoursChange(day, 'active', e.target.checked)}
                                                className="w-3 h-3 sm:w-4 sm:h-4 accent-indigo-500 rounded"
                                            />
                                            <span className="text-[10px] sm:text-xs font-black capitalize text-slate-300">
                                                {dayLabels[index]}
                                            </span>
                                        </label>
                                        {/* Small status badge */}
                                        <span className={`text-[6px] sm:text-[8px] px-1.5 py-0.5 rounded-full ${formData.hours_json[day]?.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {formData.hours_json[day]?.active ? 'Open' : 'Closed'}
                                        </span>
                                    </div>

                                    {/* Time row */}
                                    <div className="flex items-center justify-between gap-1.5 sm:gap-3 pl-4 sm:pl-6">
                                        <input
                                            type="time"
                                            value={formData.hours_json[day]?.open || '09:00'}
                                            onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                                            disabled={!formData.hours_json[day]?.active}
                                            className="flex-1 bg-black/40 text-[10px] sm:text-xs font-bold text-white outline-none focus:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed px-1.5 sm:px-2 py-1 rounded-lg"
                                        />
                                        <span className="text-[7px] sm:text-[10px] font-black text-slate-500">→</span>
                                        <input
                                            type="time"
                                            value={formData.hours_json[day]?.close || '18:00'}
                                            onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                                            disabled={!formData.hours_json[day]?.active}
                                            className="flex-1 bg-black/40 text-[10px] sm:text-xs font-bold text-white outline-none focus:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed px-1.5 sm:px-2 py-1 rounded-lg"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-[6px] sm:text-[8px] text-slate-500 text-center mt-3 sm:mt-4">
                            ⏰ Check = Open | Uncheck = Closed
                        </p>
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
                                <input type="file" accept="image/*" multiple onChange={(e) => { const files = Array.from(e.target.files); if (files.length > 10) { showToast({ icon: 'warning', title: 'Maximum 10 images allowed' }); return; } setFormData(p => ({ ...p, images: [...p.images, ...files] })); e.target.value = ''; }} className="hidden" />
                            </label>
                        </div>
                        {formData.images?.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/10 group/image">
                                        <img src={img instanceof File ? URL.createObjectURL(img) : getSpaceImage({ ...selectedSpace, image: img })} className="w-full h-full object-cover" alt={`Preview ${idx + 1}`} onError={(e) => { e.target.src = '/placeholders/space.jpg'; }} />
                                        <button type="button" onClick={() => setFormData(p => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-red-600"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setOpenModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</Button>
                        <Button onClick={handleSave} className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg shadow-indigo-900/40 hover:bg-indigo-500 transition-all active:scale-[0.98]">{isEditing ? "Update Space" : "Publish Listing"}</Button>
                    </div>
                </div>
            </Modal>

            {/* Room Modal - OUTSIDE the edit modal */}
            <Modal open={showRoomModal} onClose={() => setShowRoomModal(false)} title={editingRoom ? "Edit Room" : "Add Room"} size="md" variant="dark">
                <div className="space-y-4 py-2">
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase">Room Name</label>
                        <input type="text" value={roomForm.name} onChange={(e) => setRoomForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Private Room 1, Meeting Room A, Study Pod" className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-purple-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase">Room Type</label>
                            <select value={roomForm.type} onChange={(e) => setRoomForm(prev => ({ ...prev, type: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none">
                                <option value="private_office">Private Office</option>
                                <option value="meeting_room">Meeting Room</option>
                                <option value="conference_room">Conference Room</option>
                                <option value="study_room">Study Room</option>
                                <option value="pod">Phone/Pod</option>
                                <option value="event_space">Event Space</option>
                                <option value="shared_desk">Shared Desk Area</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase">Capacity (people)</label>
                            <input type="number" value={roomForm.capacity} onChange={(e) => setRoomForm(prev => ({ ...prev, capacity: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase">Rate per hour (optional)</label>
                            <input type="number" value={roomForm.rate_hour} onChange={(e) => setRoomForm(prev => ({ ...prev, rate_hour: e.target.value }))} placeholder="Leave empty to use space rate" className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                            <p className="text-[7px] text-slate-500 mt-1">If empty, inherits ₱{selectedSpace?.rate_hour}/hr</p>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase">Floor Number</label>
                            <input type="number" value={roomForm.floor_number} onChange={(e) => setRoomForm(prev => ({ ...prev, floor_number: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={roomForm.is_airconditioned} onChange={(e) => setRoomForm(prev => ({ ...prev, is_airconditioned: e.target.checked }))} className="w-4 h-4 accent-purple-500" /><span className="text-[10px] text-white">❄️ Air Conditioned</span></label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={roomForm.has_window} onChange={(e) => setRoomForm(prev => ({ ...prev, has_window: e.target.checked }))} className="w-4 h-4 accent-purple-500" /><span className="text-[10px] text-white">🪟 Has Window</span></label>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase block mb-2">Room Amenities</label>
                        <div className="flex gap-2 mb-2">
                            <input type="text" value={roomAmenityInput} onChange={(e) => setRoomAmenityInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addRoomAmenity()} placeholder="e.g., Whiteboard, TV, Projector" className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
                            <button onClick={addRoomAmenity} className="px-4 bg-purple-600 rounded-xl text-white text-[10px] font-black">+</button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {roomForm.amenities.map((a, i) => (<span key={i} onClick={() => removeRoomAmenity(a)} className="text-[8px] px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full cursor-pointer hover:bg-red-500/30 hover:text-red-300">{a} ✕</span>))}
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase">Description (optional)</label>
                        <textarea value={roomForm.description} onChange={(e) => setRoomForm(prev => ({ ...prev, description: e.target.value }))} rows={2} placeholder="Describe this room..." className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none resize-none" />
                    </div>
                    <div className="flex gap-3 pt-3">
                        <Button variant="ghost" onClick={() => setShowRoomModal(false)} className="flex-1">Cancel</Button>
                        <Button onClick={saveRoom} className="flex-1 bg-purple-600 hover:bg-purple-500">Save Room</Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default MySpaces;