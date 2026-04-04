import React, { useState, useRef, useEffect, useCallback } from 'react';
import { apiGet } from '@/utils/Api';
import { Eye, Building2, MapPin, Users, Banknote, ShieldCheck, ShieldAlert, Globe, Clock, Layers } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import MapExplorer from '@/pages/Landing/MapExplorer'; // The component you provided
import { cn } from "@/lib/utils";

const SpaceManagement = () => {
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [openModal, setOpenModal] = useState(false);
    const [selectedSpace, setSelectedSpace] = useState(null);
    const [showMap, setShowMap] = useState(false);
    
    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });
    const paramsRef = useRef(currentParams);
    const lastDataFingerprint = useRef("");

    useEffect(() => { paramsRef.current = currentParams; }, [currentParams]);

    const fetchData = async (params = paramsRef.current, isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const { page, search } = params;
            const res = await apiGet(`/admin/space/management?page=${page}&search=${search}`);
            const rowData = res.data || []; 
            const fetchedStats = res.stats || { total: 0, active: 0, inactive: 0 };

            if (JSON.stringify({ rowData, fetchedStats }) !== lastDataFingerprint.current) {
                lastDataFingerprint.current = JSON.stringify({ rowData, fetchedStats });
                setSpaces(Array.isArray(rowData) ? rowData : []);
                setTotalCount(fetchedStats.total || 0);
                setStats(fetchedStats);
            }
        } catch (err) {
            if (isInitial) showToast({ icon: 'error', title: 'Failed to load hubs' });
        } finally { if (isInitial) setLoading(false); }
    };

    useEffect(() => {
        fetchData(paramsRef.current, true);
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') fetchData(paramsRef.current, false);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const columns = [
        {
            header: "Hub / Space",
            cell: (space) => (
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                        {space.image ? (
                            <img src={`${import.meta.env.VITE_API_URL}/uploads/spaces/${space.image}`} className="w-full h-full object-cover" />
                        ) : <Building2 className="text-indigo-500" size={18} />}
                    </div>
                    <div>
                        <p className="font-black text-white leading-none uppercase italic tracking-tighter">{space.name}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase flex items-center gap-1"><MapPin size={10} /> {space.area}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Host",
            cell: (space) => (
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-[10px] font-black text-indigo-400">
                        {space.user_id?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <p className="text-[11px] font-bold text-slate-200">{space.user_id?.name || 'Unknown'}</p>
                </div>
            )
        },
        {
            header: "Pricing",
            cell: (space) => (
                <span className="text-xs font-black text-white italic">₱{space.rate_hour}<span className="text-[9px] text-slate-500 not-italic">/hr</span></span>
            )
        },
        {
            header: "Status",
            cell: (space) => (
                <div className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-block",
                    space.status === "Open Now" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                )}>{space.status}</div>
            )
        },
        {
            header: "Actions",
            cell: (space) => (
                <div className="flex justify-end">
                    <button onClick={() => { setSelectedSpace(space); setOpenModal(true); setShowMap(false); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 transition-all">
                        <Eye size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Hub Management</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Global hub monitoring system</p>
            </div>

            {/* RESTORED STATISTICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4 shadow-xl">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20"><Building2 size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total Registered</p>
                        <p className="text-2xl font-black text-white italic">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4 shadow-xl">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20"><ShieldCheck size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Currently Active</p>
                        <p className="text-2xl font-black text-white italic">{stats.active}</p>
                    </div>
                </div>
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4 shadow-xl">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20"><ShieldAlert size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Inactive / Closed</p>
                        <p className="text-2xl font-black text-white italic">{stats.inactive}</p>
                    </div>
                </div>
            </div>

            <DataTable columns={columns} data={spaces} loading={loading} totalCount={totalCount} onParamsChange={(p) => fetchData(p)} />

            {/* VIEWER MODAL */}
            <Modal open={openModal} onClose={() => setOpenModal(false)} title="Hub Specifications" size="lg">
                {selectedSpace && (
                    <div className="space-y-4 py-2">
                        {/* Header Area */}
                        <div className="flex items-center justify-between p-5 bg-white/5 rounded-4xl border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10">
                                    <img src={`${import.meta.env.VITE_API_URL}/uploads/spaces/${selectedSpace.image}`} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white uppercase italic">{selectedSpace.name}</h2>
                                    <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{selectedSpace.area}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white italic">₱{selectedSpace.rate_hour}/hr</p>
                            </div>
                        </div>

                        {/* LEAFLET MAP TOGGLE */}
<div className="bg-[#0c0c0e] rounded-4xl border border-white/5 overflow-hidden">
    <button onClick={() => setShowMap(!showMap)} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all">
        <div className="flex items-center gap-3">
            <Globe size={16} className="text-indigo-500" />
            <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Interactive Location Map</span>
        </div>
        <span className="text-[10px] font-black text-indigo-500 uppercase">{showMap ? 'Close' : 'Open'}</span>
    </button>
    {showMap && (
    <div className="h-75 w-full animate-in slide-in-from-top-2 border-t border-white/5">
        <MapExplorer 
            // 1. Pass the hub in the spaces array to show the Blue Hub Marker
            spaces={[selectedSpace]} 
            
            // 2. Pass the coordinates here so the MapExplorer's 
            // useEffect(..., [userLatLng]) triggers the flyTo animation
            userLatLng={[selectedSpace.lat, selectedSpace.lng]} 
            
            // 3. To prevent the "You are here" text from showing, 
            // we have to ensure the MapExplorer knows this is a hub, not a user.
            // If your MapExplorer doesn't have a 'hideUserLabel' prop, 
            // see the small CSS fix below.
        />
    </div>
)}
</div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Seats</p>
                                <p className="text-sm font-black text-white">{selectedSpace.capacity}</p>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Rooms</p>
                                <p className="text-sm font-black text-white">{selectedSpace.available_rooms}</p>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Status</p>
                                <p className="text-sm font-black text-emerald-500 uppercase tracking-tighter">{selectedSpace.status}</p>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Rating</p>
                                <p className="text-sm font-black text-yellow-500">{selectedSpace.rating} / 5</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button onClick={() => setOpenModal(false)} className="text-[9px] font-black uppercase text-slate-500 hover:text-white transition-all">Dismiss View</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SpaceManagement;