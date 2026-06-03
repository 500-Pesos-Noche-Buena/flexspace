import React, { useState, useEffect } from 'react';
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
    X, CheckCircle, AlertCircle, Crosshair, Search
} from 'lucide-react';

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

const CreateSpace = ({ initialData = null, isEditing = false, spaceId = null }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [districts, setDistricts] = useState([]);
    const [images, setImages] = useState([]);
    const [detectingDistrict, setDetectingDistrict] = useState(false);
    const [existingImages, setExistingImages] = useState([]);
    const [errors, setErrors] = useState({});  // ← ADD THIS LINE

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

    // Populate form with existing data when editing
    useEffect(() => {
        if (initialData && isEditing) {
            // console.log('Populating form with data:', initialData);

            // Parse hours_json if it's a string
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

            // Store existing images as strings (URLs)
            if (initialData.images && initialData.images.length > 0) {
                setImages(initialData.images); // These are URLs, not File objects
            }

            // Set map center if coordinates exist
            if (initialData.lat && initialData.lng) {
                setMapCenter([parseFloat(initialData.lat), parseFloat(initialData.lng)]);
            }
        }
    }, [initialData, isEditing]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Handle numeric fields (rate_hour, capacity, available_rooms)
        if (name === 'rate_hour' || name === 'capacity' || name === 'available_rooms') {
            // Allow empty string
            if (value === '') {
                setFormData(prev => ({ ...prev, [name]: '' }));
                return;
            }

            // Check if it's a valid positive number (only digits, no negative sign)
            // Allow only numbers (0-9) and decimal point for rate_hour only
            if (name === 'rate_hour') {
                // Allow only positive numbers with optional decimal
                if (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 0) {
                    setFormData(prev => ({ ...prev, [name]: value }));
                }
            } else {
                // For capacity and available_rooms - only whole positive numbers
                if (/^\d+$/.test(value) && parseInt(value) >= 0) {
                    setFormData(prev => ({ ...prev, [name]: value }));
                }
            }
            return;
        }

        // For other fields, update normally
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    // Auto-detect district from coordinates
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

        if (images.length + files.length > 10) {
            showToast({ icon: 'warning', title: 'Maximum 10 images allowed' });
            return;
        }

        const invalidFiles = files.filter(file => file.size > 50 * 1024 * 1024);
        if (invalidFiles.length > 0) {
            showToast({ icon: 'error', title: 'Some files exceed 50MB limit' });
            return;
        }

        // Store files locally - they will be uploaded when form is submitted
        setImages(prev => [...prev, ...files]);
        showToast({ icon: 'success', title: `${files.length} image(s) added`, duration: 1500 });

        // Clear the input
        e.target.value = '';
    };


    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check if form has any empty required fields
        if (!formData.name || !formData.area || !formData.rate_hour || !formData.capacity) {
            showToast({ icon: 'error', title: 'Please fill in all required fields' });
            return;
        }

        // ✅ ADD NAME LENGTH VALIDATION
        if (formData.name.length > 50) {
            showToast({ icon: 'error', title: 'Space name cannot exceed 50 characters' });
            return;
        }

        if (formData.amenities.length === 0) {
            showToast({ icon: 'error', title: 'Please add at least one amenity' });
            return;
        }

        // For create: require images, for edit: images are optional
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

            // Append only NEW image files (not existing URLs)
            images.forEach(img => {
                if (img instanceof File) {
                    submitData.append('images', img);
                }
            });

            const url = isEditing ? `/space/spaces/${spaceId}/update` : '/space/spaces';
            // console.log('Submitting to:', url);

            const response = await apiPost(url, submitData);

            if (response.success) {
                showToast({ icon: 'success', title: isEditing ? 'Space updated!' : 'Space created!' });
                setTimeout(() => {
                    navigate('/space/my-spaces');
                }, 1500);
            }
        } catch (error) {
            console.error('Submit error:', error);
            showToast({ icon: 'error', title: error.message || `Failed to ${isEditing ? 'update' : 'create'} space` });
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

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-12">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
                    {isEditing ? 'Edit Space' : 'Create New Space'}
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">
                    {isEditing ? 'Modify your coworking space details' : 'List your coworking space'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-7xl mx-auto">
                <div className="bg-[#111114] border border-white/10 rounded-3xl p-6 space-y-6">

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
                            type="number"
                            value={formData.available_rooms}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="e.g., 5"
                            touched={touched.available_rooms}
                            error={errors.rate_hour}
                        />
                    </div>

                    {/* Location Map */}
                    <div className="bg-linear-to-br from-indigo-950/30 to-purple-950/30 rounded-2xl p-4 md:p-6 border border-indigo-500/20">
                        <div className="flex items-center gap-2 mb-4 md:mb-6">
                            <MapPin size={16} className="text-indigo-400" />
                            <label className="text-[11px] md:text-xs text-indigo-400 font-black uppercase tracking-widest">
                                Click on map to set location & auto-detect district
                            </label>
                        </div>

                        <AddressSearchBar onResult={handleLocationSelect} />

                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <button
                                type="button"
                                onClick={handleUseMyLocation}
                                disabled={detectingDistrict}
                                className="w-full sm:w-auto bg-black/50 backdrop-blur-md text-white text-[11px] md:text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all border border-white/10"
                            >
                                <Crosshair size={14} />
                                Use My Location
                            </button>
                            {hasLocation && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, lat: '', lng: '', area: '' }))}
                                    className="w-full sm:w-auto bg-black/50 text-rose-400 text-[11px] md:text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-all border border-rose-500/20"
                                >
                                    <X size={14} />
                                    Clear Pin
                                </button>
                            )}
                        </div>

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
                            <div className="bg-black/40 rounded-xl p-3 md:p-4 border border-white/5">
                                <label className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-wider">Latitude</label>
                                <input
                                    type="text"
                                    value={formData.lat}
                                    readOnly
                                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none font-mono"
                                />
                            </div>
                            <div className="bg-black/40 rounded-xl p-3 md:p-4 border border-white/5">
                                <label className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-wider">Longitude</label>
                                <input
                                    type="text"
                                    value={formData.lng}
                                    readOnly
                                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none font-mono"
                                />
                            </div>
                        </div>

                        {detectingDistrict && (
                            <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-indigo-400 bg-indigo-500/10 px-3 py-2.5 rounded-lg mb-3">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-400"></div>
                                <span>Detecting district from location...</span>
                            </div>
                        )}

                        {hasLocation ? (
                            <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-emerald-400 bg-emerald-500/10 px-3 py-2.5 rounded-lg">
                                <CheckCircle size={14} />
                                <span>Location set! District: {formData.area || 'Detecting...'}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-yellow-400 bg-yellow-500/10 px-3 py-2.5 rounded-lg">
                                <AlertCircle size={14} />
                                <span>No location set yet — click on the map to auto-detect district</span>
                            </div>
                        )}
                    </div>

                    <AmenitiesSelector
                        amenities={formData.amenities}
                        onAdd={addAmenity}
                        onRemove={removeAmenity}
                    />

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

                    <div className="bg-white/5 rounded-2xl p-3 sm:p-6 border border-white/10">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                    <Clock size={16} className="text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-[10px] sm:text-sm font-black text-white uppercase tracking-tighter">Weekly Schedule</h3>
                                    <p className="text-[7px] sm:text-[8px] text-slate-400 mt-0.5">Set your space's operating hours</p>
                                </div>
                            </div>

                            {/* Quick Actions Group */}
                            <div className="flex flex-wrap gap-2">
                                {/* Apply 24/7 to All Days */}
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
                                        showToast({ icon: 'success', title: '24/7 Schedule Applied', text: 'All days set to open 24 hours', duration: 2000 });
                                    }}
                                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                >
                                    <span className="text-[10px] sm:text-[11px]">🕒</span>
                                    <span>24/7 All Days</span>
                                </button>

                                {/* Reset All to Default (8am-8pm) */}
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
                                        showToast({ icon: 'success', title: 'Default Schedule Applied', text: 'All days set to 8AM - 8PM', duration: 2000 });
                                    }}
                                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                >
                                    <span className="text-[10px] sm:text-[11px]">↺</span>
                                    <span>Reset to Default</span>
                                </button>
                            </div>
                        </div>

                        {/* Schedule List */}
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
                                                ? 'bg-indigo-500/5 border border-indigo-500/20'
                                                : 'bg-white/5 border border-white/10 opacity-60'
                                            }`}
                                    >
                                        {/* Day Row */}
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isActive}
                                                    onChange={(e) => handleHoursChange(day, 'active', e.target.checked)}
                                                    className="w-4 h-4 sm:w-4.5 sm:h-4.5 accent-indigo-500 rounded cursor-pointer"
                                                />
                                                <span className={`text-[11px] sm:text-xs font-black capitalize ${isActive ? 'text-white' : 'text-slate-500'
                                                    }`}>
                                                    {dayLabels[index]}
                                                </span>
                                            </label>

                                            {/* Status Badges */}
                                            <div className="flex items-center gap-2">
                                                {is247 && isActive && (
                                                    <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-black uppercase">
                                                        24 hrs
                                                    </span>
                                                )}
                                                <span className={`text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${isActive
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : 'bg-slate-500/20 text-slate-500'
                                                    }`}>
                                                    {isActive ? 'Open' : 'Closed'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Time Inputs - Only show if day is open */}
                                        {isActive && (
                                            <div className="flex flex-wrap items-center gap-2 pl-2 sm:pl-4">
                                                <div className="flex-1 min-w-30">
                                                    <div className="relative">
                                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-500 pointer-events-none">
                                                            🕐
                                                        </div>
                                                        <input
                                                            type="time"
                                                            value={openTime}
                                                            onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                                                            className="w-full bg-black/60 border border-white/15 rounded-lg text-[11px] sm:text-xs font-bold text-white py-2 pl-7 pr-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                                                            style={{ colorScheme: 'dark' }}
                                                        />
                                                    </div>
                                                </div>

                                                <span className="text-[8px] sm:text-[10px] font-black text-slate-500">→</span>

                                                <div className="flex-1 min-w-30">
                                                    <div className="relative">
                                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-500 pointer-events-none">
                                                            🕐
                                                        </div>
                                                        <input
                                                            type="time"
                                                            value={closeTime}
                                                            onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                                                            className="w-full bg-black/60 border border-white/15 rounded-lg text-[11px] sm:text-xs font-bold text-white py-2 pl-7 pr-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                                                            style={{ colorScheme: 'dark' }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* 24/7 Quick button for this day */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (is247) {
                                                            // If already 24/7, revert to default
                                                            handleHoursChange(day, 'open', '09:00');
                                                            handleHoursChange(day, 'close', '18:00');
                                                            showToast({ icon: 'info', title: `${dayLabels[index]} reverted to 9AM-6PM`, duration: 1500 });
                                                        } else {
                                                            // Set to 24/7
                                                            handleHoursChange(day, 'open', '00:00');
                                                            handleHoursChange(day, 'close', '23:59');
                                                            if (!isActive) {
                                                                handleHoursChange(day, 'active', true);
                                                            }
                                                            showToast({ icon: 'success', title: `${dayLabels[index]} set to 24/7`, duration: 1500 });
                                                        }
                                                    }}
                                                    className={`px-2 py-1 rounded-lg text-[7px] sm:text-[8px] font-black uppercase whitespace-nowrap transition-all ${is247
                                                            ? 'bg-slate-600/20 hover:bg-slate-600/30 text-slate-400'
                                                            : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400'
                                                        }`}
                                                >
                                                    {is247 ? 'Cancel 24hrs' : '24hrs'}
                                                </button>
                                            </div>
                                        )}

                                        {/* Closed hint */}
                                        {!isActive && (
                                            <div className="pl-2 sm:pl-4 mt-1">
                                                <p className="text-[7px] sm:text-[8px] text-slate-500 italic">
                                                    ⚠️ Day is closed - customers cannot book the main space
                                                </p>
                                                <p className="text-[7px] sm:text-[8px] text-slate-600 mt-0.5">
                                                    💡 Private rooms can still be booked (if they have their own hours)
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Helpful Tips Section */}
                        <div className="mt-5 pt-4 border-t border-white/10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex items-start gap-2">
                                    <span className="text-[10px]">✅</span>
                                    <div>
                                        <p className="text-[8px] sm:text-[9px] text-slate-300 font-bold">Open Day</p>
                                        <p className="text-[7px] sm:text-[8px] text-slate-400">Main space is bookable during selected hours</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-[10px]">❌</span>
                                    <div>
                                        <p className="text-[8px] sm:text-[9px] text-slate-300 font-bold">Closed Day</p>
                                        <p className="text-[7px] sm:text-[8px] text-slate-400">Main space is closed, but private rooms may still be available</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-[10px]">🕒</span>
                                    <div>
                                        <p className="text-[8px] sm:text-[9px] text-slate-300 font-bold">24/7 Operation</p>
                                        <p className="text-[7px] sm:text-[8px] text-slate-400">Day is open all day (00:00 - 23:59)</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-[10px]">🏠</span>
                                    <div>
                                        <p className="text-[8px] sm:text-[9px] text-slate-300 font-bold">Private Rooms</p>
                                        <p className="text-[7px] sm:text-[8px] text-slate-400">Rooms can have their own separate schedule</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Images */}
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Space Images (Max 10, 50MB each)</label>
                        <div className="mt-2">
                            <label className="cursor-pointer">
                                <div className="border-2 border-dashed border-white/5 rounded-4xl p-4 group hover:border-indigo-500/30 transition-all text-center">
                                    <ImageIcon size={32} className="text-slate-700 mx-auto mb-3 group-hover:text-indigo-500 transition-colors" />
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Click to select images</p>
                                    <p className="text-[8px] text-slate-600 mt-1">Max 10 images, 50MB each (JPG, PNG, GIF, WEBP)</p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    disabled={uploadingImages || images.length >= 10}
                                    className="hidden"
                                />
                            </label>
                            {uploadingImages && (
                                <div className="mt-2 text-center text-indigo-400 text-[10px]">Uploading...</div>
                            )}
                        </div>

                        {images.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 group/image">
                                        <img src={typeof img === 'string' ? img : URL.createObjectURL(img)} className="w-full h-full object-cover" alt={`Preview ${idx + 1}`} />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-red-600"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/10">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/space/my-spaces')}
                            className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg shadow-indigo-900/40 hover:bg-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Space' : 'Publish Listing')}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateSpace;