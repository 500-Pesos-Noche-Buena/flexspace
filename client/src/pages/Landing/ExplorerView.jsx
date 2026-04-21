import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MapExplorer from './MapExplorer';
import { apiGet } from '@/utils/Api';
import { 
    CheckCircle2, List, Map as MapIcon, Loader2, 
    Search, SlidersHorizontal, X, Target 
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const DEFAULT_LAT = 10.7202;
const DEFAULT_LNG = 122.5621;

const ExplorerView = () => {
    const [viewMode, setViewMode] = useState('list');
    const [showFilters, setShowFilters] = useState(false);
    const [allSpaces, setAllSpaces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [maxRate, setMaxRate] = useState("");
    const [debouncedRate, setDebouncedRate] = useState("");
    
    const [userLatLng, setUserLatLng] = useState(null);
    const [focusedSpace, setFocusedSpace] = useState(null);
    const [visibleCount, setVisibleCount] = useState(24);

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
        const interval = setInterval(() => fetchExplorerData(false), 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedRate(maxRate), 300);
        return () => clearTimeout(timer);
    }, [maxRate]);

    const handleLocateUser = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = [pos.coords.latitude, pos.coords.longitude];
                setUserLatLng(coords);
                setFocusedSpace({ lat: coords[0], lng: coords[1], isUser: true });
                if (window.innerWidth < 768) setViewMode('map');
            },
            (err) => console.warn(err),
            { enableHighAccuracy: true }
        );
    };

    const filteredSpaces = useMemo(() => {
        let result = allSpaces.filter(s => {
            const districtId = s.district_id?._id || s.district_id;
            const districtMatch = !selectedDistrict || districtId === selectedDistrict;
            const rateMatch = !debouncedRate || s.rate_hour <= parseInt(debouncedRate);
            const searchMatch = !searchQuery || 
                s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.location.toLowerCase().includes(searchQuery.toLowerCase());
            
            return districtMatch && rateMatch && searchMatch;
        });

        if (userLatLng) {
            result = result.map(s => {
                const R = 6371;
                const dLat = (s.lat - userLatLng[0]) * Math.PI / 180;
                const dLon = (s.lng - userLatLng[1]) * Math.PI / 180;
                const a = Math.sin(dLat/2)**2 + Math.cos(userLatLng[0]*Math.PI/180)*Math.cos(s.lat*Math.PI/180)*Math.sin(dLon/2)**2;
                return { ...s, distance: R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) };
            }).sort((a, b) => a.distance - b.distance);
        }
        return result;
    }, [allSpaces, selectedDistrict, debouncedRate, searchQuery, userLatLng]);

    const handleSpaceClick = (s) => {
        setFocusedSpace(s);
        if (window.innerWidth < 768) setViewMode('map');
    };

    if (loading) return (
        <div className="h-[75vh] w-full flex items-center justify-center bg-white rounded-[2.5rem]">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
    );

    return (
        <div className="relative h-[85vh] w-full bg-slate-50 overflow-hidden flex flex-col md:rounded-[2.5rem] border border-slate-100 shadow-sm">
            
            {/* SEARCH & FILTERS TOP BAR */}
            <div className="bg-white p-4 border-b border-slate-100 flex items-center gap-2 z-50">
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
                    className="p-3 rounded-2xl bg-slate-50 text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                >
                    <Target size={18} />
                </button>

                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-3 rounded-2xl border transition-all ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                    <SlidersHorizontal size={18} />
                </button>
            </div>

            {/* ANIMATED FILTER DRAWER */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-20 left-4 right-4 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-60"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black uppercase italic text-[10px] tracking-widest">Filter Hubs</h3>
                            <X size={18} className="cursor-pointer text-slate-400" onClick={() => setShowFilters(false)} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">District</label>
                                <select 
                                    className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border-none"
                                    value={selectedDistrict}
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                >
                                    <option value="">EVERYWHERE</option>
                                    {districts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Budget (₱/hr)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border-none"
                                    placeholder="Max ₱"
                                    value={maxRate}
                                    onChange={(e) => setMaxRate(e.target.value)}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN LAYOUT */}
            <div className="flex-1 relative flex overflow-hidden">
                
                {/* GRID VIEW CONTAINER */}
                <AnimatePresence mode="wait">
                    {(viewMode === 'list' || window.innerWidth >= 768) && (
                        <motion.div 
                            key="grid-pane"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={`flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50 ${viewMode === 'map' ? 'hidden md:block' : 'block'}`}
                        >
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                                {filteredSpaces.slice(0, visibleCount).map((s, idx) => (
                                    <motion.div 
                                        key={s._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        onClick={() => handleSpaceClick(s)}
                                        className={`bg-white rounded-3xl border overflow-hidden transition-all group cursor-pointer ${focusedSpace?._id === s._id ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-100 hover:shadow-xl'}`}
                                    >
                                        <div className="aspect-4/3 relative bg-slate-100 overflow-hidden">
                                            <img 
                                                src={s.image ? `${API_BASE_URL}/uploads/spaces/${s.user_id}/${s.image}` : '/placeholder.jpg'} 
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                alt={s.name}
                                                onError={e => { e.target.src = '/placeholder.jpg'; }}
                                            />
                                            <div className="absolute top-2 right-2 bg-slate-900 text-white px-2 py-1 rounded-lg text-[8px] font-black">
                                                ₱{s.rate_hour}/hr
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h4 className="text-[10px] font-black uppercase italic truncate text-slate-900">{s.name}</h4>
                                            <div className="flex items-center justify-between mt-1">
                                                <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{s.location}</p>
                                                {s.distance != null && (
                                                    <span className="text-[7px] font-black text-indigo-600">{s.distance.toFixed(1)}km</span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            
                            {filteredSpaces.length > visibleCount && (
                                <button 
                                    onClick={() => setVisibleCount(prev => prev + 24)}
                                    className="w-full mt-8 py-4 bg-white border border-slate-200 rounded-3xl text-[9px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-all mb-20"
                                >
                                    Load More results
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MAP VIEW CONTAINER */}
                <motion.div 
                    layout
                    className={`md:flex-[0.8] lg:flex-1 h-full bg-slate-200 transition-all duration-500 ${viewMode === 'list' ? 'hidden md:block' : 'block absolute inset-0 z-10'}`}
                >
                    <MapExplorer 
                        spaces={filteredSpaces} 
                        focusedSpace={focusedSpace}
                        userLatLng={userLatLng}
                        onMarkerClick={handleSpaceClick}
                    />
                </motion.div>
            </div>

            {/* MOBILE FLOATING TOGGLE */}
            <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-1001 flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl"
            >
                {viewMode === 'list' ? <><MapIcon size={14} /> View Map</> : <><List size={14} /> View Grid</>}
            </motion.button>
        </div>
    );
};

export default ExplorerView;