import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { FileSearch, ShieldCheck, XCircle, Eye, Inbox, Ban } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from "@/lib/utils";
import { getImageUrl } from '@/utils/imageHelper';

// Maintained global polling instance as requested
let globalAppPollingInstance = null;

const SpaceApplications = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ pending: 0, rejected: 0 });
    const [selectedReq, setSelectedReq] = useState(null);
    const [openModal, setOpenModal] = useState(false);

    const [statusFilter, setStatusFilter] = useState('pending');
    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });

    const paramsRef = useRef(currentParams);
    const statusRef = useRef(statusFilter);
    const lastDataFingerprint = useRef("");

    // Keep Refs in sync with state for the background heartbeat
    useEffect(() => {
        paramsRef.current = currentParams;
        statusRef.current = statusFilter;
    }, [currentParams, statusFilter]);

    const fetchData = async (params = paramsRef.current, status = statusRef.current, isInitial = false) => {
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
            }
        } catch {
            if (isInitial) showToast({ icon: 'error', title: 'Failed to sync requests' });
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    // Memoized to prevent DataTable infinite re-renders
    const handleParamsChange = useCallback((params) => {
        setCurrentParams(params);
        fetchData(params, statusRef.current);
    }, []);

    const handleFilterChange = (newStatus) => {
        setStatusFilter(newStatus);
        const resetParams = { ...paramsRef.current, page: 1 };
        setCurrentParams(resetParams);
        fetchData(resetParams, newStatus, true);
    };

    // Heartbeat logic
    useEffect(() => {
        if (globalAppPollingInstance) clearInterval(globalAppPollingInstance);

        fetchData(paramsRef.current, statusRef.current, true);

        globalAppPollingInstance = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchData(paramsRef.current, statusRef.current, false);
            }
        }, 3000);

        return () => {
            if (globalAppPollingInstance) {
                clearInterval(globalAppPollingInstance);
                globalAppPollingInstance = null;
            }
        };
    }, []);

    const handleDecision = async (id, action) => {
        try {
            await apiPost(`/admin/space/requests/${id}/${action}`);
            showToast({ icon: 'success', title: `Application ${action}ed` });
            setOpenModal(false);
            fetchData();
        } catch {
            showToast({ icon: 'error', title: 'Action failed' });
        }
    };

    const getDocumentUrl = (owner, fileName) => {
    if (!fileName) return null;
    
    console.log('getDocumentUrl called with:', { fileName, ownerId: owner._id });
    
    // If it's already a Cloudinary URL, return as is
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
        console.log('Returning Cloudinary URL directly:', fileName);
        return fileName;
    }
    
    // Try to get from the user's space_request_id
    const folderId = owner.space_request_id || owner._id;
    const localUrl = `${import.meta.env.VITE_API_URL}/uploads/requirements/${folderId}/${fileName}`;
    console.log('Constructed local URL:', localUrl);
    return localUrl;
};

    const isImageFile = (fileName) => {
        return fileName && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
    };

    const columns = [
        {
            header: "Applicant Details",
            cell: (req) => (
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs italic border shadow-sm",
                        statusFilter === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    )}>
                        {req.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-white leading-none uppercase tracking-tighter">{req.name}</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium italic">{req.email}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Status",
            cell: () => (
                <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", statusFilter === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500')}></div>
                    <span className={cn("text-[10px] font-black uppercase tracking-tighter", statusFilter === 'pending' ? 'text-amber-500' : 'text-rose-500')}>
                        {statusFilter === 'pending' ? 'Waiting Review' : 'Rejected'}
                    </span>
                </div>
            )
        },
        {
            header: "Actions",
            cell: (req) => (
                <div className="flex justify-end">
                    <button onClick={() => { setSelectedReq(req); setOpenModal(true); }} className="px-5 py-2 bg-white/5 text-slate-300 rounded-xl text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all border border-white/5 italic">
                        {statusFilter === 'pending' ? 'Review Docs' : 'View Audit'}
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Space Applications</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Verify and audit new space owner registrations.</p>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-5 relative overflow-hidden group">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-black transition-all"><Inbox size={24} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pending Review</p>
                        <p className="text-3xl font-black text-white italic">{stats.pending}</p>
                    </div>
                </div>
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-5 relative overflow-hidden group">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-black transition-all"><Ban size={24} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rejected Apps</p>
                        <p className="text-3xl font-black text-white italic">{stats.rejected}</p>
                    </div>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-2 bg-[#111114] p-1.5 rounded-4xl w-full md:w-fit border border-white/5 shadow-2xl">
                    <button onClick={() => handleFilterChange('pending')} className={cn("flex-1 md:flex-none px-8 py-3 rounded-3xl text-[10px] font-black uppercase transition-all", statusFilter === 'pending' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 hover:text-white')}>Pending</button>
                    <button onClick={() => handleFilterChange('rejected')} className={cn("flex-1 md:flex-none px-8 py-3 rounded-3xl text-[10px] font-black uppercase transition-all", statusFilter === 'rejected' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' : 'text-slate-500 hover:text-white')}>Rejected</button>
                </div>
                <div className="hidden md:flex bg-white/5 px-5 py-3 rounded-2xl border border-white/10 items-center gap-3">
                    <ShieldCheck size={16} className="text-indigo-500" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Queue: {totalCount}</span>
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
                                    "w-14 h-14 rounded-2xl flex items-center justify-center font-black italic shadow-lg border border-white/5",
                                    statusFilter === 'pending' ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                                )}>
                                    {req.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white leading-tight uppercase italic">{req.name}</h3>
                                    <p className="text-[11px] font-bold text-slate-500 italic">{req.email}</p>
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

            {/* Modal */}
            <Modal open={openModal} onClose={() => setOpenModal(false)} title={statusFilter === 'pending' ? "Review Application" : "Audit Rejected Application"} size="lg">
                {selectedReq && (
                    <div className="space-y-6 py-2">
                        <div className={cn(
                            "p-6 rounded-[2.2rem] border shadow-inner transition-all",
                            statusFilter === 'pending' ? 'bg-white/5 border-white/10' : 'bg-rose-500/5 border-rose-500/10'
                        )}>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 italic">Applicant Identity</p>
                            <p className="text-2xl font-black text-white italic">{selectedReq.name}</p>
                            <p className="text-sm text-indigo-400 font-bold tracking-tight">{selectedReq.email}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {['business_permit', 'dti_sec_reg'].map(fileKey => {
                                const fileName = selectedReq[fileKey];
                                const fileUrl = getDocumentUrl(selectedReq, fileName);
                                const isImage = isImageFile(fileName);
                                
                                return (
                                    <div key={fileKey} className="group">
                                        <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block italic tracking-[0.2em]">
                                            {fileKey === 'business_permit' ? 'Business Permit' : 'DTI / SEC Registration'}
                                        </label>
                                        <div
                                            className="aspect-video md:aspect-4/3 rounded-4xl border border-white/10 bg-[#0a0a0c] flex items-center justify-center overflow-hidden relative shadow-2xl group-hover:border-indigo-500/50 transition-all cursor-pointer"
                                            onClick={() => {
                                                if (fileUrl) {
                                                    if (isImage) {
                                                        window.open(fileUrl, '_blank');
                                                    } else {
                                                        window.open(fileUrl, '_blank');
                                                    }
                                                }
                                            }}
                                        >
                                            {fileName ? (
                                                isImage ? (
                                                    <img
                                                        src={getImageUrl(fileUrl, 'document')}
                                                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                                                        alt={fileKey}
                                                        onError={(e) => { e.target.src = '/placeholders/document.jpg'; }}
                                                    />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <svg className="w-12 h-12 text-red-500/30 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                                        </svg>
                                                        <span className="text-[10px] text-slate-400 font-black uppercase">PDF Document</span>
                                                        <span className="text-[8px] text-indigo-400 mt-2 block">Click to view</span>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="text-center">
                                                    <XCircle size={32} className="mx-auto text-rose-500/30 mb-3" />
                                                    <span className="text-[10px] text-rose-500 font-black uppercase">Document Missing</span>
                                                </div>
                                            )}
                                        </div>
                                        {fileName && (
                                            <div className="text-center mt-2">
                                                <button
                                                    onClick={() => window.open(fileUrl, '_blank')}
                                                    className="text-[8px] text-indigo-400 hover:text-indigo-300 transition-colors"
                                                >
                                                    Click to view full document →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {statusFilter === 'pending' && (
                            <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-white/5">
                                <button onClick={() => handleDecision(selectedReq._id, 'reject')} className="flex-1 py-4.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-3xl font-black uppercase text-[10px] hover:bg-rose-500 hover:text-white transition-all order-2 md:order-1 tracking-widest">Deny Application</button>
                                <button onClick={() => handleDecision(selectedReq._id, 'approve')} className="flex-2 py-4.5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[10px] hover:bg-indigo-500 shadow-xl shadow-indigo-900/50 transition-all order-1 md:order-2 tracking-widest">Verify & Approve</button>
                            </div>
                        )}

                        {statusFilter === 'rejected' && (
                            <div className="flex gap-4 pt-6 border-t border-white/5">
                                <button onClick={() => handleDecision(selectedReq._id, 'approve')} className="w-full py-4.5 bg-white text-black rounded-3xl font-black uppercase text-[10px] hover:bg-emerald-500 hover:text-white transition-all shadow-xl tracking-widest">Reverse Decision</button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SpaceApplications;