import React, { useState, useRef, useEffect } from 'react';
import { apiGet } from '@/utils/Api';
import { Eye, Building2, MapPin, ShieldCheck, ShieldAlert, Globe, Edit3, Trash2 } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from "@/lib/utils";
import { getSpaceImage } from '@/utils/imageHelper';
import { formatNumber } from '@/utils/formatNumber';
import { SpaceDetailsModal } from '@/components/modal';
import { useTheme } from '@/hooks/useTheme';

const SpaceManagement = () => {
    const { themeColor } = useTheme();
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [openModal, setOpenModal] = useState(false);
    const [selectedSpace, setSelectedSpace] = useState(null);

    const [currentParams] = useState({ page: 1, search: '' });
    const paramsRef = useRef(currentParams);
    const lastDataFingerprint = useRef("");

    const getThemeColorClass = () => {
        const colors = {
            indigo: 'indigo',
            emerald: 'emerald',
            purple: 'purple',
            blue: 'blue',
            rose: 'rose',
            amber: 'amber',
        };
        return colors[themeColor] || 'indigo';
    };

    // FETCH DATA
    const fetchData = async (params = paramsRef.current, isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const { page, search } = params;
            const res = await apiGet(`/admin/space/management?page=${page}&search=${search}`);
            const rowData = res.data || [];
            const fetchedStats = res.stats || { total: 0, active: 0, inactive: 0 };

            const fingerprint = JSON.stringify({ rowData, fetchedStats });
            if (fingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = fingerprint;
                setSpaces(Array.isArray(rowData) ? rowData : []);
                setTotalCount(fetchedStats.total || 0);
                setStats(fetchedStats);
            }
        } catch {
            if (isInitial) showToast({ icon: 'error', title: 'Failed to load hubs' });
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    // Real-time Heartbeat
    useEffect(() => {
        fetchData(paramsRef.current, true);
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchData(paramsRef.current, false);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const color = getThemeColorClass();

    const columns = [
        {
            header: "Hub / Space",
            cell: (space) => (
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-border flex items-center justify-center overflow-hidden shrink-0">
                        {space.image ? (
                            <img 
                                src={getSpaceImage(space)} 
                                className="w-full h-full object-cover" 
                                alt={space.name}
                                onError={(e) => e.target.src = '/placeholders/space.jpg'}
                            />
                        ) : <Building2 className="text-primary" size={18} />}
                    </div>
                    <div>
                        <p className="font-black text-foreground leading-none uppercase italic tracking-tighter">{space.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase flex items-center gap-1"><MapPin size={10} /> {space.area}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Host",
            cell: (space) => (
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-black text-primary">
                        {space.user_id?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <p className="text-[11px] font-bold text-foreground">{space.user_id?.name || 'Unknown'}</p>
                </div>
            )
        },
        {
            header: "Pricing",
            cell: (space) => (
                <span className="text-xs font-black text-foreground italic">₱{formatNumber(space.rate_hour)}<span className="text-[9px] text-muted-foreground not-italic">/hr</span></span>
            )
        },
        {
            header: "Status",
            cell: (space) => (
                <div className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-block",
                    space.status === "Open Now" ? `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20` : `bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20`
                )}>{space.status}</div>
            )
        },
        {
            header: "Actions",
            cell: (space) => (
                <div className="flex justify-end">
                    <button onClick={() => { setSelectedSpace(space); setOpenModal(true); }} className={`w-10 h-10 flex items-center justify-center rounded-xl bg-${color}-600 text-white shadow-lg hover:bg-${color}-500 transition-all`}>
                        <Eye size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-foreground tracking-tight uppercase italic">Hub Management</h1>
                <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest">Global hub monitoring system</p>
            </div>

            {/* STATISTICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-card border-border p-6 rounded-[2.5rem] flex items-center gap-4 shadow-xl hover:border-primary/20 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Building2 size={20} className="text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Registered</p>
                        <p className="text-2xl font-black text-foreground italic">{formatNumber(stats.total)}</p>
                    </div>
                </div>
                <div className="bg-card border-border p-6 rounded-[2.5rem] flex items-center gap-4 shadow-xl hover:border-primary/20 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Currently Active</p>
                        <p className="text-2xl font-black text-foreground italic">{formatNumber(stats.active)}</p>
                    </div>
                </div>
                <div className="bg-card border-border p-6 rounded-[2.5rem] flex items-center gap-4 shadow-xl hover:border-primary/20 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                        <ShieldAlert size={20} className="text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Inactive / Closed</p>
                        <p className="text-2xl font-black text-foreground italic">{formatNumber(stats.inactive)}</p>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={spaces}
                loading={loading}
                totalCount={totalCount}
                onParamsChange={(p) => fetchData(p)}
                renderMobileCard={(space) => (
                    <div key={space._id} className="bg-card border-border p-5 rounded-[2.5rem] space-y-4 shadow-2xl">
                        <div className="flex items-center gap-4">
                            <div className="relative shrink-0 w-16 h-16 rounded-2xl overflow-hidden border border-border">
                                <img
                                    src={getSpaceImage(space)}
                                    className="w-full h-full object-cover"
                                    alt={space.name}
                                    onError={(e) => { e.target.src = '/placeholders/space.jpg'; }}
                                />
                                <div className={`absolute top-0 right-0 bg-${color}-600 px-1.5 py-0.5 rounded-bl-lg text-[7px] font-black text-white`}>
                                    ₱{formatNumber(space.rate_hour)}
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-black text-foreground leading-tight uppercase italic truncate tracking-tighter">
                                    {space.name}
                                </h3>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 truncate">
                                    {space.district_id?.name || 'Unknown District'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-md ${space.status === 'Open Now' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                        {space.status}
                                    </span>
                                    <span className="text-[7px] font-black text-muted-foreground uppercase">
                                        Seats: {formatNumber(space.capacity)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="h-px w-full bg-border" />

                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Ownership</p>
                                <p className="text-[9px] font-bold text-foreground uppercase">{space.user_id?.name || 'N/A'}</p>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => { setSelectedSpace(space); setOpenModal(true); }} className={`w-10 h-10 flex items-center justify-center rounded-xl bg-${color}-600 text-white shadow-lg hover:bg-${color}-500 transition-all`}>
                                    <Eye size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            />

            {/* Space Details Modal */}
            <SpaceDetailsModal
                isOpen={openModal}
                onClose={() => setOpenModal(false)}
                space={selectedSpace}
            />
        </div>
    );
};

export default SpaceManagement;