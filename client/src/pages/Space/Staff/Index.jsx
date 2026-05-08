import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost, apiDelete, apiPut } from '@/utils/Api';
import { Trash2, Edit3, Users, CheckCircle, XCircle, UserPlus, Mail, Shield } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import Swal from 'sweetalert2';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from "@/lib/utils";

let globalPollingInstance = null;

const StaffManagement = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [openModal, setOpenModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });
    const paramsRef = useRef(currentParams);
    const lastDataFingerprint = useRef("");

    useEffect(() => {
        paramsRef.current = currentParams;
    }, [currentParams]);

    // --- DATA FETCHING ---
    const fetchData = async (params = paramsRef.current, isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const { page, search } = params;
            const res = await apiGet(`/space/staff?page=${page}&search=${search}`);

            const rowData = res.staff || res.data?.staff || [];
            const total = res.total || res.data?.total || 0;
            const fetchedStats = res.stats || res.data?.stats || { total: 0, active: 0, inactive: 0 };

            const currentFingerprint = JSON.stringify({ rowData, total, fetchedStats });

            if (currentFingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = currentFingerprint;
                setStaff(Array.isArray(rowData) ? rowData : []);
                setTotalCount(total);
                setStats(fetchedStats);
            }
        } catch {
            if (isInitial) showToast({ icon: 'error', title: 'Failed to sync staff' });
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const handleParamsChange = useCallback((params) => {
        setCurrentParams(params);
        fetchData(params);
    }, []);

    // --- HEARTBEAT ---
    useEffect(() => {
        if (globalPollingInstance) clearInterval(globalPollingInstance);
        fetchData(paramsRef.current, true);

        globalPollingInstance = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchData(paramsRef.current, false);
            }
        }, 5000); // Staff list doesn't need 3s polling, 5s is safer for DB

        return () => {
            clearInterval(globalPollingInstance);
            globalPollingInstance = null;
        };
    }, []);

    // --- ACTIONS ---
    const toggleStatus = async (id) => {
        try {
            await apiPost(`/space/staff/${id}/toggle`);
            showToast({ icon: 'success', title: 'Access toggled' });
            fetchData();
        } catch {
            showToast({ icon: 'error', title: 'Action failed' });
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Remove Staff?',
            text: "This user will lose hub dashboard access.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Remove Access',
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
                await apiDelete(`/space/staff/${id}`);
                showToast({ icon: 'success', title: 'Staff removed' });
                fetchData();
            } catch {
                showToast({ icon: 'error', title: 'Delete failed' });
            }
        }
    };

   const handleSave = async () => {
    if (!selectedMember.name || !selectedMember.email) return;
    try {
        if (isEditMode) {
            await apiPut(`/space/staff/${selectedMember._id}`, selectedMember);
            showToast({ icon: 'success', title: 'Staff updated' });
        } else {
            await apiPost(`/space/staff`, {
                name: selectedMember.name,
                email: selectedMember.email,
                password: selectedMember.password || "password123",
                role: "staff"
            });
            showToast({ icon: 'success', title: 'Staff member added' });
        }
        setOpenModal(false);
        fetchData();
    } catch (error) {
        console.error('Staff save error:', error);
        const errorMessage = error.message || (isEditMode ? 'Update failed' : 'Failed to add staff');
        showToast({ icon: 'error', title: isEditMode ? 'Update Failed' : 'Add Failed', text: errorMessage });
    }
};

    const columns = [
        {
            header: "Staff Member",
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-indigo-500 text-xs italic">
                        {row.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-white leading-none">{row.name}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">{row.email}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Role",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Shield size={12} className={row.role === 'admin' ? "text-indigo-500" : "text-slate-600"} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{row.role}</span>
                </div>
            )
        },
        {
            header: "Status",
            cell: (row) => (
                <button
                    onClick={() => toggleStatus(row._id)}
                    className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                        row.isActive
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-500 border border-white/5'
                    )}
                >
                    {row.isActive ? 'Active' : 'Revoked'}
                </button>
            )
        },
        {
            header: "Actions",
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <button onClick={() => { setSelectedMember(row); setIsEditMode(true); setOpenModal(true); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white hover:text-black transition-all">
                        <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(row._id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                        <Trash2 size={14} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Staff Management</h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">Manage your hub's operational team.</p>
                </div>
                <button
                    onClick={() => { setSelectedMember({ name: '', email: '', role: 'staff' }); setIsEditMode(false); setOpenModal(true); }}
                    className="bg-white text-black px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-xl active:scale-95"
                >
                    <UserPlus size={16} className="inline mr-2" /> Add Staff
                </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20"><Users size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total Team</p>
                        <p className="text-2xl font-black text-white italic">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20"><CheckCircle size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Active</p>
                        <p className="text-2xl font-black text-white italic">{stats.active}</p>
                    </div>
                </div>
                <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20"><XCircle size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Revoked</p>
                        <p className="text-2xl font-black text-white italic">{stats.inactive}</p>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={staff}
                loading={loading}
                totalCount={totalCount}
                onParamsChange={handleParamsChange}
                renderMobileCard={(member) => (
                    <div key={member._id} className="bg-[#111114] border border-white/5 p-5 rounded-[2.5rem] space-y-4 shadow-xl">
                        {/* --- TOP SECTION: INFO --- */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white italic border border-white/10">
                                    {member.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white leading-tight uppercase italic tracking-tighter">{member.name}</h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{member.email}</p>
                                </div>
                            </div>
                            <div className="text-[8px] font-[1000] text-indigo-400 uppercase px-2 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/10 tracking-widest">
                                {member.role}
                            </div>
                        </div>

                        {/* --- DIVIDER --- */}
                        <div className="h-px w-full bg-white/5" />

                        {/* --- BOTTOM SECTION: ACTIONS --- */}
                        <div className="flex items-center justify-between">
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Member Actions</p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => { setSelectedMember(member); setIsEditMode(true); setOpenModal(true); }}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white hover:text-black active:scale-90 transition-all border border-white/5"
                                >
                                    <Edit3 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(member._id)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white active:scale-90 transition-all border border-rose-500/10"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            />

            {/* ADD/EDIT MODAL */}
            <Modal open={openModal} onClose={() => setOpenModal(false)} title={isEditMode ? "Edit Staff Profile" : "Register New Staff"} size="md">
                {selectedMember && (
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Full Name</label>
                            <input
                                type="text"
                                value={selectedMember.name || ''}
                                onChange={(e) => setSelectedMember({ ...selectedMember, name: e.target.value })}
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold placeholder:text-slate-700"
                                placeholder="e.g. Neil Mar De Asis"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Email Address</label>
                            <input
                                type="email"
                                value={selectedMember.email || ''}
                                onChange={(e) => setSelectedMember({ ...selectedMember, email: e.target.value })}
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold placeholder:text-slate-700"
                                placeholder="staff@flexspace.ph"
                            />
                        </div>

                        {/* Only show password field when CREATING, hide when EDITING */}
                        {!isEditMode && (
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Access Password</label>
                                <input
                                    type="password"
                                    value={selectedMember.password || ''}
                                    onChange={(e) => setSelectedMember({ ...selectedMember, password: e.target.value })}
                                    className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all text-sm outline-none font-bold placeholder:text-slate-700"
                                    placeholder="Leave blank for: FlexSpace2026"
                                />
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setOpenModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 py-4 rounded-2xl bg-white text-black font-black text-[10px] uppercase shadow-xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                            >
                                {isEditMode ? 'Update Profile' : 'Confirm Staff'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StaffManagement;