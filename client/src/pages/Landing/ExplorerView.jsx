import React, { useState, useEffect, useMemo, useRef } from 'react';
import MapExplorer from './MapExplorer';
import { apiGet } from '@/utils/Api';
import { CheckCircle2, MapPin, List, Map as MapIcon, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ExplorerView = () => {
    const [viewMode, setViewMode] = useState('list'); 
    const [allSpaces, setAllSpaces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [maxRate, setMaxRate] = useState("");
    const [userLatLng, setUserLatLng] = useState(null);

    const lastDataFingerprint = useRef("");

    const fetchExplorerData = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const res = await apiGet('/landing/explorer');
            const spacesData = res.spaces || res.data?.spaces || [];
            const districtsData = res.districts || res.data?.districts || [];

            const currentFingerprint = JSON.stringify({ spacesData, districtsData });

            if (currentFingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = currentFingerprint;
                setAllSpaces(Array.isArray(spacesData) ? spacesData : []);
                setDistricts(Array.isArray(districtsData) ? districtsData : []);
                console.log("Real-time Update: New data synced.");
            }
        } catch (err) {
            console.error("Sync Error:", err);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        fetchExplorerData(true);

        const interval = setInterval(() => {
            fetchExplorerData(false);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!navigator.geolocation) return;

        const options = {
            enableHighAccuracy: true, 
            timeout: 10000,           
            maximumAge: 0             
        };

        const success = (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
                setUserLatLng([lat, lng]);
            }
        };

        const error = (err) => console.warn(`GPS Error: ${err.message}`);

        const watchId = navigator.geolocation.watchPosition(success, error, options);
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const calculateDistance = (p1, p2) => {
        const R = 6371; 
        const dLat = (p2[0] - p1[0]) * Math.PI / 180;
        const dLon = (p2[1] - p1[1]) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const filteredSpaces = useMemo(() => {
        let result = allSpaces.filter(s => 
            (!selectedDistrict || s.district_id?._id === selectedDistrict || s.district_id === selectedDistrict) &&
            (!maxRate || s.rate_hour <= parseInt(maxRate))
        );
        
        if (userLatLng) {
            result = result.map(s => ({
                ...s,
                distance: calculateDistance(userLatLng, [s.lat, s.lng])
            })).sort((a, b) => a.distance - b.distance);
        }
        return result;
    }, [allSpaces, selectedDistrict, maxRate, userLatLng]);

    if (loading) return (
        <div className="h-[75vh] w-full flex items-center justify-center bg-white rounded-[2.5rem]">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
    );

    return (
        <div className="relative flex flex-col md:flex-row h-[75vh] md:h-162.5 w-full bg-white overflow-hidden md:rounded-[2.5rem] border border-slate-100 shadow-sm">
            
            {/* MOBILE FILTER BAR */}
            <div className="md:hidden flex items-center gap-2 p-3 bg-white border-b border-slate-100 z-50">
                <div className="flex-1 relative">
                    <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select 
                        className="w-full pl-8 pr-2 py-2 rounded-xl text-[10px] font-black bg-slate-100 outline-none appearance-none"
                        value={selectedDistrict} 
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                    >
                        <option value="">All Iloilo</option>
                        {districts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                </div>
                <div className="w-24 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 italic">₱</span>
                    <input 
                        type="number" 
                        placeholder="Max" 
                        className="w-full pl-7 pr-2 py-2 rounded-xl text-[10px] font-black bg-slate-100 outline-none" 
                        value={maxRate} 
                        onChange={(e) => setMaxRate(e.target.value)} 
                    />
                </div>
            </div>

            {/* SIDEBAR LIST */}
            <aside className={`${viewMode === 'map' ? 'hidden md:flex' : 'flex'} w-full md:w-85 lg:w-96 flex-col h-full z-40 bg-white md:border-r border-slate-100`}>
                <div className="hidden md:block p-6 border-b border-slate-50">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Explorer</span>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[8px] font-black text-emerald-600 uppercase">Live</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <select className="w-full p-3.5 rounded-2xl bg-slate-50 font-black text-xs outline-none border-none" value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}>
                            <option value="">Everywhere in Iloilo</option>
                            {districts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                        <input type="number" placeholder="Max budget/hr" className="w-full p-3.5 rounded-2xl bg-slate-50 font-black text-xs outline-none border-none" value={maxRate} onChange={(e) => setMaxRate(e.target.value)} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {filteredSpaces.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 font-black text-xs uppercase">No spaces found</div>
                    ) : (
                        filteredSpaces.map(s => (
                            <div key={s._id} className="group flex gap-4 p-3 hover:bg-indigo-50/50 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-indigo-100">
                                <div className="relative shrink-0">
                                    <img 
                                        src={s.image ? `${API_BASE_URL}/uploads/spaces/${s.image}` : '/placeholder.jpg'} 
                                        className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover shadow-sm" 
                                        alt={s.name} 
                                    />
                                    <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded-md shadow-lg">₱{s.rate_hour}</div>
                                </div>
                                <div className="flex flex-col justify-center min-w-0">
                                    <h3 className="font-black text-slate-900 text-xs md:text-sm truncate leading-tight">{s.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase"><CheckCircle2 size={10} /> Verified</div>
                                        {s.distance && <span className="text-[9px] font-black text-indigo-600">{s.distance.toFixed(1)}km away</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {/* THE MAP */}
            <main className={`${viewMode === 'list' ? 'hidden md:block' : 'block'} flex-1 relative h-full w-full bg-slate-50 z-10`}>
                <div className="absolute inset-0">
                    <MapExplorer 
                        spaces={filteredSpaces} 
                        userLatLng={userLatLng} 
                        onMarkerClick={(s) => console.log('Selected:', s.name)} 
                    />
                </div>
            </main>

            {/* MOBILE TOGGLE */}
            <button 
                onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-100 flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
            >
                {viewMode === 'list' ? <><MapIcon size={14} /> View Map</> : <><List size={14} /> View List</>}
            </button>
        </div>
    );
};

export default ExplorerView;