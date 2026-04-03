import React, { useState, useEffect, useMemo } from 'react';
import MapExplorer from './MapExplorer';
import { Navigation, CheckCircle2, Layers, Search, MapPin } from 'lucide-react';

const ExplorerView = () => {
    // 1. DATA STATE
    const [allSpaces] = useState([
        { id: 1, name: "Nexus Hub Mandurriao", district_id: "1", lat: 10.7202, lng: 122.5621, rate: 50, img: "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=400&h=400&fit=crop" },
        { id: 2, name: "Bonds Cowork Jaro", district_id: "2", lat: 10.7150, lng: 122.5550, rate: 45, img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop" },
        { id: 3, name: "The Hive Molo", district_id: "3", lat: 10.7000, lng: 122.5400, rate: 60, img: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=400&fit=crop" },
    ]);

    const [districts] = useState([
        { id: "1", name: "Mandurriao" }, { id: "2", name: "Jaro" }, { id: "3", name: "Molo" }
    ]);

    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [maxRate, setMaxRate] = useState("");
    const [userLatLng, setUserLatLng] = useState(null);

    // 2. GEOLOCATION
    useEffect(() => {
        const watchId = navigator.geolocation.watchPosition(
            pos => setUserLatLng([pos.coords.latitude, pos.coords.longitude]),
            err => console.log("Geolocation blocked"),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // 3. DISTANCE LOGIC
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
            (!selectedDistrict || s.district_id === selectedDistrict) &&
            (!maxRate || s.rate <= parseInt(maxRate))
        );
        if (userLatLng) {
            result = result.map(s => ({
                ...s,
                distance: calculateDistance(userLatLng, [s.lat, s.lng])
            })).sort((a, b) => a.distance - b.distance);
        }
        return result;
    }, [allSpaces, selectedDistrict, maxRate, userLatLng]);

    return (
        <div className="flex flex-col md:flex-row h-175 w-full bg-white overflow-hidden">
            {/* LEFT SIDEBAR: GLASS DESIGN */}
            <aside className="w-full md:w-95 flex flex-col h-full z-20 bg-white border-r border-slate-100 shadow-2xl">
                <div className="p-8 pb-6 border-b border-slate-50">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Explorer</span>
                        <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Live GPS</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                <MapPin size={16} strokeWidth={3} />
                            </div>
                            <select 
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm font-black bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none transition-all appearance-none"
                                value={selectedDistrict} 
                                onChange={(e) => setSelectedDistrict(e.target.value)}
                            >
                                <option value="">Everywhere in Iloilo</option>
                                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                <span className="text-sm font-black italic">₱</span>
                            </div>
                            <input 
                                type="number" 
                                placeholder="Maximum budget per hour" 
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm font-black bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none transition-all" 
                                value={maxRate} 
                                onChange={(e) => setMaxRate(e.target.value)} 
                            />
                        </div>
                    </div>
                </div>

                {/* SCROLLABLE LIST */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20 custom-scrollbar">
                    {filteredSpaces.length > 0 ? (
                        filteredSpaces.map(s => (
                            <div key={s.id} className="group relative bg-white p-4 rounded-4xl flex gap-4 border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300 cursor-pointer">
                                <div className="relative shrink-0">
                                    <img src={s.img} className="w-20 h-20 rounded-3xl object-cover shadow-sm group-hover:scale-105 transition-transform duration-500" alt={s.name} />
                                    <div className="absolute -top-2 -right-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-black rounded-lg shadow-lg">
                                        ₱{s.rate}
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h3 className="font-black text-slate-900 text-sm mb-1 leading-tight">{s.name}</h3>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-black text-slate-500 uppercase">
                                            <CheckCircle2 size={10} className="text-emerald-500" /> Verified
                                        </span>
                                        {s.distance && (
                                            <span className="text-[10px] font-black text-indigo-600">
                                                {s.distance.toFixed(1)} km away
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center">
                            <p className="text-sm font-black text-slate-400 italic">No spaces found in this price range.</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* MAIN MAP AREA */}
            <main className="flex-1 relative bg-slate-100">
                <MapExplorer 
                    spaces={filteredSpaces} 
                    userLatLng={userLatLng} 
                    onMarkerClick={(s) => console.log('Selected:', s.name)} 
                />
            </main>
        </div>
    );
};

export default ExplorerView;