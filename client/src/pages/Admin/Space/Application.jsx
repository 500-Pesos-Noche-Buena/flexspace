import React, { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { FileSearch, ShieldCheck, Clock, XCircle, Eye, Inbox, Ban } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from "@/lib/utils";
import { useRealTimeSync } from '@/hooks/useRealTimeSync';

const SpaceApplications = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ pending: 0, rejected: 0 }); // Stats state
    const [selectedReq, setSelectedReq] = useState(null);
    const [openModal, setOpenModal] = useState(false);

    const [statusFilter, setStatusFilter] = useState('pending');
    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });

    const lastDataFingerprint = useRef("");

    const fetchData = async (params = currentParams, status = statusFilter, isInitial = false) => {
        if (isInitial) setLoading(true);

        try {
            const { page, search } = params;
            const res = await apiGet(`/admin/space/requests?page=${page}&search=${search}&status=${status}`);

            const rowData = res.requests || res.data?.requests || [];
            const total = res.total || res.data?.total || 0;
            const fetchedStats = res.stats || res.data?.stats || { pending: 0, rejected: 0 };

            const currentFingerprint = JSON.stringify({ rowData, total, fetchedStats, status });

            if (currentFingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = currentFingerprint;
                
                setRequests(Array.isArray(rowData) ? rowData : []);
                setTotalCount(total);
                setStats(fetchedStats);
                
                if (!isInitial) {
                    console.log(`📩 New ${status} requests synced in real-time.`);
                }
            }
            
            setCurrentParams(params);
        } catch (err) {
            if (isInitial) {
                showToast({ icon: 'error', title: 'Failed to sync space requests' });
            }
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentParams, statusFilter, true);

        const interval = setInterval(() => {
            fetchData(currentParams, statusFilter, false);
        }, 3000);

        return () => clearInterval(interval);
    }, [currentParams.page, currentParams.search, statusFilter]);

    const handleParamsChange = (params) => {
        fetchData(params, statusFilter);
    };

    const handleFilterChange = (newStatus) => {
        setStatusFilter(newStatus);
        fetchData({ ...currentParams, page: 1 }, newStatus);
    };

    const handleDecision = async (id, action) => {
        try {
            await apiPost(`/admin/space/requests/${id}/${action}`);
            showToast({ icon: 'success', title: `Application ${action}ed` });
            setOpenModal(false);
            fetchData();
        } catch (err) {
            showToast({ icon: 'error', title: 'Action failed' });
        }
    };

    const columns = [
        {
            header: "Applicant Details",
            cell: (req) => (
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs italic border shadow-sm",
                        statusFilter === 'pending' 
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    )}>
                        {req.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-white leading-none">{req.name}</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">{req.email}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Status",
            cell: (req) => (
                <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", statusFilter === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500')}></div>
                    <span className={cn("text-[10px] font-black uppercase tracking-tighter", statusFilter === 'pending' ? 'text-amber-500' : 'text-rose-500')}>
                        {statusFilter === 'pending' ? 'Waiting for Approval' : 'Rejected'}
                    </span>
                </div>
            )
        },
        {
            header: "Actions",
            cell: (req) => (
                <div className="flex justify-end">
                    <button
                        onClick={() => { setSelectedReq(req); setOpenModal(true); }}
                        className="px-5 py-2 bg-white/5 text-slate-300 rounded-xl text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all border border-white/5 shadow-lg active:scale-95"
                    >
                        {statusFilter === 'pending' ? 'Review Docs' : 'View Details'}
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Space Applications</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Verify and audit new space owner registrations.</p>
            </div>

            {/* --- STATS GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-5 shadow-2xl relative overflow-hidden group">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner group-hover:bg-amber-500 group-hover:text-black transition-all duration-500">
                        <Inbox size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pending Review</p>
                        <p className="text-3xl font-black text-white italic">{stats.pending}</p>
                    </div>
                    <div className="absolute top-[-20%] right-[-10%] opacity-5 group-hover:opacity-10 transition-opacity">
                        <Inbox size={120} className="text-white" />
                    </div>
                </div>

                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-5 shadow-2xl relative overflow-hidden group">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-inner group-hover:bg-rose-500 group-hover:text-black transition-all duration-500">
                        <Ban size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rejected Apps</p>
                        <p className="text-3xl font-black text-white italic">{stats.rejected}</p>
                    </div>
                    <div className="absolute top-[-20%] right-[-10%] opacity-5 group-hover:opacity-10 transition-opacity">
                        <Ban size={120} className="text-white" />
                    </div>
                </div>
            </div>

            {/* Navigation & Controls */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-2 bg-[#111114] p-1.5 rounded-4xl w-full md:w-fit border border-white/5 shadow-xl">
                    <button
                        onClick={() => handleFilterChange('pending')}
                        className={cn(
                            "flex-1 md:flex-none px-8 py-3 rounded-3xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2",
                            statusFilter === 'pending' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 hover:text-white'
                        )}
                    >
                        <Clock size={14} /> Pending
                    </button>
                    <button
                        onClick={() => handleFilterChange('rejected')}
                        className={cn(
                            "flex-1 md:flex-none px-8 py-3 rounded-3xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2",
                            statusFilter === 'rejected' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' : 'text-slate-500 hover:text-white'
                        )}
                    >
                        <XCircle size={14} /> Rejected
                    </button>
                </div>

                <div className="hidden md:flex bg-white/5 px-5 py-3 rounded-2xl border border-white/10 items-center gap-3">
                    <ShieldCheck size={16} className="text-indigo-500" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                        Filtered: {totalCount}
                    </span>
                </div>
            </div>

            {/* DataTable */}
            <DataTable 
                columns={columns} 
                data={requests} 
                loading={loading} 
                totalCount={totalCount} 
                onParamsChange={handleParamsChange} 
                renderMobileCard={(req) => (
                    <div key={req._id} className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] space-y-5 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center font-black italic shadow-lg",
                                    statusFilter === 'pending' ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                                )}>
                                    {req.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white leading-tight">{req.name}</h3>
                                    <p className="text-[11px] font-bold text-slate-500">{req.email}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-5 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", statusFilter === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500')}></div>
                                <span className={cn("text-[10px] font-black uppercase tracking-[0.15em]", statusFilter === 'pending' ? 'text-amber-500' : 'text-rose-500')}>
                                    {statusFilter === 'pending' ? 'Pending' : 'Rejected'}
                                </span>
                            </div>
                            <button 
                                onClick={() => { setSelectedReq(req); setOpenModal(true); }} 
                                className="px-5 py-2.5 bg-white text-black rounded-xl text-[10px] font-black uppercase flex items-center gap-2 active:scale-95 transition-all shadow-lg"
                            >
                                <Eye size={14} /> Review
                            </button>
                        </div>
                    </div>
                )}
            />

            {/* Application Modal (Review) */}
            <Modal open={openModal} onClose={() => setOpenModal(false)} title={statusFilter === 'pending' ? "Review Application" : "Audit Rejected Application"} size="lg">
                {selectedReq && (
                    <div className="space-y-6 py-2">
                        <div className={cn(
                            "p-6 rounded-[2.2rem] border shadow-inner",
                            statusFilter === 'pending' ? 'bg-white/5 border-white/10' : 'bg-rose-500/5 border-rose-500/10'
                        )}>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Applicant Space Owner</p>
                            <p className="text-2xl font-black text-white italic mt-1">{selectedReq.name}</p>
                            <p className="text-sm text-indigo-400 font-bold">{selectedReq.email}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {['business_permit', 'dti_sec_reg'].map(fileKey => (
                                <div key={fileKey} className="group">
                                    <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block italic tracking-[0.2em]">
                                        {fileKey.replace(/_/g, ' ')}
                                    </label>
                                    <div className="aspect-video md:aspect-4/3 rounded-4xl border border-white/10 bg-[#0a0a0c] flex items-center justify-center overflow-hidden relative shadow-2xl group-hover:border-indigo-500/50 transition-all">
                                        {selectedReq[fileKey] ? (
                                            <img src={`/uploads/requirements/${selectedReq[fileKey]}`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" alt="doc" />
                                        ) : (
                                            <div className="text-center">
                                                <FileSearch size={32} className="mx-auto text-rose-500/30 mb-3" />
                                                <span className="text-[10px] text-rose-500 font-black uppercase">Document Missing</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {statusFilter === 'pending' && (
                            <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-white/5">
                                <button onClick={() => handleDecision(selectedReq._id, 'reject')} className="flex-1 py-4.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-3xl font-black uppercase text-[10px] hover:bg-rose-500 hover:text-white transition-all order-2 md:order-1">Deny Application</button>
                                <button onClick={() => handleDecision(selectedReq._id, 'approve')} className="flex-2 py-4.5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[10px] hover:bg-indigo-500 shadow-xl shadow-indigo-900/50 transition-all order-1 md:order-2">Approve & Send Email</button>
                            </div>
                        )}

                        {statusFilter === 'rejected' && (
                            <div className="flex gap-4 pt-6 border-t border-white/5">
                                <button onClick={() => handleDecision(selectedReq._id, 'approve')} className="w-full py-4.5 bg-white text-black rounded-3xl font-black uppercase text-[10px] hover:bg-emerald-500 hover:text-white transition-all shadow-xl">Re-evaluate & Accept</button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SpaceApplications;