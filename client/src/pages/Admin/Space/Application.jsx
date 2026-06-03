import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { FileSearch, ShieldCheck, XCircle, Eye, Inbox, Ban } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from "@/lib/utils";
import { formatNumber } from '@/utils/formatNumber';
import { ApplicationReviewModal } from '@/components/modal';
import { useTheme } from '@/hooks/useTheme';

let globalAppPollingInstance = null;

const SpaceApplications = () => {
    const { themeColor } = useTheme();
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
        if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
            return fileName;
        }
        const folderId = owner.space_request_id || owner._id;
        return `${import.meta.env.VITE_API_URL}/uploads/requirements/${folderId}/${fileName}`;
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
                        statusFilter === 'pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    )}>
                        {req.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-foreground leading-none uppercase tracking-tighter">{req.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 font-medium italic">{req.email}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Status",
            cell: () => (
                <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", statusFilter === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500')}></div>
                    <span className={cn("text-[10px] font-black uppercase tracking-tighter", statusFilter === 'pending' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')}>
                        {statusFilter === 'pending' ? 'Waiting Review' : 'Rejected'}
                    </span>
                </div>
            )
        },
        {
            header: "Actions",
            cell: (req) => (
                <div className="flex justify-end">
                    <button onClick={() => { setSelectedReq(req); setOpenModal(true); }} className="px-5 py-2 bg-muted text-muted-foreground rounded-xl text-[10px] font-black uppercase hover:bg-primary hover:text-primary-foreground transition-all border border-border italic">
                        {statusFilter === 'pending' ? 'Review Docs' : 'View Audit'}
                    </button>
                </div>
            )
        }
    ];

    const color = getThemeColorClass();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-foreground tracking-tight uppercase italic">Space Applications</h1>
                <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest">Verify and audit new space owner registrations.</p>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-card border-border p-6 rounded-[2.5rem] flex items-center gap-5 relative overflow-hidden group shadow-lg">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white transition-all">
                        <Inbox size={24} className="text-amber-600 dark:text-amber-400 group-hover:text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Pending Review</p>
                        <p className="text-3xl font-black text-foreground italic">{formatNumber(stats.pending)}</p>
                    </div>
                </div>
                <div className="bg-card border-border p-6 rounded-[2.5rem] flex items-center gap-5 relative overflow-hidden group shadow-lg">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white transition-all">
                        <Ban size={24} className="text-rose-600 dark:text-rose-400 group-hover:text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Rejected Apps</p>
                        <p className="text-3xl font-black text-foreground italic">{formatNumber(stats.rejected)}</p>
                    </div>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-2 bg-card p-1.5 rounded-4xl w-full md:w-fit border border-border shadow-2xl">
                    <button 
                        onClick={() => handleFilterChange('pending')} 
                        className={cn(
                            "flex-1 md:flex-none px-8 py-3 rounded-3xl text-[10px] font-black uppercase transition-all",
                            statusFilter === 'pending' ? `bg-${color}-600 text-white shadow-lg shadow-${color}-900/40` : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        Pending
                    </button>
                    <button 
                        onClick={() => handleFilterChange('rejected')} 
                        className={cn(
                            "flex-1 md:flex-none px-8 py-3 rounded-3xl text-[10px] font-black uppercase transition-all",
                            statusFilter === 'rejected' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        Rejected
                    </button>
                </div>
                <div className="hidden md:flex bg-muted px-5 py-3 rounded-2xl border border-border items-center gap-3">
                    <ShieldCheck size={16} className="text-primary" />
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Queue: {formatNumber(totalCount)}</span>
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
                    <div key={req._id} className="bg-card border-border p-6 rounded-[2.5rem] space-y-5 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center font-black italic shadow-lg border border-border",
                                    statusFilter === 'pending' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                )}>
                                    {req.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-foreground leading-tight uppercase italic">{req.name}</h3>
                                    <p className="text-[11px] font-bold text-muted-foreground italic">{req.email}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-5 border-t border-border">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", statusFilter === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500')}></div>
                                <span className={cn("text-[10px] font-black uppercase tracking-[0.15em]", statusFilter === 'pending' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')}>
                                    {statusFilter === 'pending' ? 'Pending' : 'Rejected'}
                                </span>
                            </div>
                            <button
                                onClick={() => { setSelectedReq(req); setOpenModal(true); }}
                                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase flex items-center gap-2 active:scale-95 transition-all shadow-lg"
                            >
                                <Eye size={14} /> Review
                            </button>
                        </div>
                    </div>
                )}
            />

            {/* Application Review Modal */}
            <ApplicationReviewModal
                isOpen={openModal}
                onClose={() => setOpenModal(false)}
                application={selectedReq}
                statusFilter={statusFilter}
                onDecision={handleDecision}
                getDocumentUrl={getDocumentUrl}
                isImageFile={isImageFile}
            />
        </div>
    );
};

export default SpaceApplications;