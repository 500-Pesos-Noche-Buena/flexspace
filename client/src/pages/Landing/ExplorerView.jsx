import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MapExplorer from './MapExplorer';
import { apiGet } from '@/utils/Api';
import { 
    CheckCircle2, List, Map as MapIcon, Loader2, 
    Search, SlidersHorizontal, X, Target, 
    Star, DollarSign, Zap, TrendingUp, Clock
} from 'lucide-react';
import { getSpaceImage } from '@/utils/imageHelper';
import { cn } from '@/utils/cn';

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
    { value: 'distance', label: 'Nearest First', icon: <Target size={12} /> },
];

const ExplorerView = () => {
    const [viewMode, setViewMode] = useState('list');
    const [showFilters, setShowFilters] = useState(false);
    const [allSpaces, setAllSpaces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [maxRate, setMaxRate] = useState("");
    const [minRating, setMinRating] = useState(0);
    const [sortBy, setSortBy] = useState("rating");
    const [debouncedRate, setDebouncedRate] = useState("");
    
    const [userLatLng, setUserLatLng] = useState(null);
    const [focusedSpace, setFocusedSpace] = useState(null);
    const [visibleCount, setVisibleCount] = useState(24);
    const [isLocating, setIsLocating] = useState(false);

    const lastDataFingerprint = useRef("");

    const parseCoord = (val) => {
        if (typeof val === 'number' && !isNaN(val)) return val;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
    };

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
                const coords = [pos.coords.latitude, pos.coords.longitude];
                setUserLatLng(coords);
                setFocusedSpace({ lat: coords[0], lng: coords[1], isUser: true });
                if (window.innerWidth < 768) setViewMode('map');
                setIsLocating(false);
            },
            (err) => {
                console.warn(err);
                setIsLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

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

    const handleSpaceClick = (space) => {
        setFocusedSpace(space);
        if (window.innerWidth < 768) setViewMode('map');
    };

    const clearFilters = () => {
        setSelectedDistrict("");
        setMaxRate("");
        setMinRating(0);
        setSortBy("rating");
        setSearchQuery("");
        setUserLatLng(null);
    };

    const hasActiveFilters = selectedDistrict || maxRate || minRating > 0 || sortBy !== "rating" || searchQuery;

    if (loading) return (
        <div className="h-[75vh] w-full flex items-center justify-center bg-white rounded-[2.5rem]">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
    );

    return (
        // Main container with isolation to contain all children
        <div className="relative h-[85vh] w-full bg-slate-50 overflow-hidden flex flex-col md:rounded-[2.5rem] border border-slate-100 shadow-sm" style={{ isolation: 'isolate' }}>
            
            {/* SEARCH & FILTERS TOP BAR - Normal z-index */}
            <div className="bg-white p-4 border-b border-slate-100 flex items-center gap-2 relative z-10">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="SEARCH HUBS..." 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-indigo-500/10 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <button 
                    onClick={handleLocateUser}
                    disabled={isLocating}
                    className="p-3 rounded-2xl bg-slate-50 text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all disabled:opacity-50"
                >
                    {isLocating ? <Loader2 size={18} className="animate-spin" /> : <Target size={18} />}
                </button>

                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                        "p-3 rounded-2xl border transition-all",
                        showFilters ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600'
                    )}
                >
                    <SlidersHorizontal size={18} />
                </button>
            </div>

            {/* ANIMATED FILTER DRAWER - Lower z-index to stay inside container */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-18 left-4 right-4 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-20"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black uppercase italic text-[10px] tracking-widest">Filter Hubs</h3>
                            <div className="flex gap-2">
                                {hasActiveFilters && (
                                    <button onClick={clearFilters} className="text-[8px] font-black text-indigo-600 uppercase tracking-wider">
                                        Clear All
                                    </button>
                                )}
                                <X size={18} className="cursor-pointer text-slate-400 hover:text-slate-600" onClick={() => setShowFilters(false)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* District Filter */}
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">District</label>
                                <select 
                                    className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border-none"
                                    value={selectedDistrict}
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                >
                                    <option value="">All Districts</option>
                                    {districts.map(d => (
                                        <option key={d._id} value={d._id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Price Filter */}
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Price (₱/hr)</label>
                                <div className="relative">
                                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="number" 
                                        className="w-full pl-8 pr-3 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border-none"
                                        placeholder="Any"
                                        value={maxRate}
                                        onChange={(e) => setMaxRate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Rating Filter */}
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Minimum Rating</label>
                                <select 
                                    className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border-none"
                                    value={minRating}
                                    onChange={(e) => setMinRating(parseFloat(e.target.value))}
                                >
                                    {RATING_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Sort By */}
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Sort By</label>
                                <select 
                                    className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border-none"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    {SORT_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Active Filters Display */}
                        {hasActiveFilters && (
                            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
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
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results Count - Normal z-index */}
            {!loading && (
                <div className="px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-slate-100 text-[9px] font-black text-slate-500 relative z-10">
                    <span className="text-indigo-600">{filteredAndSortedSpaces.length}</span> spaces found
                    {userLatLng && <span className="ml-2 text-[8px]">· Sorted by distance</span>}
                </div>
            )}

            {/* MAIN LAYOUT */}
            <div className="flex-1 relative flex overflow-hidden">
                
                {/* LIST VIEW CONTAINER */}
                <AnimatePresence mode="wait">
                    {(viewMode === 'list' || window.innerWidth >= 768) && (
                        <motion.div 
                            key="grid-pane"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={cn(
                                "flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50",
                                viewMode === 'map' ? 'hidden md:block' : 'block'
                            )}
                        >
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                                {filteredAndSortedSpaces.slice(0, visibleCount).map((space, idx) => (
                                    <motion.div 
                                        key={space._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        onClick={() => handleSpaceClick(space)}
                                        className={cn(
                                            "bg-white rounded-3xl border overflow-hidden transition-all group cursor-pointer",
                                            focusedSpace?._id === space._id ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-100 hover:shadow-xl'
                                        )}
                                    >
                                        <div className="aspect-4/3 relative bg-slate-100 overflow-hidden">
                                            <img 
                                                src={getSpaceImage(space)}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                alt={space.name}
                                                onError={e => { e.target.src = '/placeholders/space.jpg'; }}
                                            />
                                            <div className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[8px] font-black">
                                                ₱{space.rate_hour}/hr
                                            </div>
                                            {space.rating > 0 && (
                                                <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                                    <Star size={8} className="fill-amber-400 text-amber-400" />
                                                    <span className="text-[8px] font-bold">{space.rating.toFixed(1)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <h4 className="text-[10px] font-black uppercase italic truncate text-slate-900">{space.name}</h4>
                                            <div className="flex items-center justify-between mt-1">
                                                <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{space.location}</p>
                                                {space.distance != null && (
                                                    <span className="text-[7px] font-black text-indigo-600">{space.distance.toFixed(1)}km</span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            
                            {filteredAndSortedSpaces.length > visibleCount && (
                                <button 
                                    onClick={() => setVisibleCount(prev => prev + 24)}
                                    className="w-full mt-8 py-4 bg-white border border-slate-200 rounded-3xl text-[9px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-all mb-20"
                                >
                                    Load More ({filteredAndSortedSpaces.length - visibleCount} remaining)
                                </button>
                            )}

                            {filteredAndSortedSpaces.length === 0 && (
                                <div className="py-20 text-center">
                                    <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <Zap size={24} className="text-slate-300" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">No spaces found</p>
                                    <button onClick={clearFilters} className="mt-4 text-[8px] text-indigo-600 underline">Clear filters</button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MAP VIEW CONTAINER */}
                <motion.div 
                    layout
                    className={cn(
                        "md:flex-[0.8] lg:flex-1 h-full bg-slate-200 transition-all duration-500",
                        viewMode === 'list' ? 'hidden md:block' : 'block absolute inset-0 z-10 md:relative'
                    )}
                >
                    <MapExplorer 
                        spaces={filteredAndSortedSpaces} 
                        focusedSpace={focusedSpace}
                        userLatLng={userLatLng}
                        onMarkerClick={handleSpaceClick}
                    />
                </motion.div>
            </div>

            {/* MOBILE FLOATING TOGGLE - Lower z-index to stay inside container */}
            <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl"
            >
                {viewMode === 'list' ? <><MapIcon size={14} /> View Map</> : <><List size={14} /> View Grid</>}
            </motion.button>
        </div>
    );
};

export default ExplorerView;