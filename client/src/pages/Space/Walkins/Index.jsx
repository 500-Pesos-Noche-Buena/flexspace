import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { UserPlus, Search, Loader2, LogIn, Clock, User, Hash } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/SweetAlert2';
import { cn } from "@/lib/utils";

const WalkinsIndex = () => {
    const [walkins, setWalkins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [spaces, setSpaces] = useState([]); // For the selection dropdown
    
    // Form State
    const [formData, setFormData] = useState({ space_id: '', name: '', email: '', duration: 1 });

    const paramsRef = useRef({ page: 1, search: '' });

    const fetchData = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const res = await apiGet(`/space/walkins?search=${paramsRef.current.search}`);
            setWalkins(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const fetchSpaces = async () => {
        const res = await apiGet('/space/spaces');
        setSpaces(res.data || []);
    };

    useEffect(() => {
        fetchData(true);
        fetchSpaces();
        const interval = setInterval(() => fetchData(false), 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCheckIn = async (e) => {
        e.preventDefault();
        try {
            await apiPost('/space/walkins/store', formData);
            showToast({ icon: 'success', title: 'Walk-in Checked In' });
            setOpenModal(false);
            setFormData({ space_id: '', name: '', email: '', duration: 1 });
            fetchData();
        } catch (err) {
            showToast({ icon: 'error', title: 'Check-in failed' });
        }
    };

    const columns = [
        {
            header: "Customer",
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black border border-emerald-500/20">
                        {row.user_details?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-white font-bold leading-none">{row.user_details?.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-widest">{row.space_id?.name}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Entry Info",
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-[10px] text-indigo-400 font-black tracking-tighter uppercase">{row.booking_reference}</span>
                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
                        <Clock size={10} /> {new Date(row.start_time).toLocaleTimeString()}
                    </span>
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Walk-ins</h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Manual entry for on-site customers.</p>
                </div>
                <button 
                    onClick={() => setOpenModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
                >
                    <UserPlus size={14} /> New Check-in
                </button>
            </div>

            <DataTable 
                columns={columns} 
                data={walkins} 
                loading={loading} 
                totalCount={walkins.length}
                onParamsChange={(p) => { paramsRef.current = p; fetchData(); }}
                renderMobileCard={(row) => (
                    <div key={row._id} className="bg-[#111114] border border-white/5 p-5 rounded-[2.5rem] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                                {row.user_details?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white">{row.user_details?.name}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">{row.space_id?.name}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-indigo-500 italic">{row.booking_reference}</p>
                            <p className="text-[9px] text-slate-600 font-bold mt-1 uppercase">{new Date(row.start_time).toLocaleTimeString()}</p>
                        </div>
                    </div>
                )}
            />

            <Modal open={openModal} onClose={() => setOpenModal(false)} title="Manual Check-in" size="md">
                <form onSubmit={handleCheckIn} className="space-y-5 py-2">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Target Space</label>
                        <select 
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                            value={formData.space_id}
                            onChange={(e) => setFormData({...formData, space_id: e.target.value})}
                        >
                            <option value="" className="bg-[#111114]">Select a Space</option>
                            {spaces.map(s => <option key={s._id} value={s._id} className="bg-[#111114]">{s.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Customer Name</label>
                            <input 
                                type="text" required placeholder="Juan Dela Cruz"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Hours to Stay</label>
                            <input 
                                type="number" required min="1"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                                value={formData.duration}
                                onChange={(e) => setFormData({...formData, duration: e.target.value})}
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-3xl font-black uppercase text-[10px] hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40">
                        Check-in Now
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default WalkinsIndex;