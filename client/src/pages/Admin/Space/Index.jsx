import React, { useState, useRef, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiDelete, apiPut } from '@/utils/Api';
import { FileText, BadgeCheck, Trash2, Edit3, Building2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import Swal from 'sweetalert2';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from "@/lib/utils";

// Global reference to prevent zombie intervals during hot-reloads
let globalSpacePollingInstance = null;

const SpaceManagement = () => {
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [openModal, setOpenModal] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState(null);
    
    // Manage params via state and a Ref for the background interval
    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });
    const paramsRef = useRef(currentParams);
    const lastDataFingerprint = useRef("");

    // Sync Ref whenever state changes
    useEffect(() => {
        paramsRef.current = currentParams;
    }, [currentParams]);

    /**
     * Core fetch logic. 
     * Note: We no longer call setCurrentParams inside here to avoid loops.
     */
    const fetchData = async (params = paramsRef.current, isInitial = false) => {
        if (isInitial) setLoading(true);

        try {
            const { page, search } = params;
            const res = await apiGet(`/admin/space/management?page=${page}&search=${search}`);
            
            const rowData = res.owners || res.data?.owners || [];
            const total = res.total || res.data?.total || 0;
            const fetchedStats = res.stats || res.data?.stats || { total: 0, active: 0, inactive: 0 };

            const currentFingerprint = JSON.stringify({ rowData, total, fetchedStats });

            // Only update state if data has actually changed
            if (currentFingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = currentFingerprint;
                setOwners(Array.isArray(rowData) ? rowData : []);
                setTotalCount(total);
                setStats(fetchedStats);
            }
        } catch (err) {
            if (isInitial) {
                showToast({ icon: 'error', title: 'Failed to load spaces' });
            }
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    /**
     * Wrapped in useCallback so the DataTable doesn't re-trigger its useEffect
     */
    const handleParamsChange = useCallback((params) => {
        setCurrentParams(params);
        fetchData(params);
    }, []);

    /**
     * Managed Heartbeat: Runs once on mount
     */
    useEffect(() => {
        if (globalSpacePollingInstance) clearInterval(globalSpacePollingInstance);

        // Initial Load
        fetchData(paramsRef.current, true);

        // Background Sync every 5 seconds (standardized)
        globalSpacePollingInstance = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchData(paramsRef.current, false);
            }
        }, 5000);

        return () => {
            if (globalSpacePollingInstance) {
                clearInterval(globalSpacePollingInstance);
                globalSpacePollingInstance = null;
            }
        };
    }, []);

    const toggleStatus = async (id) => {
        try {
            await apiPost(`/admin/space/management/${id}/toggle`);
            showToast({ icon: 'success', title: 'Status updated' });
            fetchData();
        } catch (err) { showToast({ icon: 'error', title: 'Update failed' }); }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "Space owner will be permanently removed.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#1f2937',
            confirmButtonText: 'Yes, delete it!',
            background: '#111114',
            color: '#fff'
        });
        if (result.isConfirmed) {
            try {
                await apiDelete(`/admin/space/management/${id}`);
                showToast({ icon: 'success', title: 'Account deleted' });
                fetchData();
            } catch (err) { showToast({ icon: 'error', title: 'Delete failed' }); }
        }
    };

    const handleSave = async () => {
        if (!selectedOwner?._id) return;
        try {
            await apiPut(`/admin/space/management/${selectedOwner._id}`, { 
                name: selectedOwner.name, 
                email: selectedOwner.email 
            });
            showToast({ icon: 'success', title: 'Profile Updated' });
            setOpenModal(false);
            fetchData();
        } catch (err) { showToast({ icon: 'error', title: 'Update failed' }); }
    };

    const columns = [
        {
            header: "Owner Details",
            cell: (owner) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-xs italic shrink-0 shadow-lg shadow-indigo-900/20">
                        {owner.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-white leading-none">{owner.name}</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">{owner.email}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Verified Files",
            cell: (owner) => (
                <div className="flex justify-center gap-2">
                    {owner.business_permit && (
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                            <FileText size={14} />
                        </div>
                    )}
                    {owner.dti_sec_reg && (
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                            <BadgeCheck size={14} />
                        </div>
                    )}
                </div>
            )
        },
        {
            header: "Status",
            cell: (owner) => (
                <button 
                    onClick={() => toggleStatus(owner._id)} 
                    className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                        owner.isActive 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-slate-500/10 text-slate-500 border border-white/5'
                    )}
                >
                    {owner.isActive ? 'Active' : 'Inactive'}
                </button>
            )
        },
        {
            header: "Actions",
            cell: (owner) => (
                <div className="flex justify-end gap-2">
                    <button onClick={() => { setSelectedOwner(owner); setOpenModal(true); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white hover:text-black transition-all">
                        <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(owner._id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                        <Trash2 size={14} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Space Management</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Manage active space owners and their status.</p>
            </div>

            {/* STATISTICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4 shadow-xl">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20"><Building2 size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total Spaces</p>
                        <p className="text-2xl font-black text-white italic">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4 shadow-xl">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20"><ShieldCheck size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Verified & Active</p>
                        <p className="text-2xl font-black text-white italic">{stats.active}</p>
                    </div>
                </div>
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4 shadow-xl">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20"><ShieldAlert size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Inactive / Restricted</p>
                        <p className="text-2xl font-black text-white italic">{stats.inactive}</p>
                    </div>
                </div>
            </div>

            <DataTable 
                columns={columns} 
                data={owners} 
                loading={loading} 
                totalCount={totalCount} 
                onParamsChange={handleParamsChange} 
                renderMobileCard={(owner) => (
                    <div key={owner._id} className="bg-[#111114] border border-white/5 p-5 rounded-[2.5rem] space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white italic">
                                    {owner.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white leading-tight">{owner.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-500">{owner.email}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => toggleStatus(owner._id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                    owner.isActive ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-500"
                                )}
                            >
                                {owner.isActive ? 'Active' : 'Off'}
                            </button>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex gap-2">
                                {owner.business_permit && <FileText size={16} className="text-emerald-500" />}
                                {owner.dti_sec_reg && <BadgeCheck size={16} className="text-blue-500" />}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setSelectedOwner(owner); setOpenModal(true); }} className="p-3 bg-white/5 rounded-xl text-slate-400 active:scale-95 transition-all"><Edit3 size={16} /></button>
                                <button onClick={() => handleDelete(owner._id)} className="p-3 bg-rose-500/10 rounded-xl text-rose-500 active:scale-95 transition-all"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                )}
            />

            <Modal open={openModal} onClose={() => setOpenModal(false)} title="Edit Space Owner" size="md">
                {selectedOwner && (
                    <div className="space-y-5 py-2">
                        <input type="text" value={selectedOwner.name || ''} onChange={e => setSelectedOwner({...selectedOwner, name: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none font-bold" />
                        <input type="email" value={selectedOwner.email || ''} onChange={e => setSelectedOwner({...selectedOwner, email: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none font-bold" />
                        <div className="flex justify-end gap-3 pt-6"><button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg shadow-indigo-900/40 hover:bg-indigo-500 transition-all">Save Changes</button></div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SpaceManagement;