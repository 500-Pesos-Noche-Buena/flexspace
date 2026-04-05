import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { 
    Clock, CheckCircle2, User, ReceiptText 
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from "@/lib/utils";

const BookingsIndex = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0 });
    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });

    const paramsRef = useRef(currentParams);
    const lastDataFingerprint = useRef("");

    // Sync Ref to ensure the interval always uses the latest page/search
    useEffect(() => {
        paramsRef.current = currentParams;
    }, [currentParams]);

    const fetchData = useCallback(async (params = paramsRef.current, isSilent = false) => {
        try {
            const { page, search } = params;
            const res = await apiGet(`/space/bookings?page=${page}&search=${search}`);
            
            const rowData = res.data?.bookings || [];
            const total = res.data?.total || 0;
            const fetchedStats = res.data?.stats || { total: 0, pending: 0, confirmed: 0 };

            // Only update state if data actually changed (prevents unnecessary re-renders)
            const currentFingerprint = JSON.stringify({ rowData, total, fetchedStats });

            if (currentFingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = currentFingerprint;
                setBookings(rowData);
                setTotalCount(total);
                setStats(fetchedStats);
            }
        } catch {
            // Removed 'err' to satisfy linter
            if (!isSilent) showToast({ icon: 'error', title: 'Failed to sync bookings' });
        }
    }, []);

    // 🛡️ ANTI-LOOP: Memoized param handler
    const handleParamsChange = useCallback((params) => {
        setCurrentParams(params);
        setLoading(true);
        fetchData(params).finally(() => setLoading(false));
    }, [fetchData]);

    // Real-time Heartbeat (3 seconds)
    useEffect(() => {
        let isMounted = true;

        // Initial Load
        const loadInitial = async () => {
            setLoading(true);
            await fetchData(paramsRef.current, false);
            if (isMounted) setLoading(false);
        };
        
        loadInitial();

        // 3-second Polling
        const interval = setInterval(() => {
            if (isMounted && document.visibilityState === 'visible') {
                fetchData(paramsRef.current, true);
            }
        }, 3000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchData]);

    const updateBookingStatus = async (id, action) => {
        try {
            await apiPost(`/space/bookings/${id}/${action}`);
            showToast({ icon: 'success', title: `Booking ${action}ed` });
            fetchData(paramsRef.current, false);
        } catch {
            // Removed 'err' to satisfy linter
            showToast({ icon: 'error', title: 'Action failed' });
        }
    };

    const columns = [
        {
            header: "Booking Reference",
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-white font-black italic uppercase tracking-tighter">
                        #{row.booking_reference || 'REF-N/A'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
                        <Clock size={10} /> {new Date(row.created_at).toLocaleDateString()}
                    </span>
                </div>
            )
        },
        {
            header: "Space & User",
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                        <User size={16} />
                    </div>
                    <div>
                        <p className="text-white font-bold leading-none">{row.user_details?.name || 'Guest'}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-widest">{row.space_id?.name}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Status",
            cell: (row) => (
                <div className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase inline-flex items-center gap-1.5",
                    row.status === 'confirmed' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                )}>
                    <div className={cn("w-1 h-1 rounded-full", row.status === 'confirmed' ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
                    {row.status}
                </div>
            )
        },
        {
            header: "Action",
            cell: (row) => (
                row.status === 'pending' && (
                    <button 
                        onClick={() => updateBookingStatus(row._id, 'confirm')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/20"
                    >
                        Confirm
                    </button>
                )
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Live Bookings</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Real-time occupancy management.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20"><ReceiptText size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Bookings</p>
                        <p className="text-2xl font-black text-white italic">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20"><Clock size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pending</p>
                        <p className="text-2xl font-black text-white italic">{stats.pending}</p>
                    </div>
                </div>
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20"><CheckCircle2 size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Confirmed</p>
                        <p className="text-2xl font-black text-white italic">{stats.confirmed}</p>
                    </div>
                </div>
            </div>

            <DataTable 
                columns={columns} 
                data={bookings} 
                loading={loading} 
                totalCount={totalCount}
                onParamsChange={handleParamsChange}
                renderMobileCard={(row) => (
                    <div key={row._id} className="bg-[#111114] border border-white/5 p-5 rounded-[2.5rem] space-y-4 shadow-xl">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-500">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white leading-tight">{row.user_details?.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{row.space_id?.name}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black italic text-indigo-500">#{row.booking_reference}</span>
                        </div>
                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className={cn(
                                "text-[10px] font-black uppercase px-3 py-1 rounded-lg",
                                row.status === 'confirmed' ? "text-emerald-500 bg-emerald-500/5" : "text-amber-500 bg-amber-500/5"
                            )}>
                                {row.status}
                            </div>
                            {row.status === 'pending' && (
                                <button onClick={() => updateBookingStatus(row._id, 'confirm')} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">Confirm</button>
                            )}
                        </div>
                    </div>
                )}
            />
        </div>
    );
};

export default BookingsIndex;