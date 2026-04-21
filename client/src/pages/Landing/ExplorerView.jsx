import React, { useState, useEffect, useMemo, useRef } from 'react';
import MapExplorer from './MapExplorer';
import { apiGet } from '@/utils/Api';
import { CheckCircle2, List, Map as MapIcon, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Iloilo default coordinates
const DEFAULT_LAT = 10.7202;
const DEFAULT_LNG = 122.5621;

const ExplorerView = () => {
    const [viewMode, setViewMode] = useState('list');
    const [allSpaces, setAllSpaces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [maxRate, setMaxRate] = useState("");
    const [userLatLng, setUserLatLng] = useState(null);
    const [focusedSpace, setFocusedSpace] = useState(null);

    const lastDataFingerprint = useRef("");

    const parseCoord = (val) => {
        if (typeof val === 'number' && !isNaN(val)) return val;
        if (typeof val === 'string') {
            const parsed = parseFloat(val);
            return isNaN(parsed) ? null : parsed;
        }
        return null;
    };

    const fetchExplorerData = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const res = await apiGet('/landing/explorer');

            let spacesRaw = [];
            let districtsRaw = [];

            if (Array.isArray(res?.data)) {
                spacesRaw = res.data;
            } else if (Array.isArray(res?.data?.spaces)) {
                spacesRaw = res.data.spaces;
                districtsRaw = res.data.districts || [];
            } else if (Array.isArray(res?.spaces)) {
                spacesRaw = res.spaces;
                districtsRaw = res.districts || [];
            }

            if (districtsRaw.length === 0 && spacesRaw.length > 0) {
                const districtMap = new Map();
                spacesRaw.forEach(s => {
                    const d = s.district_id;
                    if (d && typeof d === 'object' && d._id && d.name) {
                        districtMap.set(d._id, { _id: d._id, name: d.name });
                    }
                });
                districtsRaw = Array.from(districtMap.values());
            }

            // Normalize spaces with fallback coordinates
            const normalizedSpaces = spacesRaw
                .map((space, index) => {
                    let lat = parseCoord(space.lat);
                    let lng = parseCoord(space.lng);
                    
                    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
                        console.warn(`⚠️ Space "${space.name}" missing coordinates, using fallback`);
                        lat = DEFAULT_LAT + (index * 0.001);
                        lng = DEFAULT_LNG + (index * 0.001);
                    }
                    
                    return {
                        ...space,
                        lat,
                        lng,
                        district_id: space.district_id ?? null,
                        location: typeof space.district_id === 'object'
                            ? space.district_id?.name
                            : space.area || 'Iloilo City',
                    };
                });

            const currentFingerprint = JSON.stringify({ normalizedSpaces, districtsRaw });
            if (currentFingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = currentFingerprint;
                setAllSpaces(normalizedSpaces);
                setDistricts(districtsRaw);
            }
        } catch (err) {
            console.error("Explorer fetch error:", err);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        fetchExplorerData(true);
        const interval = setInterval(() => fetchExplorerData(false), 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!navigator.geolocation) return;
        const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        const success = pos => setUserLatLng([pos.coords.latitude, pos.coords.longitude]);
        const error = err => console.warn(`GPS Error: ${err.message}`);
        const watchId = navigator.geolocation.watchPosition(success, error, options);
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const calculateDistance = (p1, p2) => {
        if (!p1 || !p2) return null;
        const [lat1, lng1] = p1;
        const [lat2, lng2] = p2;
        if ([lat1, lng1, lat2, lng2].some(isNaN)) return null;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const filteredSpaces = useMemo(() => {
        let result = allSpaces.filter(s => {
            if (!s.lat || !s.lng || isNaN(s.lat) || isNaN(s.lng)) {
                return false;
            }
            
            const districtId = typeof s.district_id === 'object'
                ? s.district_id?._id
                : s.district_id;

            const districtMatch = !selectedDistrict || districtId === selectedDistrict;
            const rateMatch = !maxRate || s.rate_hour <= parseInt(maxRate);
            return districtMatch && rateMatch;
        });

        if (userLatLng && result.length > 0) {
            result = result
                .map(s => ({
                    ...s,
                    distance: calculateDistance(userLatLng, [s.lat, s.lng])
                }))
                .filter(s => s.distance !== null)
                .sort((a, b) => a.distance - b.distance);
        }

        return result;
    }, [allSpaces, selectedDistrict, maxRate, userLatLng]);

    useEffect(() => {
        setFocusedSpace(null);
    }, [selectedDistrict, maxRate]);

   const handleSpaceClick = (space) => {
    if (space.lat && space.lng && !isNaN(space.lat) && !isNaN(space.lng)) {
        setFocusedSpace(space);
        if (window.innerWidth < 768) {
            setViewMode('map');
            // Allow the DOM to show the map container before flyTo fires
            // MapExplorer's focusedSpace effect will run after re-render
        }
    }
};

    if (loading) return (
        <div className="h-[75vh] w-full flex items-center justify-center bg-white rounded-[2.5rem]">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
    );

    return (
        <div className="relative flex flex-col md:flex-row h-[75vh] md:h-162.5 w-full bg-white overflow-hidden md:rounded-[2.5rem] border border-slate-100 shadow-sm">

            {/* SIDEBAR LIST */}
            <aside className={`${viewMode === 'map' ? 'hidden md:flex' : 'flex'} w-full md:w-85 lg:w-96 flex-col h-full z-40 bg-white md:border-r border-slate-100`}>
                <div className="hidden md:block p-6 border-b border-slate-50">
                    <div className="space-y-3">
                        <select
                            className="w-full p-3.5 rounded-2xl bg-slate-50 font-black text-xs outline-none border-none"
                            value={selectedDistrict}
                            onChange={e => setSelectedDistrict(e.target.value)}
                        >
                            <option value="">Everywhere in Iloilo</option>
                            {districts.map(d => (
                                <option key={d._id} value={d._id}>{d.name}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            placeholder="Max budget/hr"
                            className="w-full p-3.5 rounded-2xl bg-slate-50 font-black text-xs outline-none border-none"
                            value={maxRate}
                            onChange={e => setMaxRate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {filteredSpaces.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 font-black text-xs uppercase">No spaces found</div>
                    ) : (
                        filteredSpaces.map(s => (
                            <div
                                key={s._id}
                                className={`group flex gap-4 p-3 hover:bg-indigo-50/50 rounded-2xl transition-all cursor-pointer border ${
                                    focusedSpace?._id === s._id
                                        ? 'border-indigo-500 bg-indigo-50/50'
                                        : 'border-transparent hover:border-indigo-100'
                                }`}
                                onClick={() => handleSpaceClick(s)}
                            >
                                <div className="relative shrink-0">
                                    <img
                                        src={
                                            s.images?.length > 0
                                                ? `${API_BASE_URL}/uploads/spaces/${s.user_id}/${s.images[0]}`
                                                : s.image
                                                    ? `${API_BASE_URL}/uploads/spaces/${s.user_id}/${s.image}`
                                                    : '/placeholder.jpg'
                                        }
                                        className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover shadow-sm"
                                        alt={s.name}
                                        onError={e => { e.target.onerror = null; e.target.src = '/placeholder.jpg'; }}
                                    />
                                    {s.images?.length > 1 && (
                                        <div className="absolute -bottom-1 -right-1 px-1 py-0.5 bg-black/60 backdrop-blur-md text-white text-[8px] font-black rounded-md">
                                            +{s.images.length - 1}
                                        </div>
                                    )}
                                    <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded-md shadow-lg">
                                        ₱{s.rate_hour}
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center min-w-0 flex-1">
                                    <h3 className="font-black text-slate-900 text-xs md:text-sm truncate leading-tight">{s.name}</h3>
                                    {s.location && (
                                        <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5">{s.location}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <div className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase">
                                            <CheckCircle2 size={10} /> Verified
                                        </div>
                                        {s.distance != null && (
                                            <span className="text-[9px] font-black text-indigo-600">
                                                {s.distance.toFixed(1)}km away
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {/* MAP - Always visible on desktop, conditional on mobile */}
            <main className={`${viewMode === 'list' ? 'hidden md:block' : 'block'} flex-1 relative h-full w-full bg-slate-50 z-10`}>
                <MapExplorer
                    spaces={filteredSpaces}
                    userLatLng={userLatLng}
                    focusedSpace={focusedSpace}
                    onMarkerClick={(space) => handleSpaceClick(space)}
                />
            </main>

            {/* MOBILE TOGGLE BUTTON */}
            <button
                onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-1000 flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
            >
                {viewMode === 'list' ? <><MapIcon size={14} /> View Map</> : <><List size={14} /> View List</>}
            </button>
        </div>
    );
};

export default ExplorerView;