import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost, apiDelete, apiPut } from '@/utils/Api';
import { Trash2, Edit3, Users, CheckCircle, XCircle, User, Building2, Eye, FileText } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import Swal from 'sweetalert2';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from "@/lib/utils";
import { getImageUrl } from '@/utils/imageHelper';

// Format number with commas
const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    const number = typeof num === 'number' ? num : parseFloat(num);
    if (isNaN(number)) return '0';
    return number.toLocaleString('en-US');
};

// Maintained global polling instance as requested
let globalPollingInstance = null;

const UserManagement = () => {
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [openModal, setOpenModal] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState(null);
    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });
    const [userRole, setUserRole] = useState('user');
    const [previewDoc, setPreviewDoc] = useState(null);

    const paramsRef = useRef(currentParams);
    const lastDataFingerprint = useRef("");

   const getDocumentUrl = (owner, fileName) => {
    console.log('fileName:', fileName);
    console.log('startsWith http:', fileName?.startsWith('http'));
    
    if (!fileName) return null;
    
    // If it's already a Cloudinary URL, return as is
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
        console.log('Returning Cloudinary URL:', fileName);
        return fileName;
    }
    
    // For backward compatibility (old local paths - will likely 404)
    const folderId = owner.space_request_id || owner._id;
    const localUrl = `${import.meta.env.VITE_API_URL}/uploads/requirements/${folderId}/${fileName}`;
    console.log('Returning local URL:', localUrl);
    return localUrl;
};

    useEffect(() => {
        paramsRef.current = { ...currentParams, role: userRole };
    }, [currentParams, userRole]);

    const fetchData = async (params = paramsRef.current, isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const { page, search, role } = params;
            const res = await apiGet(`/admin/users?page=${page}&search=${search}&role=${role}`);

            const rowData = res.owners || res.data?.owners || [];
            const total = res.total || res.data?.total || 0;
            const fetchedStats = res.stats || res.data?.stats || { total: 0, active: 0, inactive: 0 };

            const currentFingerprint = JSON.stringify({ rowData, total, fetchedStats });

            if (currentFingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = currentFingerprint;
                setOwners(Array.isArray(rowData) ? rowData : []);
                setTotalCount(total);
                setStats(fetchedStats);
            }
        } catch {
            if (isInitial) showToast({ icon: 'error', title: 'Failed to sync users' });
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const handleParamsChange = useCallback((params) => {
        setCurrentParams(params);
        fetchData({ ...params, role: userRole });
    }, [userRole]);

    useEffect(() => {
        if (globalPollingInstance) clearInterval(globalPollingInstance);
        fetchData({ ...paramsRef.current, role: userRole }, true);
        globalPollingInstance = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchData({ ...paramsRef.current, role: userRole }, false);
            }
        }, 3000);
        return () => {
            clearInterval(globalPollingInstance);
            globalPollingInstance = null;
        };
    }, [userRole]);

    const toggleStatus = async (id) => {
        try {
            await apiPost(`/admin/users/${id}/toggle`);
            showToast({ icon: 'success', title: 'Status updated' });
            fetchData({ ...paramsRef.current, role: userRole });
        } catch {
            showToast({ icon: 'error', title: 'Update failed' });
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            background: '#111114',
            color: '#fff',
            customClass: {
                popup: 'rounded-[2.5rem] border border-white/5 shadow-2xl',
                confirmButton: 'rounded-xl bg-rose-500 font-black uppercase text-[10px] tracking-widest',
                cancelButton: 'rounded-xl bg-white/5 font-black uppercase text-[10px] tracking-widest text-slate-500'
            }
        });
        if (result.isConfirmed) {
            try {
                await apiDelete(`/admin/users/${id}`);
                showToast({ icon: 'success', title: 'Account deleted' });
                fetchData({ ...paramsRef.current, role: userRole });
            } catch {
                showToast({ icon: 'error', title: 'Delete failed' });
            }
        }
    };

    const handleSave = async () => {
        if (!selectedOwner?._id) return;
        try {
            await apiPut(`/admin/users/${selectedOwner._id}`, { name: selectedOwner.name, email: selectedOwner.email });
            showToast({ icon: 'success', title: 'Owner updated' });
            setOpenModal(false);
            fetchData({ ...paramsRef.current, role: userRole });
        } catch {
            showToast({ icon: 'error', title: 'Update failed' });
        }
    };

    const viewDocument = (docUrl, docName) => {
        setPreviewDoc({ url: docUrl, name: docName });
    };

    const isImageFile = (url) => {
        return url && /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    };

    const columns = [
        {
            header: "User Details",
            cell: (owner) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-xs italic shrink-0">
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
        ...(userRole === 'space' ? [{
            header: "Documents",
            cell: (owner) => (
                <div className="flex gap-2">
                    {owner.business_permit && (
                        <button
                            onClick={() => viewDocument(getDocumentUrl(owner, owner.business_permit), 'Business Permit')}
                            className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg text-[9px] text-indigo-400 hover:bg-indigo-500/20 transition-all"
                        >
                            <FileText size={12} /> Permit
                        </button>
                    )}
                    {owner.dti_sec_reg && (
                        <button
                            onClick={() => viewDocument(getDocumentUrl(owner, owner.dti_sec_reg), 'DTI/SEC Registration')}
                            className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg text-[9px] text-indigo-400 hover:bg-indigo-500/20 transition-all"
                        >
                            <FileText size={12} /> DTI/SEC
                        </button>
                    )}
                    {!owner.business_permit && !owner.dti_sec_reg && (
                        <span className="text-slate-500 text-[10px]">—</span>
                    )}
                </div>
            )
        }] : []),
        {
            header: "Actions",
            cell: (owner) => (
                <div className="flex justify-end gap-2">
                    <button onClick={() => { setSelectedOwner(owner); setOpenModal(true); }} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white hover:text-black transition-all">
                        <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(owner._id)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                        <Trash2 size={14} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">User Management</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Manage platform users and space providers.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between mb-6">
                <Tabs value={userRole} onValueChange={setUserRole} className="w-auto">
                    <TabsList className="bg-white/5 border border-white/5 rounded-3xl p-1.5">
                        <TabsTrigger
                            value="user"
                            className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-900/40 text-slate-500"
                        >
                            <User size={12} className="mr-2" /> Users
                        </TabsTrigger>
                        <TabsTrigger
                            value="space"
                            className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-900/40 text-slate-500"
                        >
                            <Building2 size={12} className="mr-2" /> Space Providers
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* STATISTICS GRID - FORMATTED NUMBERS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20"><Users size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total {userRole === 'user' ? 'Users' : 'Providers'}</p>
                        <p className="text-2xl font-black text-white italic">{formatNumber(stats.total)}</p>
                    </div>
                </div>
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20"><CheckCircle size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Active Accounts</p>
                        <p className="text-2xl font-black text-white italic">{formatNumber(stats.active)}</p>
                    </div>
                </div>
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20"><XCircle size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Inactive</p>
                        <p className="text-2xl font-black text-white italic">{formatNumber(stats.inactive)}</p>
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
                    <div key={owner._id} className="bg-[#111114] border border-white/5 p-5 rounded-[2.5rem] space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white italic">
                                    {owner.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white leading-tight">{owner.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-500">{owner.email}</p>
                                    {owner.role && (
                                        <p className="text-[8px] text-indigo-400 font-black uppercase mt-1">
                                            {owner.role === 'space' ? 'Space Provider' : 'User'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {/* Status Badge */}
                            <button
                                onClick={() => toggleStatus(owner._id)}
                                className={cn(
                                    "px-2 py-1 rounded-lg text-[8px] font-black uppercase",
                                    owner.isActive
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-slate-500/20 text-slate-400 border border-white/10'
                                )}
                            >
                                {owner.isActive ? 'Active' : 'Inactive'}
                            </button>
                        </div>

                        {/* Documents for Space Providers */}
                        {owner.role === 'space' && (owner.business_permit || owner.dti_sec_reg) && (
                            <div className="flex gap-2 pt-2 border-t border-white/5">
                                {owner.business_permit && (
                                    <button
                                        onClick={() => viewDocument(getDocumentUrl(owner, owner.business_permit), 'Business Permit')}
                                        className="text-[8px] text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        📄 View Permit
                                    </button>
                                )}
                                {owner.dti_sec_reg && (
                                    <button
                                        onClick={() => viewDocument(getDocumentUrl(owner, owner.dti_sec_reg), 'DTI/SEC')}
                                        className="text-[8px] text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        📄 View DTI/SEC
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                            <button
                                onClick={() => { setSelectedOwner(owner); setOpenModal(true); }}
                                className="p-2 rounded-xl bg-white/5 text-slate-400 hover:bg-white hover:text-black transition-all"
                            >
                                <Edit3 size={14} />
                            </button>
                            <button
                                onClick={() => handleDelete(owner._id)}
                                className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                )}
            />

            {/* Document Preview Modal */}
            <Modal
                open={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                title={previewDoc?.name || 'Document Preview'}
                size="xl"
                variant="dark"
            >
                {previewDoc && (
    <div className="w-full">
        {isImageFile(previewDoc.url) ? (
            <img
                src={getImageUrl(previewDoc.url, 'document')}
                alt={previewDoc.name}
                className="w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                    e.target.src = '/placeholders/document.jpg';
                }}
            />
        ) : (
            <iframe
                src={previewDoc.url}
                className="w-full h-[70vh] rounded-lg bg-white"
                title={previewDoc.name}
            />
        )}
        <div className="mt-4 text-center">
            <button
                onClick={() => window.open(previewDoc.url, '_blank')}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
            >
                Open in new window →
            </button>
        </div>
    </div>
)}
            </Modal>

            {/* Edit Account Modal */}
            <Modal open={openModal} onClose={() => setOpenModal(false)} title="Edit Account" size="md" variant="dark">
                {selectedOwner && (
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Full Name</label>
                            <input
                                type="text"
                                value={selectedOwner.name || ''}
                                onChange={(e) => setSelectedOwner({ ...selectedOwner, name: e.target.value })}
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Email Address</label>
                            <input
                                type="email"
                                value={selectedOwner.email || ''}
                                onChange={(e) => setSelectedOwner({ ...selectedOwner, email: e.target.value })}
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold"
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setOpenModal(false)}
                                className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg shadow-indigo-900/40 hover:bg-indigo-500 transition-all"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default UserManagement;