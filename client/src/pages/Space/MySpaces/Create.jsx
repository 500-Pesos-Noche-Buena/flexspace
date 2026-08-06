import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';
import { Button } from '@/components/ui/button';
import { FormInput, FormSelect, FormTextArea } from '@/components/FormValidation';
import { AmenitiesSelector } from '@/components/AmenitiesSelector';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin, Clock, Image as ImageIcon,
    X, CheckCircle, AlertCircle, Crosshair, Search,
    Plus, Trash2, Edit, DoorOpen, Users as UsersIcon,
    Wind, Sun, Upload, ImageOff, Loader2
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

// Reverse geocode to get district name from coordinates
const reverseGeocodeDistrict = async (lat, lng) => {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        const data = await res.json();

        if (data && data.address) {
            const district = data.address.suburb ||
                data.address.neighbourhood ||
                data.address.city_district ||
                data.address.district ||
                data.address.city ||
                data.address.town ||
                data.address.village;
            return district || null;
        }
        return null;
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
        return null;
    }
};

// Address Search Component
const AddressSearchBar = ({ onResult }) => {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
            );
            const data = await res.json();
            if (data && data.length > 0) {
                onResult({
                    lat: parseFloat(data[0].lat).toFixed(6),
                    lng: parseFloat(data[0].lon).toFixed(6),
                });
                showToast({ icon: 'success', title: 'Location found!', duration: 1500 });
            } else {
                showToast({ icon: 'warning', title: 'Address not found' });
            }
        } catch (error) {
            showToast({ icon: 'error', title: 'Search failed' });
        }
        setSearching(false);
    };

    return (
        <div className="flex gap-2 mb-3">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search address or landmark…"
                className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-xs outline-none focus:border-primary transition-all font-medium placeholder:text-muted-foreground"
            />
            <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-2 bg-primary text-primary-foreground disabled:opacity-50 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1"
            >
                <Search size={12} />
                {searching ? 'Searching…' : 'Go'}
            </button>
        </div>
    );
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

// Room Type Options
const ROOM_TYPES = [
    { value: 'private_office', label: 'Private Office' },
    { value: 'meeting_room', label: 'Meeting Room' },
    { value: 'conference_room', label: 'Conference Room' },
    { value: 'event_space', label: 'Event Space' },
    { value: 'study_room', label: 'Study Room' },
    { value: 'pod', label: 'Pod / Booth' },
    { value: 'shared_desk', label: 'Shared Desk' },
];

