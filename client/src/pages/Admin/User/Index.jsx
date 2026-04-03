import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete, apiPut } from '@/utils/Api';
import { FileText, BadgeCheck, Trash2, Edit3, Plus } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import Swal from 'sweetalert2';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';

const UserManagement = () => {
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    const [openModal, setOpenModal] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState(null);

    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });

    const fetchData = async (params = currentParams) => {
        setLoading(true);
        try {
            const { page, search } = params;

            const res = await apiGet(`/admin/users?page=${page}&search=${search}`);

            // console.log("API RESPONSE:", res); // 👈 DEBUG

            const rowData = res.owners || res.data?.owners || [];
            const total = res.total || res.data?.total || 0;

            setOwners(Array.isArray(rowData) ? rowData : []);
            setTotalCount(total);
            setCurrentParams(params);

        } catch (err) {
            console.error("FETCH ERROR:", err.response?.data || err.message);
            showToast({ icon: 'error', title: 'Failed to load owners' });
        } finally {
            setLoading(false);
        }
    };

    // Triggered by DataTable internal state (Search/Pagination)
    const handleParamsChange = (params) => {
        fetchData(params);
    };

    const toggleStatus = async (id) => {
        try {
            await apiPost(`/admin/owners/${id}/toggle`);
            showToast({ icon: 'success', title: 'Status updated' });
            fetchData();
        } catch (err) {
            showToast({ icon: 'error', title: 'Update failed' });
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "Account will be permanently deleted.",
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
                await apiDelete(`/admin/owners/${id}`);
                showToast({ icon: 'success', title: 'Account deleted' });
                fetchData();
            } catch (err) {
                showToast({ icon: 'error', title: 'Delete failed' });
            }
        }
    };

    const handleSave = async () => {
        if (!selectedOwner?._id) return;
        try {
            await apiPut(`/admin/owners/${selectedOwner._id}`, {
                name: selectedOwner.name,
                email: selectedOwner.email
            });

            showToast({ icon: 'success', title: 'Owner updated' });
            setOpenModal(false);
            fetchData();
        } catch (err) {
            showToast({ icon: 'error', title: 'Update failed' });
        }
    };

    const columns = [
        {
            header: "Owner Details",
            cell: (owner) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-lg shadow-indigo-900/20 italic">
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
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                        owner.isActive
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-500 border border-white/5'
                    }`}
                >
                    {owner.isActive ? 'Active' : 'Inactive'}
                </button>
            )
        },
        {
            header: "Actions",
            cell: (owner) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => {
                            setSelectedOwner(owner);
                            setOpenModal(true);
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white hover:text-black transition-all"
                    >
                        <Edit3 size={14} />
                    </button>
                    <button
                        onClick={() => handleDelete(owner._id)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">User Management</h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Manage active space owners and their account status.</p>
                </div>

                <div className="bg-emerald-500/10 px-5 py-2.5 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">
                        Total Records: {totalCount}
                    </span>
                </div>
            </div>

            <DataTable 
                columns={columns} 
                data={owners} 
                loading={loading} 
                totalCount={totalCount}
                onParamsChange={handleParamsChange}
            />

            <Modal
                open={openModal}
                onClose={() => setOpenModal(false)}
                title="Edit Space Owner"
                size="md"
            >
                {selectedOwner && (
                    <div className="space-y-5 py-2">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Full Name</label>
                            <input
                                type="text"
                                value={selectedOwner.name || ''}
                                onChange={(e) => setSelectedOwner({ ...selectedOwner, name: e.target.value })}
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Email Address</label>
                            <input
                                type="email"
                                value={selectedOwner.email || ''}
                                onChange={(e) => setSelectedOwner({ ...selectedOwner, email: e.target.value })}
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                            <button
                                onClick={() => setOpenModal(false)}
                                className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg shadow-indigo-900/40 hover:bg-indigo-500 transition-all"
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