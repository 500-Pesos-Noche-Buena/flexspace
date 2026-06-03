import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost, apiDelete, apiPut } from '@/utils/Api';
import { Trash2, Edit3, Users, CheckCircle, XCircle, UserPlus, Shield, Building } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import Swal from 'sweetalert2';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from "@/lib/utils";
import { BranchModal } from '@/components/modal';

let globalPollingInstance = null;

const StaffManagement = () => {
    const [staff, setStaff] = useState([]);
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [openModal, setOpenModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [loadingSpaces, setLoadingSpaces] = useState(false);

    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });
    const paramsRef = useRef(currentParams);
    const lastDataFingerprint = useRef("");

    useEffect(() => {
        const isStaffPage = window.location.pathname.includes('/space/staff');
        if (!isStaffPage) return;

        if (globalPollingInstance) clearInterval(globalPollingInstance);
        fetchData(paramsRef.current, true);
        fetchSpaces();

        globalPollingInstance = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchData(paramsRef.current, false);
            }
        }, 5000);

        return () => {
            clearInterval(globalPollingInstance);
            globalPollingInstance = null;
        };
    }, []);

    useEffect(() => {
        paramsRef.current = currentParams;
    }, [currentParams]);

    // Fetch spaces for dropdown
    const fetchSpaces = async () => {
        setLoadingSpaces(true);
        try {
            const response = await apiGet('/space/spaces');
            if (response.success) {
                setSpaces(response.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch spaces:', error);
            showToast({ icon: 'error', title: 'Failed to load branches' });
        } finally {
            setLoadingSpaces(false);
        }
    };

    // Helper function to extract space_id from populated object or string
    const extractSpaceId = (spaceId) => {
        if (!spaceId) return '';
        if (typeof spaceId === 'object' && spaceId !== null) {
            return spaceId._id || '';
        }
        return spaceId;
    };

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
        } catch (error) {
            console.error('Fetch error:', error);
            if (isInitial) showToast({ icon: 'error', title: 'Failed to sync staff' });
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const handleParamsChange = useCallback((params) => {
        setCurrentParams(params);
        fetchData(params);
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

    const handleSave = async (submitData) => {
        try {
            if (isEditMode) {
                await apiPut(`/space/staff/${selectedMember._id}`, submitData);
                showToast({ icon: 'success', title: 'Staff updated & transferred' });
            } else {
                await apiPost(`/space/staff`, submitData);
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

    const getBranchName = (spaceId) => {
        if (!spaceId) return 'Not Assigned';

        // If space_id is populated (object with name from populate)
        if (typeof spaceId === 'object' && spaceId !== null) {
            return spaceId.name || 'Unknown Branch';
        }

        // If space_id is just an ID string
        const space = spaces.find(s => s._id === spaceId);
        return space ? space.name : 'Unknown Branch';
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
            header: "Branch",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Building size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        {getBranchName(row.space_id)}
                    </span>
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
                <div className="relative group">
                    <button
                        onClick={() => toggleStatus(row._id)}
                        className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all cursor-pointer",
                            "hover:shadow-md active:scale-95",
                            row.isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30 hover:bg-slate-500/30'
                        )}
                    >
                        <div className="flex items-center gap-1.5">
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                row.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                            )} />
                            {row.isActive ? 'Active' : 'Revoked'}
                        </div>
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-slate-800 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Click to {row.isActive ? 'revoke' : 'activate'} access
                    </div>
                </div>
            )
        },
        {
            header: "Actions",
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => {
                            // Extract the space_id properly
                            const spaceIdValue = extractSpaceId(row.space_id);
                            setSelectedMember({
                                _id: row._id,
                                name: row.name,
                                email: row.email,
                                space_id: spaceIdValue
                            });
                            setIsEditMode(true);
                            setOpenModal(true);
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white hover:text-black transition-all"
                    >
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
                    onClick={() => {
                        setSelectedMember({
                            name: '',
                            email: '',
                            space_id: '',
                            password: ''
                        });
                        setIsEditMode(false);
                        setOpenModal(true);
                    }}
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
                renderMobileCard={(member) => {
                    const spaceIdValue = extractSpaceId(member.space_id);
                    return (
                        <div key={member._id} className="bg-[#111114] border border-white/5 p-5 rounded-[2.5rem] space-y-4 shadow-xl">
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

                            <div className="flex items-center gap-2">
                                <Building size={12} className="text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                    {getBranchName(member.space_id)}
                                </span>
                            </div>

                            <div className="h-px w-full bg-white/5" />

                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => toggleStatus(member._id)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all",
                                        member.isActive
                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                            : 'bg-slate-500/10 text-slate-500 border border-white/5'
                                    )}
                                >
                                    {member.isActive ? 'Active' : 'Revoked'}
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedMember({
                                                _id: member._id,
                                                name: member.name,
                                                email: member.email,
                                                space_id: spaceIdValue
                                            });
                                            setIsEditMode(true);
                                            setOpenModal(true);
                                        }}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white hover:text-black active:scale-90 transition-all border border-white/5"
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(member._id)}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white active:scale-90 transition-all border border-rose-500/10"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                }}
            />

            {/* Reusable Branch Modal */}
            <BranchModal
                isOpen={openModal}
                onClose={() => setOpenModal(false)}
                staffMember={selectedMember}
                onSave={handleSave}
                isEditMode={isEditMode}
                spaces={spaces}
                loadingSpaces={loadingSpaces}
            />
        </div>
    );
};

export default StaffManagement;