// 🚀 IMAGE COMPRESSION HELPER
const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Failed to compress image'));
                        return;
                    }
                    const fileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
                    resolve(new File([blob], fileName, { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const CreateSpace = ({ initialData = null, isEditing = false, spaceId = null }) => {
    const { themeColor } = useTheme();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [districts, setDistricts] = useState([]);
    const [images, setImages] = useState([]);
    const [detectingDistrict, setDetectingDistrict] = useState(false);
    const [errors, setErrors] = useState({});

    // Room management states - FETCHED FROM DATABASE
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
        floor_number: 1,
        is_available: true
    });
    const [roomImages, setRoomImages] = useState([]);
    const [roomErrors, setRoomErrors] = useState({});
    const [roomTouched, setRoomTouched] = useState({});
    const [loadingRooms, setLoadingRooms] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        area: '',
        rate_hour: '',
        capacity: '',
        lat: '',
        lng: '',
        district_id: '',
        available_rooms: '',
        description: '',
        amenities: [],
        hours_json: defaultHours(),
        status: 'Open Now'
    });

    const [touched, setTouched] = useState({});
    const [mapCenter, setMapCenter] = useState([10.7202, 122.5621]);
    const fileInputRef = useRef(null);

    const getButtonColor = () => {
        const colors = {
            indigo: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40',
            emerald: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40',
            purple: 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/40',
            blue: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40',
            rose: 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40',
            amber: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40',
        };
        return colors[themeColor] || colors.indigo;
    };

    // In CreateSpace.jsx, add this useEffect to auto-calculate available rooms
    useEffect(() => {
        // Auto-update available_rooms based on actual rooms count
        const availableCount = rooms.filter(room => room.is_available !== false).length;
        if (availableCount > 0) {
            setFormData(prev => ({
                ...prev,
                available_rooms: availableCount.toString()
            }));
        }
    }, [rooms]);

    // Also, when fetching rooms, update the available_rooms
    const fetchRooms = async (spaceId) => {
        if (!spaceId) return;
        setLoadingRooms(true);
        try {
            const res = await apiGet(`/space/spaces/${spaceId}/rooms`);
            if (res.success) {
                setRooms(res.data || []);
                // Auto-update available_rooms
                const availableCount = (res.data || []).filter(room => room.is_available !== false).length;
                if (availableCount > 0) {
                    setFormData(prev => ({
                        ...prev,
                        available_rooms: availableCount.toString()
                    }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
            showToast({ icon: 'error', title: 'Failed to load rooms' });
        } finally {
            setLoadingRooms(false);
        }
    };

    // ✅ FETCH ROOMS WHEN EDITING
    useEffect(() => {
        if (isEditing && (spaceId || initialData?._id)) {
            fetchRooms(spaceId || initialData._id);
        }
    }, [isEditing, spaceId, initialData]);

    // Populate form with existing data when editing
    useEffect(() => {
        if (initialData && isEditing) {
            let hoursData = initialData.hours_json;
            if (typeof hoursData === 'string') {
                try {
                    hoursData = JSON.parse(hoursData);
                } catch (e) {
                    hoursData = defaultHours();
                }
            }

            setFormData({
                name: initialData.name || '',
                area: initialData.area || '',
                rate_hour: initialData.rate_hour || '',
                capacity: initialData.capacity || '',
                lat: initialData.lat || '',
                lng: initialData.lng || '',
                district_id: initialData.district_id?._id || initialData.district_id || '',
                available_rooms: initialData.available_rooms || '',
                description: initialData.description || '',
                amenities: initialData.amenities || [],
                hours_json: hoursData || defaultHours(),
                status: initialData.status || 'Open Now'
            });

            if (initialData.images && initialData.images.length > 0) {
                setImages(initialData.images);
            }

            if (initialData.lat && initialData.lng) {
                setMapCenter([parseFloat(initialData.lat), parseFloat(initialData.lng)]);
            }
        }
    }, [initialData, isEditing]);

    // Room form handlers
    const handleRoomChange = (e) => {
        const { name, value, type, checked } = e.target;
        setRoomForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setRoomTouched(prev => ({ ...prev, [name]: true }));
    };

    const handleRoomBlur = (e) => {
        const { name } = e.target;
        setRoomTouched(prev => ({ ...prev, [name]: true }));
    };

    const addRoomAmenity = (amenity) => {
        setRoomForm(prev => ({
            ...prev,
            amenities: [...prev.amenities, amenity]
        }));
    };

    const removeRoomAmenity = (amenity) => {
        setRoomForm(prev => ({
            ...prev,
            amenities: prev.amenities.filter(a => a !== amenity)
        }));
    };

    const handleRoomImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        if (roomImages.length + files.length > 5) {
            showToast({ icon: 'warning', title: 'Maximum 5 images per room' });
            return;
        }

        const compressed = await Promise.all(
            files.map(file => compressImage(file, 800, 800, 0.8))
        );
        setRoomImages(prev => [...prev, ...compressed]);
        e.target.value = '';
    };

    const removeRoomImage = (index) => {
        setRoomImages(prev => prev.filter((_, i) => i !== index));
    };

    const validateRoomForm = () => {
        const errors = {};
        if (!roomForm.name.trim()) errors.name = 'Room name is required';
        if (roomForm.name.length > 50) errors.name = 'Room name cannot exceed 50 characters';
        if (!roomForm.capacity || roomForm.capacity < 1) errors.capacity = 'Capacity must be at least 1';
        if (!roomForm.rate_hour || parseFloat(roomForm.rate_hour) <= 0) errors.rate_hour = 'Rate must be greater than 0';
        if (roomForm.amenities.length === 0) errors.amenities = 'Add at least one amenity';
        return errors;
    };

    // ✅ SAVE ROOM TO DATABASE
    const handleSaveRoom = async () => {
        const validationErrors = validateRoomForm();
        if (Object.keys(validationErrors).length > 0) {
            setRoomErrors(validationErrors);
            showToast({ icon: 'warning', title: 'Please fix room errors' });
            return;
        }

        try {
            const roomData = {
                ...roomForm,
                rate_hour: parseFloat(roomForm.rate_hour),
                capacity: parseInt(roomForm.capacity),
                floor_number: parseInt(roomForm.floor_number)
            };

            const spaceIdToUse = spaceId || initialData?._id;
            if (!spaceIdToUse) {
                showToast({ icon: 'error', title: 'Please save the space first before adding rooms' });
                return;
            }

            const url = editingRoom
                ? `/space/rooms/${editingRoom._id}`
                : `/space/spaces/${spaceIdToUse}/rooms`;

            const res = await apiPost(url, roomData);

            if (res.success) {
                showToast({
                    icon: 'success',
                    title: editingRoom ? 'Room updated!' : 'Room added!',
                    duration: 2000
                });
                setShowRoomModal(false);
                setRoomForm({
                    name: '',
                    type: 'private_office',
                    capacity: 1,
                    rate_hour: '',
                    description: '',
                    amenities: [],
                    is_airconditioned: true,
                    has_window: false,
                    floor_number: 1,
                    is_available: true
                });
                setRoomImages([]);
                setEditingRoom(null);
                // ✅ REFRESH ROOMS FROM DATABASE
                await fetchRooms(spaceIdToUse);
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Failed to save room' });
        }
    };

    // ✅ EDIT ROOM
    const handleEditRoom = (room) => {
        setEditingRoom(room);
        setRoomForm({
            name: room.name || '',
            type: room.type || 'private_office',
            capacity: room.capacity || 1,
            rate_hour: room.rate_hour || '',
            description: room.description || '',
            amenities: room.amenities || [],
            is_airconditioned: room.is_airconditioned !== undefined ? room.is_airconditioned : true,
            has_window: room.has_window || false,
            floor_number: room.floor_number || 1,
            is_available: room.is_available !== undefined ? room.is_available : true
        });
        setRoomImages([]);
        setRoomErrors({});
        setRoomTouched({});
        setShowRoomModal(true);
    };

    // ✅ DELETE ROOM FROM DATABASE
    const handleDeleteRoom = async (roomId) => {
        if (!confirm('Are you sure you want to delete this room?')) return;

        try {
            const res = await apiPost(`/space/rooms/${roomId}/delete`);
            if (res.success) {
                showToast({ icon: 'success', title: 'Room deleted' });
                const spaceIdToUse = spaceId || initialData?._id;
                if (spaceIdToUse) {
                    await fetchRooms(spaceIdToUse);
                }
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Failed to delete room' });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'rate_hour' || name === 'capacity' || name === 'available_rooms') {
            if (value === '') {
                setFormData(prev => ({ ...prev, [name]: '' }));
                return;
            }

            if (name === 'rate_hour') {
                if (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 0) {
                    setFormData(prev => ({ ...prev, [name]: value }));
                }
            } else {
                if (/^\d+$/.test(value) && parseInt(value) >= 0) {
                    setFormData(prev => ({ ...prev, [name]: value }));
                }
            }
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const autoDetectDistrict = async (lat, lng) => {
        setDetectingDistrict(true);
        try {
            const districtName = await reverseGeocodeDistrict(lat, lng);
            if (districtName) {
                setFormData(prev => ({ ...prev, area: districtName }));
                setTouched(prev => ({ ...prev, area: true }));

                const matchingDistrict = districts.find(
                    d => d.name.toLowerCase() === districtName.toLowerCase()
                );
                if (matchingDistrict) {
                    setFormData(prev => ({ ...prev, district_id: matchingDistrict._id }));
                }

                showToast({
                    icon: 'success',
                    title: 'District Detected',
                    text: `Location set to: ${districtName}`,
                    duration: 2000
                });
            } else {
                showToast({
                    icon: 'warning',
                    title: 'Could not detect district',
                    text: 'Please select district manually'
                });
            }
        } catch (error) {
            console.error('District detection failed:', error);
        } finally {
            setDetectingDistrict(false);
        }
    };

    const handleLocationSelect = async ({ lat, lng }) => {
        setFormData(prev => ({ ...prev, lat, lng }));
        setTouched(prev => ({ ...prev, lat: true, lng: true }));
        setMapCenter([parseFloat(lat), parseFloat(lng)]);
        await autoDetectDistrict(lat, lng);
    };

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            showToast({ icon: 'error', title: 'Geolocation not supported' });
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                await handleLocationSelect({
                    lat: coords.latitude.toFixed(6),
                    lng: coords.longitude.toFixed(6),
                });
                showToast({ icon: 'success', title: '📍 Location set to your current position!' });
            },
            () => showToast({ icon: 'error', title: 'Unable to get location. Check permissions.' })
        );
    };

    const addAmenity = (amenity) => {
        setFormData(prev => ({
            ...prev,
            amenities: [...prev.amenities, amenity]
        }));
        setTouched(prev => ({ ...prev, amenities: true }));
    };

    const removeAmenity = (amenity) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.filter(a => a !== amenity)
        }));
    };

    const handleHoursChange = (day, field, value) => {
        setFormData(prev => ({
            ...prev,
            hours_json: { ...prev.hours_json, [day]: { ...prev.hours_json[day], [field]: value } },
        }));
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const totalFiles = files.length;
        const maxImages = 10 - images.length;

        if (maxImages <= 0) {
            showToast({ icon: 'warning', title: 'Maximum 10 images allowed' });
            return;
        }

        const filesToUpload = files.slice(0, maxImages);
        setUploadingImages(true);
        setUploadProgress(0);

        try {
            const compressedFiles = [];
            for (let i = 0; i < filesToUpload.length; i++) {
                const file = filesToUpload[i];
                const compressed = await compressImage(file, 1200, 1200, 0.8);
                compressedFiles.push(compressed);
                setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
            }

            setImages(prev => [...prev, ...compressedFiles]);
            showToast({
                icon: 'success',
                title: `${compressedFiles.length} image(s) ready`,
                text: `Compressed and ready to upload`,
                duration: 1500
            });
        } catch (error) {
            console.error('Image compression error:', error);
            showToast({ icon: 'error', title: 'Failed to process images' });
        } finally {
            setUploadingImages(false);
            setUploadProgress(0);
            e.target.value = '';
        }
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.area || !formData.rate_hour || !formData.capacity) {
            showToast({ icon: 'error', title: 'Please fill in all required fields' });
            return;
        }

        if (formData.name.length > 50) {
            showToast({ icon: 'error', title: 'Space name cannot exceed 50 characters' });
            return;
        }

        if (formData.amenities.length === 0) {
            showToast({ icon: 'error', title: 'Please add at least one amenity' });
            return;
        }

        if (!isEditing && images.length === 0) {
            showToast({ icon: 'error', title: 'Please upload at least one image' });
            return;
        }

        setLoading(true);

        try {
            const submitData = new FormData();
            submitData.append('name', formData.name);
            submitData.append('area', formData.area);
            submitData.append('rate_hour', parseFloat(formData.rate_hour));
            submitData.append('capacity', parseInt(formData.capacity));
            submitData.append('status', formData.status);
            submitData.append('description', formData.description || '');
            submitData.append('amenities', JSON.stringify(formData.amenities));
            submitData.append('hours_json', JSON.stringify(formData.hours_json));

            if (formData.lat) submitData.append('lat', parseFloat(formData.lat));
            if (formData.lng) submitData.append('lng', parseFloat(formData.lng));
            if (formData.district_id) submitData.append('district_id', formData.district_id);
            if (formData.available_rooms) submitData.append('available_rooms', formData.available_rooms);

            const imageFiles = images.filter(img => img instanceof File);
            imageFiles.forEach(img => {
                submitData.append('images', img);
            });

            const url = isEditing ? `/space/spaces/${spaceId}/update` : '/space/spaces';

            showToast({
                icon: 'info',
                title: isEditing ? 'Updating space...' : 'Creating space...',
                text: 'Uploading images...',
                duration: 2000
            });

            const response = await apiPost(url, submitData);

            if (response.success) {
                showToast({
                    icon: 'success',
                    title: isEditing ? 'Space updated!' : 'Space created!',
                    text: `${imageFiles.length} image(s) uploaded successfully`,
                    duration: 3000
                });
                setTimeout(() => {
                    navigate('/space/my-spaces');
                }, 1500);
            }
        } catch (error) {
            console.error('Submit error:', error);
            showToast({
                icon: 'error',
                title: error.message || `Failed to ${isEditing ? 'update' : 'create'} space`,
                text: 'Please try again'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchDistricts = async () => {
            try {
                const response = await apiGet('/space/districts/active');
                if (response.success) setDistricts(response.data || []);
            } catch (error) {
                console.error('Failed to fetch districts:', error);
            }
        };
        fetchDistricts();
    }, []);

    const hasLocation = !!(formData.lat && formData.lng);
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const getRoomTypeLabel = (type) => {
        const found = ROOM_TYPES.find(t => t.value === type);
        return found ? found.label : type;
    };

    const imageFilesCount = images.filter(img => img instanceof File).length;
    const existingImagesCount = images.filter(img => typeof img === 'string').length;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-12">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-foreground tracking-tight uppercase italic">
                    {isEditing ? 'Edit Space' : 'Create New Space'}
                </h1>
                <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest">
                    {isEditing ? 'Modify your coworking space details' : 'List your coworking space'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-7xl mx-auto">
                <div className="bg-card border border-border rounded-3xl p-6 space-y-6">
                    {/* Form fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Space Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            required
                            placeholder="e.g., Cozy Corner Coworking"
                            touched={touched.name}
                            maxLength={50}
                        />

                        <FormInput
                            label="District (Auto-detected from map)"
                            name="area"
                            value={formData.area}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            required
                            placeholder="Click on map to auto-detect district"
                            readOnly
                            touched={touched.area}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Hourly Rate (₱)"
                            name="rate_hour"
                            type="number"
                            value={formData.rate_hour}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            required
                            placeholder="e.g., 250"
                            touched={touched.rate_hour}
                            error={errors.rate_hour}
                        />

                        <FormInput
                            label="Capacity (persons)"
                            name="capacity"
                            type="number"
                            value={formData.capacity}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            required
                            placeholder="e.g., 50"
                            touched={touched.capacity}
                            error={errors.rate_hour}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Available Rooms"
                            name="available_rooms"
                            type="text"
                            value={formData.available_rooms}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Auto-calculated from rooms"
                            touched={touched.available_rooms}
                            error={errors.rate_hour}
                            readOnly
                            className="bg-muted cursor-not-allowed"
                            helperText="Auto-calculated based on available rooms added below"
                        />

                    </div>

                    {/* Location Map */}
                    <div className="bg-linear-to-br from-primary/10 to-purple-500/10 rounded-2xl p-4 md:p-6 border border-primary/20">
                        <div className="flex items-center gap-2 mb-4 md:mb-6">
                            <MapPin size={16} className="text-primary" />
                            <label className="text-[11px] md:text-xs text-primary font-black uppercase tracking-widest">
                                Click on map to set location & auto-detect district
                            </label>
                        </div>

                        <AddressSearchBar onResult={handleLocationSelect} />

                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <button
                                type="button"
                                onClick={handleUseMyLocation}
                                disabled={detectingDistrict}
                                className="w-full sm:w-auto bg-muted backdrop-blur-md text-foreground text-[11px] md:text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-primary hover:text-primary-foreground transition-all border border-border"
                            >
                                <Crosshair size={14} />
                                Use My Location
                            </button>
                            {hasLocation && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, lat: '', lng: '', area: '' }))}
                                    className="w-full sm:w-auto bg-muted text-rose-500 dark:text-rose-400 text-[11px] md:text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-all border border-rose-500/20"
                                >
                                    <X size={14} />
                                    Clear Pin
                                </button>
                            )}
                        </div>

                        <div className="rounded-xl overflow-hidden border border-border mb-3" style={{ height: '280px' }}>
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
                                <MapClickHandler onLocationSelect={handleLocationSelect} />
                                {hasLocation && (
                                    <Marker
                                        position={[parseFloat(formData.lat), parseFloat(formData.lng)]}
                                        draggable
                                        eventHandlers={{
                                            dragend: async (e) => {
                                                const { lat, lng } = e.target.getLatLng();
                                                await handleLocationSelect({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
                                            }
                                        }}
                                    >
                                        <Popup>Your space location</Popup>
                                    </Marker>
                                )}
                            </MapContainer>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <div className="bg-muted rounded-xl p-3 md:p-4 border border-border">
                                <label className="text-[9px] md:text-[10px] text-muted-foreground font-black uppercase tracking-wider">Latitude</label>
                                <input
                                    type="text"
                                    value={formData.lat}
                                    readOnly
                                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm outline-none font-mono"
                                />
                            </div>
                            <div className="bg-muted rounded-xl p-3 md:p-4 border border-border">
                                <label className="text-[9px] md:text-[10px] text-muted-foreground font-black uppercase tracking-wider">Longitude</label>
                                <input
                                    type="text"
                                    value={formData.lng}
                                    readOnly
                                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm outline-none font-mono"
                                />
                            </div>
                        </div>

                        {detectingDistrict && (
                            <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-primary bg-primary/10 px-3 py-2.5 rounded-lg mb-3">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                                <span>Detecting district from location...</span>
                            </div>
                        )}

                        {hasLocation ? (
                            <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2.5 rounded-lg">
                                <CheckCircle size={14} />
                                <span>Location set! District: {formData.area || 'Detecting...'}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-2.5 rounded-lg">
                                <AlertCircle size={14} />
                                <span>No location set yet — click on the map to auto-detect district</span>
                            </div>
                        )}
                    </div>

                    {/* AmenitiesSelector */}
                    <AmenitiesSelector
                        amenities={formData.amenities}
                        onAdd={addAmenity}
                        onRemove={removeAmenity}
                        label="Amenities & Services"
                        maxLength={30}
                    />

                    {/* ✅ ROOMS MANAGEMENT SECTION - FETCHED FROM DATABASE */}
                    <div className="bg-linear-to-br from-purple-500/10 to-indigo-500/10 rounded-2xl p-4 md:p-6 border border-purple-500/20">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                    <DoorOpen size={16} className="text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-xs sm:text-sm font-black text-foreground uppercase tracking-tighter">
                                        Rooms & Spaces
                                    </h3>
                                    <p className="text-[7px] sm:text-[8px] text-muted-foreground mt-0.5">
                                        {loadingRooms ? 'Loading...' : `${rooms.length} room(s) configured`}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!spaceId && !initialData?._id) {
                                        showToast({
                                            icon: 'warning',
                                            title: 'Save Space First',
                                            text: 'Please save the space before adding rooms'
                                        });
                                        return;
                                    }
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
                                        floor_number: 1,
                                        is_available: true
                                    });
                                    setRoomImages([]);
                                    setRoomErrors({});
                                    setRoomTouched({});
                                    setShowRoomModal(true);
                                }}
                                className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
                            >
                                <Plus size={14} />
                                Add Room
                            </button>
                        </div>

                        {loadingRooms ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-purple-600" size={32} />
                            </div>
                        ) : rooms.length === 0 ? (
                            <div className="text-center py-8 bg-muted rounded-xl border border-border">
                                <DoorOpen size={32} className="mx-auto text-muted-foreground mb-3" />
                                <p className="text-sm text-foreground font-bold">No Rooms Added Yet</p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    Add private offices, meeting rooms, or other spaces
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!spaceId && !initialData?._id) {
                                            showToast({
                                                icon: 'warning',
                                                title: 'Save Space First',
                                                text: 'Please save the space before adding rooms'
                                            });
                                            return;
                                        }
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
                                            floor_number: 1,
                                            is_available: true
                                        });
                                        setRoomImages([]);
                                        setRoomErrors({});
                                        setRoomTouched({});
                                        setShowRoomModal(true);
                                    }}
                                    className="mt-3 px-6 py-2 bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-xl text-[10px] font-black uppercase hover:bg-purple-600 hover:text-white transition-all"
                                >
                                    + Add Your First Room
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {rooms.map(room => (
                                    <div key={room._id} className="bg-muted/50 rounded-xl p-4 border border-border hover:border-purple-500/30 transition-all">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <DoorOpen size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
                                                    <h4 className="text-sm font-black text-foreground truncate">{room.name}</h4>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    <span className="text-[9px] bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-black uppercase">
                                                        {getRoomTypeLabel(room.type)}
                                                    </span>
                                                    <span className="text-[9px] bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                                                        <UsersIcon size={10} className="inline mr-0.5" />
                                                        {room.capacity} pax
                                                    </span>
                                                    <span className="text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                                        ₱{room.rate_hour}/hr
                                                    </span>
                                                    {room.is_airconditioned && (
                                                        <span className="text-[9px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-full">
                                                            <Wind size={10} className="inline mr-0.5" />
                                                            AC
                                                        </span>
                                                    )}
                                                    {room.has_window && (
                                                        <span className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                                                            <Sun size={10} className="inline mr-0.5" />
                                                            Window
                                                        </span>
                                                    )}
                                                    {room.is_available ? (
                                                        <span className="text-[8px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black">
                                                            Available
                                                        </span>
                                                    ) : (
                                                        <span className="text-[8px] bg-rose-500/20 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-black">
                                                            Unavailable
                                                        </span>
                                                    )}
                                                </div>
                                                {room.description && (
                                                    <p className="text-[8px] text-muted-foreground mt-2 line-clamp-2">
                                                        {room.description}
                                                    </p>
                                                )}
                                                {room.amenities && room.amenities.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {room.amenities.slice(0, 3).map((amenity, idx) => (
                                                            <span key={idx} className="text-[7px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                                                                {amenity}
                                                            </span>
                                                        ))}
                                                        {room.amenities.length > 3 && (
                                                            <span className="text-[7px] text-muted-foreground">
                                                                +{room.amenities.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-1 ml-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditRoom(room)}
                                                    className="p-1.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all"
                                                >
                                                    <Edit size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRoom(room._id)}
                                                    className="p-1.5 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <FormTextArea
                        label="Description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Describe your space, rules, facilities, etc."
                        rows={4}
                        maxLength={1000}
                        touched={touched.description}
                    />

                    {/* Weekly Schedule */}
                    <div className="bg-muted rounded-2xl p-3 sm:p-6 border border-border">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                    <Clock size={16} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-[10px] sm:text-sm font-black text-foreground uppercase tracking-tighter">Weekly Schedule</h3>
                                    <p className="text-[7px] sm:text-[8px] text-muted-foreground mt-0.5">Set your space's operating hours</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newHours = { ...formData.hours_json };
                                        days.forEach(day => {
                                            newHours[day] = {
                                                active: true,
                                                open: '00:00',
                                                close: '23:59'
                                            };
                                        });
                                        setFormData(prev => ({ ...prev, hours_json: newHours }));
                                        showToast({ icon: 'success', title: '24/7 Schedule Applied', duration: 2000 });
                                    }}
                                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                >
                                    <span className="text-[10px] sm:text-[11px]">🕒</span>
                                    <span>24/7 All Days</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const newHours = { ...formData.hours_json };
                                        days.forEach(day => {
                                            newHours[day] = {
                                                active: true,
                                                open: '08:00',
                                                close: '20:00'
                                            };
                                        });
                                        setFormData(prev => ({ ...prev, hours_json: newHours }));
                                        showToast({ icon: 'success', title: 'Default Schedule Applied', duration: 2000 });
                                    }}
                                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-600/20 hover:bg-slate-600/30 text-muted-foreground rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                >
                                    <span className="text-[10px] sm:text-[11px]">↺</span>
                                    <span>Reset to Default</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 sm:space-y-3">
                            {days.map((day, index) => {
                                const isActive = formData.hours_json[day]?.active ?? true;
                                const openTime = formData.hours_json[day]?.open || '09:00';
                                const closeTime = formData.hours_json[day]?.close || '18:00';
                                const is247 = openTime === '00:00' && closeTime === '23:59';

                                return (
                                    <div
                                        key={day}
                                        className={`block p-3 sm:p-4 rounded-xl transition-all duration-200 ${isActive
                                            ? 'bg-primary/5 border border-primary/20'
                                            : 'bg-muted border border-border opacity-60'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isActive}
                                                    onChange={(e) => handleHoursChange(day, 'active', e.target.checked)}
                                                    className="w-4 h-4 sm:w-4.5 sm:h-4.5 accent-primary rounded cursor-pointer"
                                                />
                                                <span className={`text-[11px] sm:text-xs font-black capitalize ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {dayLabels[index]}
                                                </span>
                                            </label>

                                            <div className="flex items-center gap-2">
                                                {is247 && isActive && (
                                                    <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full font-black uppercase">
                                                        24 hrs
                                                    </span>
                                                )}
                                                <span className={`text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${isActive
                                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-slate-500/20 text-muted-foreground'
                                                    }`}>
                                                    {isActive ? 'Open' : 'Closed'}
                                                </span>
                                            </div>
                                        </div>

                                        {isActive && (
                                            <div className="flex flex-wrap items-center gap-2 pl-2 sm:pl-4">
                                                <div className="flex-1 min-w-30">
                                                    <div className="relative">
                                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] text-muted-foreground pointer-events-none">
                                                            🕐
                                                        </div>
                                                        <input
                                                            type="time"
                                                            value={openTime}
                                                            onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                                                            className="w-full bg-background border border-border rounded-lg text-[11px] sm:text-xs font-bold text-foreground py-2 pl-7 pr-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                                                        />
                                                    </div>
                                                </div>

                                                <span className="text-[8px] sm:text-[10px] font-black text-muted-foreground">→</span>

                                                <div className="flex-1 min-w-30">
                                                    <div className="relative">
                                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] text-muted-foreground pointer-events-none">
                                                            🕐
                                                        </div>
                                                        <input
                                                            type="time"
                                                            value={closeTime}
                                                            onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                                                            className="w-full bg-background border border-border rounded-lg text-[11px] sm:text-xs font-bold text-foreground py-2 pl-7 pr-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (is247) {
                                                            handleHoursChange(day, 'open', '09:00');
                                                            handleHoursChange(day, 'close', '18:00');
                                                            showToast({ icon: 'info', title: `${dayLabels[index]} reverted to 9AM-6PM`, duration: 1500 });
                                                        } else {
                                                            handleHoursChange(day, 'open', '00:00');
                                                            handleHoursChange(day, 'close', '23:59');
                                                            if (!isActive) {
                                                                handleHoursChange(day, 'active', true);
                                                            }
                                                            showToast({ icon: 'success', title: `${dayLabels[index]} set to 24/7`, duration: 1500 });
                                                        }
                                                    }}
                                                    className={`px-2 py-1 rounded-lg text-[7px] sm:text-[8px] font-black uppercase whitespace-nowrap transition-all ${is247
                                                        ? 'bg-slate-600/20 hover:bg-slate-600/30 text-muted-foreground'
                                                        : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-400'
                                                        }`}
                                                >
                                                    {is247 ? 'Cancel 24hrs' : '24hrs'}
                                                </button>
                                            </div>
                                        )}

                                        {!isActive && (
                                            <div className="pl-2 sm:pl-4 mt-1">
                                                <p className="text-[7px] sm:text-[8px] text-muted-foreground italic">
                                                    ⚠️ Day is closed - customers cannot book the main space
                                                </p>
                                                <p className="text-[7px] sm:text-[8px] text-muted-foreground/60 mt-0.5">
                                                    💡 Private rooms can still be booked (if they have their own hours)
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-5 pt-4 border-t border-border">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex items-start gap-2">
                                    <span className="text-[10px]">✅</span>
                                    <div>
                                        <p className="text-[8px] sm:text-[9px] text-foreground font-bold">Open Day</p>
                                        <p className="text-[7px] sm:text-[8px] text-muted-foreground">Main space is bookable during selected hours</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-[10px]">❌</span>
                                    <div>
                                        <p className="text-[8px] sm:text-[9px] text-foreground font-bold">Closed Day</p>
                                        <p className="text-[7px] sm:text-[8px] text-muted-foreground">Main space is closed, but private rooms may still be available</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-[10px]">🕒</span>
                                    <div>
                                        <p className="text-[8px] sm:text-[9px] text-foreground font-bold">24/7 Operation</p>
                                        <p className="text-[7px] sm:text-[8px] text-muted-foreground">Day is open all day (00:00 - 23:59)</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-[10px]">🏠</span>
                                    <div>
                                        <p className="text-[8px] sm:text-[9px] text-foreground font-bold">Private Rooms</p>
                                        <p className="text-[7px] sm:text-[8px] text-muted-foreground">Rooms can have their own separate schedule</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Images section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">
                                Space Images ({images.length}/10)
                            </label>
                            {imageFilesCount > 0 && (
                                <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold">
                                    {imageFilesCount} new image(s) ready
                                </span>
                            )}
                            {existingImagesCount > 0 && (
                                <span className="text-[8px] text-blue-600 dark:text-blue-400 font-bold">
                                    {existingImagesCount} existing
                                </span>
                            )}
                        </div>

                        <div className="mt-2">
                            <label className="cursor-pointer">
                                <div className={cn(
                                    "border-2 border-dashed rounded-4xl p-4 group hover:border-primary/30 transition-all text-center",
                                    uploadingImages ? "border-primary/50 bg-primary/5" : "border-border"
                                )}>
                                    {uploadingImages ? (
                                        <div className="space-y-3">
                                            <Loader2 size={32} className="text-primary mx-auto animate-spin" />
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Processing images...</p>
                                            <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-1.5">
                                                <div
                                                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-[8px] text-muted-foreground">{uploadProgress}%</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload size={32} className="text-muted-foreground mx-auto mb-3 group-hover:text-primary transition-colors" />
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                {images.length >= 10 ? 'Maximum images reached' : 'Click to select images'}
                                            </p>
                                            <p className="text-[8px] text-muted-foreground/60 mt-1">
                                                Max 10 images • Auto-compressed for fast upload
                                            </p>
                                            <p className="text-[7px] text-muted-foreground/40 mt-0.5">
                                                JPG, PNG, GIF, WEBP • Max 50MB each
                                            </p>
                                        </>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    disabled={uploadingImages || images.length >= 10}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {images.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
                                {images.map((img, idx) => {
                                    const isFile = img instanceof File;
                                    const imageUrl = isFile ? URL.createObjectURL(img) : img;
                                    const isExisting = typeof img === 'string';

                                    return (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border group/image">
                                            <img
                                                src={imageUrl}
                                                className="w-full h-full object-cover"
                                                alt={`Preview ${idx + 1}`}
                                            />
                                            {isFile && (
                                                <div className="absolute top-1 left-1 bg-emerald-500/80 text-white text-[6px] font-black px-1 py-0.5 rounded-full">
                                                    NEW
                                                </div>
                                            )}
                                            {isExisting && (
                                                <div className="absolute top-1 left-1 bg-blue-500/80 text-white text-[6px] font-black px-1 py-0.5 rounded-full">
                                                    Saved
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeImage(idx)}
                                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/space/my-spaces')}
                            className="flex-1 py-4 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || uploadingImages}
                            className={cn(
                                "flex-1 py-4 rounded-2xl text-primary-foreground font-black text-[10px] uppercase shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
                                getButtonColor()
                            )}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 size={14} className="animate-spin" />
                                    {isEditing ? 'Updating...' : 'Creating...'}
                                </span>
                            ) : uploadingImages ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 size={14} className="animate-spin" />
                                    Processing Images...
                                </span>
                            ) : (
                                isEditing ? 'Update Space' : 'Publish Listing'
                            )}
                        </Button>
                    </div>
                </div>
            </form>

            {/* Room Modal */}
            {showRoomModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-3xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <DoorOpen size={20} className="text-purple-600 dark:text-purple-400" />
                                    <h2 className="text-lg font-black text-foreground uppercase tracking-tighter">
                                        {editingRoom ? 'Edit Room' : 'Add New Room'}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRoomModal(false);
                                        setEditingRoom(null);
                                    }}
                                    className="p-2 hover:bg-muted rounded-xl transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    label="Room Name"
                                    name="name"
                                    value={roomForm.name}
                                    onChange={handleRoomChange}
                                    onBlur={handleRoomBlur}
                                    required
                                    placeholder="e.g., Conference Room A"
                                    touched={roomTouched.name}
                                    error={roomErrors.name}
                                    maxLength={50}
                                />

                                <FormSelect
                                    label="Room Type"
                                    name="type"
                                    value={roomForm.type}
                                    onChange={handleRoomChange}
                                    onBlur={handleRoomBlur}
                                    required
                                    options={ROOM_TYPES}
                                    touched={roomTouched.type}
                                    error={roomErrors.type}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    label="Capacity (persons)"
                                    name="capacity"
                                    type="number"
                                    value={roomForm.capacity}
                                    onChange={handleRoomChange}
                                    onBlur={handleRoomBlur}
                                    required
                                    placeholder="e.g., 10"
                                    touched={roomTouched.capacity}
                                    error={roomErrors.capacity}
                                />

                                <FormInput
                                    label="Hourly Rate (₱)"
                                    name="rate_hour"
                                    type="number"
                                    value={roomForm.rate_hour}
                                    onChange={handleRoomChange}
                                    onBlur={handleRoomBlur}
                                    required
                                    placeholder="e.g., 350"
                                    touched={roomTouched.rate_hour}
                                    error={roomErrors.rate_hour}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    label="Floor Number"
                                    name="floor_number"
                                    type="number"
                                    value={roomForm.floor_number}
                                    onChange={handleRoomChange}
                                    onBlur={handleRoomBlur}
                                    placeholder="e.g., 2"
                                    touched={roomTouched.floor_number}
                                />

                                <div className="flex flex-col gap-3 pt-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="is_airconditioned"
                                            checked={roomForm.is_airconditioned}
                                            onChange={handleRoomChange}
                                            className="w-4 h-4 accent-purple-600 rounded"
                                        />
                                        <span className="text-xs font-bold text-foreground">
                                            <Wind size={14} className="inline mr-1" />
                                            Air Conditioned
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="has_window"
                                            checked={roomForm.has_window}
                                            onChange={handleRoomChange}
                                            className="w-4 h-4 accent-purple-600 rounded"
                                        />
                                        <span className="text-xs font-bold text-foreground">
                                            <Sun size={14} className="inline mr-1" />
                                            Has Window
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="is_available"
                                            checked={roomForm.is_available}
                                            onChange={handleRoomChange}
                                            className="w-4 h-4 accent-purple-600 rounded"
                                        />
                                        <span className="text-xs font-bold text-foreground">
                                            <CheckCircle size={14} className="inline mr-1" />
                                            Available for Booking
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <FormTextArea
                                label="Description"
                                name="description"
                                value={roomForm.description}
                                onChange={handleRoomChange}
                                onBlur={handleRoomBlur}
                                placeholder="Room features, size, equipment..."
                                rows={3}
                                maxLength={500}
                                touched={roomTouched.description}
                            />

                            {/* Room Amenities */}
                            <div className="bg-muted/50 rounded-xl p-4">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block mb-2">
                                    Room Amenities
                                </label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {roomForm.amenities.map((amenity, idx) => (
                                        <span
                                            key={idx}
                                            onClick={() => removeRoomAmenity(amenity)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium cursor-pointer hover:bg-red-500/30 hover:text-red-600 dark:hover:text-red-300 transition-all"
                                        >
                                            {amenity}
                                            <X size={12} className="hover:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add amenity (e.g., Whiteboard)"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                addRoomAmenity(e.target.value.trim());
                                                e.target.value = '';
                                            }
                                        }}
                                        className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-purple-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            const input = e.target.closest('.flex').querySelector('input');
                                            if (input && input.value.trim()) {
                                                addRoomAmenity(input.value.trim());
                                                input.value = '';
                                            }
                                        }}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black uppercase"
                                    >
                                        Add
                                    </button>
                                </div>
                                {roomErrors.amenities && (
                                    <p className="text-[10px] text-rose-500 mt-1">{roomErrors.amenities}</p>
                                )}
                            </div>

                            {/* Room Images */}
                            <div>
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block mb-2">
                                    Room Images (Optional)
                                </label>
                                <label className="cursor-pointer">
                                    <div className="border-2 border-dashed border-border rounded-xl p-4 hover:border-purple-500/30 transition-all text-center">
                                        <ImageIcon size={24} className="text-muted-foreground mx-auto mb-2" />
                                        <p className="text-[8px] font-black text-muted-foreground uppercase">Click to upload images</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleRoomImageUpload}
                                        className="hidden"
                                    />
                                </label>
                                {roomImages.length > 0 && (
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        {roomImages.map((img, idx) => (
                                            <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                                                <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" alt={`Room ${idx + 1}`} />
                                                <button
                                                    type="button"
                                                    onClick={() => removeRoomImage(idx)}
                                                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500/80 text-white flex items-center justify-center text-[8px]"
                                                >
                                                    <X size={8} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRoomModal(false);
                                        setEditingRoom(null);
                                    }}
                                    className="flex-1 py-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveRoom}
                                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-bold text-sm transition-all"
                                >
                                    {editingRoom ? 'Update Room' : 'Add Room'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateSpace;