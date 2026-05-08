import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/utils/Api';
import { 
    MapPin, Star, Clock, Users, Wifi, Coffee, Zap, Search, X,
    Loader2, SlidersHorizontal, Target, DollarSign
} from 'lucide-react';
import { getSpaceImage } from '@/utils/imageHelper';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const DEFAULT_LAT = 10.7202;
const DEFAULT_LNG = 122.5621;

// Rating options
const RATING_OPTIONS = [
    { value: 0, label: 'All' },
    { value: 4.5, label: '4.5+ ⭐' },
    { value: 4.0, label: '4.0+ ⭐' },
    { value: 3.5, label: '3.5+ ⭐' },
];

// Sort options
const SORT_OPTIONS = [
    { value: 'rating', label: 'Top Rated', icon: <Star size={12} /> },
    { value: 'price_low', label: 'Price: Low to High', icon: <DollarSign size={12} /> },
    { value: 'price_high', label: 'Price: High to Low', icon: <DollarSign size={12} className="rotate-180" /> },
];

const ExploreSpaces = () => {
    const navigate = useNavigate();
    const [allSpaces, setAllSpaces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    
    // Filters state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [maxRate, setMaxRate] = useState("");
    const [minRating, setMinRating] = useState(0);
    const [sortBy, setSortBy] = useState("rating");
    const [debouncedRate, setDebouncedRate] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [visibleCount, setVisibleCount] = useState(24);
    
    const [userLatLng, setUserLatLng] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const lastDataFingerprint = useRef("");

    const parseCoord = (val) => {
        if (typeof val === 'number' && !isNaN(val)) return val;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
    };

    // Fetch all spaces
    const fetchExplorerData = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const res = await apiGet('/landing/explorer');
            const spacesRaw = res?.data?.spaces || res?.spaces || [];
            const districtsRaw = res?.data?.districts || res?.districts || [];

            const normalized = spacesRaw.map((s, i) => ({
                ...s,
                lat: parseCoord(s.lat) ?? (DEFAULT_LAT + i * 0.0001),
                lng: parseCoord(s.lng) ?? (DEFAULT_LNG + i * 0.0001),
                location: s.district_id?.name || s.area || 'Iloilo City'
            }));

            const fingerprint = JSON.stringify({ normalized, districtsRaw });
            if (fingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = fingerprint;
                setAllSpaces(normalized);
                setDistricts(districtsRaw);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExplorerData(true);
        const interval = setInterval(() => fetchExplorerData(false), 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedRate(maxRate), 300);
        return () => clearTimeout(timer);
    }, [maxRate]);

    const handleLocateUser = () => {
        if (!navigator.geolocation) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLatLng([pos.coords.latitude, pos.coords.longitude]);
                setIsLocating(false);
            },
            (err) => {
                console.warn(err);
                setIsLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    // Filter and sort spaces
    const filteredAndSortedSpaces = useMemo(() => {
        let result = [...allSpaces];

        // Filter by district
        if (selectedDistrict) {
            result = result.filter(s => {
                const districtId = s.district_id?._id || s.district_id;
                return districtId === selectedDistrict;
            });
        }

        // Filter by price
        if (debouncedRate) {
            result = result.filter(s => s.rate_hour <= parseInt(debouncedRate));
        }

        // Filter by rating
        if (minRating > 0) {
            result = result.filter(s => (s.rating || 0) >= minRating);
        }

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s => 
                s.name.toLowerCase().includes(query) ||
                s.location.toLowerCase().includes(query)
            );
        }

        // Calculate distance if user location available
        if (userLatLng) {
            result = result.map(s => {
                const R = 6371;
                const dLat = (s.lat - userLatLng[0]) * Math.PI / 180;
                const dLon = (s.lng - userLatLng[1]) * Math.PI / 180;
                const a = Math.sin(dLat/2)**2 + Math.cos(userLatLng[0]*Math.PI/180) * Math.cos(s.lat*Math.PI/180) * Math.sin(dLon/2)**2;
                return { ...s, distance: R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) };
            });
        }

        // Sort
        if (sortBy === 'price_low') {
            result.sort((a, b) => a.rate_hour - b.rate_hour);
        } else if (sortBy === 'price_high') {
            result.sort((a, b) => b.rate_hour - a.rate_hour);
        } else if (sortBy === 'distance' && userLatLng) {
            result.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        } else {
            result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }

        return result;
    }, [allSpaces, selectedDistrict, debouncedRate, minRating, searchQuery, sortBy, userLatLng]);

    const clearFilters = () => {
        setSelectedDistrict("");
        setMaxRate("");
        setMinRating(0);
        setSortBy("rating");
        setSearchQuery("");
        setUserLatLng(null);
        setShowFilters(false);
    };

    const hasActiveFilters = selectedDistrict || maxRate || minRating > 0 || sortBy !== "rating" || searchQuery || userLatLng;

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 pt-10 pb-6 px-4 md:px-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 tracking-tight">
                        Explore All Spaces
                    </h1>
                    <p className="text-slate-500 text-sm max-w-2xl">
                        Discover coworking spaces, study hubs, and professional workspaces across Iloilo City.
                    </p>
                </div>
            </div>

            {/* Search & Filters Bar */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 md:px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, area, or district..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-indigo-400 transition-all outline-none"
                            />
                        </div>
                        
                        <div className="flex gap-2">
                            <button
                                onClick={handleLocateUser}
                                disabled={isLocating}
                                className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all disabled:opacity-50"
                            >
                                {isLocating ? <Loader2 size={18} className="animate-spin" /> : <Target size={18} />}
                            </button>
                            
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={cn(
                                    "px-5 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2",
                                    showFilters 
                                        ? "bg-indigo-600 text-white" 
                                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200"
                                )}
                            >
                                <SlidersHorizontal size={16} />
                                Filters
                                {hasActiveFilters && <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />}
                            </button>
                            
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="px-5 py-3 rounded-xl text-sm font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Drawer */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-200"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* District Filter */}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">District</label>
                                        <select
                                            value={selectedDistrict}
                                            onChange={(e) => setSelectedDistrict(e.target.value)}
                                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-indigo-400 outline-none"
                                        >
                                            <option value="">All Districts</option>
                                            {districts.map(d => (
                                                <option key={d._id} value={d._id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Price Filter */}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Max Price (₱/hr)</label>
                                        <div className="relative">
                                            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="number"
                                                placeholder="Any"
                                                value={maxRate}
                                                onChange={(e) => setMaxRate(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-indigo-400 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Rating Filter */}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Minimum Rating</label>
                                        <select
                                            value={minRating}
                                            onChange={(e) => setMinRating(parseFloat(e.target.value))}
                                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-indigo-400 outline-none"
                                        >
                                            {RATING_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Sort By */}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Sort By</label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-indigo-400 outline-none"
                                        >
                                            {SORT_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Active Filters Tags */}
                                {hasActiveFilters && (
                                    <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                                        {selectedDistrict && (
                                            <span className="text-[8px] px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full flex items-center gap-1">
                                                District: {districts.find(d => d._id === selectedDistrict)?.name}
                                                <X size={10} className="cursor-pointer" onClick={() => setSelectedDistrict("")} />
                                            </span>
                                        )}
                                        {maxRate && (
                                            <span className="text-[8px] px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full flex items-center gap-1">
                                                Max ₱{maxRate}
                                                <X size={10} className="cursor-pointer" onClick={() => setMaxRate("")} />
                                            </span>
                                        )}
                                        {minRating > 0 && (
                                            <span className="text-[8px] px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full flex items-center gap-1">
                                                {minRating}+ ⭐
                                                <X size={10} className="cursor-pointer" onClick={() => setMinRating(0)} />
                                            </span>
                                        )}
                                        {userLatLng && (
                                            <span className="text-[8px] px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full flex items-center gap-1">
                                                Near Me
                                                <X size={10} className="cursor-pointer" onClick={() => setUserLatLng(null)} />
                                            </span>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Results Count */}
            <div className="px-4 md:px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <p className="text-xs text-slate-500">
                        <span className="font-bold text-slate-900">{filteredAndSortedSpaces.length}</span> spaces found
                        {userLatLng && <span className="ml-2">· Sorted by distance</span>}
                    </p>
                </div>
            </div>

            {/* Spaces Grid with Infinite Scroll */}
            <div className="px-4 md:px-6 pb-20">
                <div className="max-w-7xl mx-auto">
                    {filteredAndSortedSpaces.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <Zap size={32} className="text-slate-300" />
                            </div>
                            <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No spaces found</p>
                            <button onClick={clearFilters} className="mt-4 text-xs text-indigo-600 underline">Clear filters</button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredAndSortedSpaces.slice(0, visibleCount).map((space, idx) => (
                                    <motion.div
                                        key={space._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                                        onClick={() => navigate(`/explore/${space._id}`)}
                                        className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer hover:border-indigo-200"
                                    >
                                        {/* Image Section */}
                                        <div className="relative h-48 bg-slate-100 overflow-hidden">
                                            <img
                                                src={getSpaceImage(space)}
                                                alt={space.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = '/placeholders/space.jpg';
                                                }}
                                            />
                                            <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm">
                                                <span className="text-[10px] font-black text-indigo-600">₱{space.rate_hour}/hr</span>
                                            </div>
                                            <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                                                <Star size={10} className="fill-amber-400 text-amber-400" />
                                                <span className="text-[9px] font-bold">{space.rating?.toFixed(1) || 5.0}</span>
                                            </div>
                                            <div className="absolute bottom-3 left-3 flex gap-1">
                                                {space.amenities?.slice(0, 2).map((amenity, i) => (
                                                    <div key={i} className="bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                                                        <span className="text-[7px] font-black text-slate-600 uppercase">{amenity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-4">
                                            <h3 className="font-black text-slate-900 text-base tracking-tight line-clamp-1">
                                                {space.name}
                                            </h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                                <MapPin size={10} /> {space.location}
                                            </p>
                                            
                                            <div className="flex items-center gap-3 mt-3 text-[9px] text-slate-500">
                                                {space.capacity > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <Users size={10} />
                                                        <span>{space.capacity} seats</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <Clock size={10} />
                                                    <span>{space.is_open_time ? 'Open Now' : 'Flexible Hours'}</span>
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-2 border-t border-slate-50">
                                                <span className="text-[7px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full">
                                                    ✓ Verified Space
                                                </span>
                                                {space.distance != null && (
                                                    <span className="text-[7px] text-slate-400 ml-2">{space.distance.toFixed(1)}km away</span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Load More Button */}
                            {filteredAndSortedSpaces.length > visibleCount && (
                                <div className="text-center mt-10">
                                    <button
                                        onClick={() => setVisibleCount(prev => prev + 24)}
                                        className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 transition-all"
                                    >
                                        Load More ({filteredAndSortedSpaces.length - visibleCount} remaining)
                                    </button>
                                </div>
                            )}

                            {/* SEO Footer */}
                            <div className="text-center mt-12 pt-6 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 max-w-2xl mx-auto">
                                    Looking for the perfect workspace in Iloilo City? From Molo to Jaro, 
                                    Mandurriao to City Proper, FlexSpace connects you with the best coworking spots 
                                    featuring high-speed internet, comfortable seating, and professional environments.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExploreSpaces;