import React, { useState } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { FileSearch, ShieldCheck, Clock, XCircle } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';

const SpaceApplications = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedReq, setSelectedReq] = useState(null);
    const [openModal, setOpenModal] = useState(false);

    // ✅ Track current filter
    const [statusFilter, setStatusFilter] = useState('pending');
    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });

    const fetchData = async (params = currentParams, status = statusFilter) => {
        setLoading(true);
        try {
            const { page, search } = params;
            // ✅ Pass status to the API
            const res = await apiGet(`/admin/space/requests?page=${page}&search=${search}&status=${status}`);

            const rowData = res.requests || res.data?.requests || [];
            const total = res.total || res.data?.total || 0;

            setRequests(Array.isArray(rowData) ? rowData : []);
            setTotalCount(total);
            setCurrentParams(params);
        } catch (err) {
            showToast({ icon: 'error', title: 'Fetch error' });
        } finally {
            setLoading(false);
        }
    };

    const handleParamsChange = (params) => {
        fetchData(params, statusFilter);
    };

    // ✅ Switch tabs and reset page to 1
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
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs italic border ${statusFilter === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}>
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
                    <div className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`}></div>
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${statusFilter === 'pending' ? 'text-amber-500' : 'text-rose-500'}`}>
                        {statusFilter === 'pending' ? 'Pending Review' : 'Rejected Application'}
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
                        className="px-5 py-2 bg-white/5 text-slate-300 rounded-xl text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all border border-white/5"
                    >
                        {statusFilter === 'pending' ? 'Review Docs' : 'View Details'}
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Space Applications</h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Manage and verify new space owner requests.</p>

                    {/* ✅ Filter Tabs */}
                    <div className="flex gap-2 mt-6 bg-white/5 p-1 rounded-2xl w-fit border border-white/5">
                        <button
                            onClick={() => handleFilterChange('pending')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${statusFilter === 'pending' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 hover:text-white'}`}
                        >
                            <Clock size={12} /> Pending
                        </button>
                        <button
                            onClick={() => handleFilterChange('rejected')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${statusFilter === 'rejected' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' : 'text-slate-500 hover:text-white'}`}
                        >
                            <XCircle size={12} /> Rejected
                        </button>
                    </div>
                </div>

                <div className="bg-white/5 px-5 py-2.5 rounded-2xl border border-white/10 flex items-center gap-3">
                    <ShieldCheck size={16} className="text-indigo-500" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        Total {statusFilter}: {totalCount}
                    </span>
                </div>
            </div>

            <DataTable columns={columns} data={requests} loading={loading} totalCount={totalCount} onParamsChange={handleParamsChange} />

            <Modal open={openModal} onClose={() => setOpenModal(false)} title={statusFilter === 'pending' ? "Application Review" : "Rejected Application Details"} size="lg">
                {selectedReq && (
                    <div className="space-y-6 py-2">
                        <div className={`p-5 rounded-2xl border ${statusFilter === 'pending' ? 'bg-white/5 border-white/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Space Owner</p>
                            <p className="text-xl font-black text-white italic mt-1">{selectedReq.name}</p>
                            <p className="text-xs text-indigo-400 font-medium">{selectedReq.email}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {['business_permit', 'dti_sec_reg'].map(fileKey => (
                                <div key={fileKey} className="group">
                                    <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block italic tracking-widest">
                                        {fileKey.replace(/_/g, ' ')}
                                    </label>
                                    <div className="aspect-4/3 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden relative">
                                        {selectedReq[fileKey] ? (
                                            <img src={`/uploads/requirements/${selectedReq[fileKey]}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <div className="text-center">
                                                <FileSearch size={24} className="mx-auto text-rose-500/50 mb-2" />
                                                <span className="text-[10px] text-rose-500 font-black uppercase">Missing File</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {statusFilter === 'pending' && (
                            <div className="flex gap-4 pt-6 border-t border-white/5">
                                <button onClick={() => handleDecision(selectedReq._id, 'reject')} className="flex-1 py-3.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl font-black uppercase text-[10px] hover:bg-rose-500 hover:text-white transition-all">Decline</button>
                                <button onClick={() => handleDecision(selectedReq._id, 'approve')} className="flex-2 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-indigo-500 shadow-xl shadow-indigo-900/40 transition-all">Approve & Grant Access</button>
                            </div>
                        )}

                        {/* ✅ Option to reconsider if already rejected */}
                        {statusFilter === 'rejected' && (
                            <div className="flex gap-4 pt-6 border-t border-white/5">
                                <button onClick={() => handleDecision(selectedReq._id, 'approve')} className="w-full py-3.5 bg-white text-black rounded-2xl font-black uppercase text-[10px] hover:bg-indigo-600 hover:text-white transition-all">Re-evaluate & Approve</button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SpaceApplications;