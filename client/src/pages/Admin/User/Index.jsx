import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost, apiDelete, apiPut } from '@/utils/Api';
import { Trash2, Edit3, Users, CheckCircle, XCircle, User, Building2, Eye, FileText } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import Swal from 'sweetalert2';
import { DataTable } from '@/components/ui/DataTable';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from "@/lib/utils";
import { formatNumber } from '@/utils/formatNumber';
import { DocumentPreviewModal, EditUserModal } from '@/components/modal';
import { useTheme } from '@/hooks/useTheme';

let globalPollingInstance = null;

const UserManagement = () => {
    const { themeColor } = useTheme();
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
        if (!fileName) return null;
        if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
            return fileName;
        }
        const folderId = owner.space_request_id || owner._id;
        return `${import.meta.env.VITE_API_URL}/uploads/requirements/${folderId}/${fileName}`;
    };

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
            background: 'var(--card)',
            color: 'var(--foreground)',
            customClass: {
                popup: 'rounded-[2.5rem] border border-border shadow-2xl',
                confirmButton: 'rounded-xl bg-rose-500 font-black uppercase text-[10px] tracking-widest',
                cancelButton: 'rounded-xl bg-muted font-black uppercase text-[10px] tracking-widest text-muted-foreground'
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

    const handleSave = async (formData) => {
        if (!selectedOwner?._id) return;
        try {
            await apiPut(`/admin/users/${selectedOwner._id}`, formData);
            showToast({ icon: 'success', title: 'User updated successfully' });
            setOpenModal(false);
            fetchData({ ...paramsRef.current, role: userRole });
        } catch (error) {
            const errorMessage = error.message || 'Update failed';
            if (errorMessage.includes('Email is already registered')) {
                showToast({ 
                    icon: 'error', 
                    title: 'Email Already Exists', 
                    text: 'This email is already used by another account. Please use a different email.'
                });
            } else {
                showToast({ icon: 'error', title: 'Update Failed', text: errorMessage });
            }
        }
    };

    const viewDocument = (docUrl, docName) => {
        setPreviewDoc({ url: docUrl, name: docName });
    };

    const columns = [
        {
            header: "User Details",
            cell: (owner) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center font-black text-primary-foreground text-xs italic shrink-0">
                        {owner.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-foreground leading-none">{owner.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 font-medium">{owner.email}</p>
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
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-muted text-muted-foreground border border-border'
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
                            className="flex items-center gap-1 px-2 py-1 bg-muted rounded-lg text-[9px] text-primary hover:bg-primary/20 transition-all"
                        >
                            <FileText size={12} /> Permit
                        </button>
                    )}
                    {owner.dti_sec_reg && (
                        <button
                            onClick={() => viewDocument(getDocumentUrl(owner, owner.dti_sec_reg), 'DTI/SEC Registration')}
                            className="flex items-center gap-1 px-2 py-1 bg-muted rounded-lg text-[9px] text-primary hover:bg-primary/20 transition-all"
                        >
                            <FileText size={12} /> DTI/SEC
                        </button>
                    )}
                    {!owner.business_permit && !owner.dti_sec_reg && (
                        <span className="text-muted-foreground text-[10px]">—</span>
                    )}
                </div>
            )
        }] : []),
        {
            header: "Actions",
            cell: (owner) => (
                <div className="flex justify-end gap-2">
                    <button onClick={() => { setSelectedOwner(owner); setOpenModal(true); }} className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all">
                        <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(owner._id)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all">
                        <Trash2 size={14} />
                    </button>
                </div>
            )
        }
    ];

    const color = getThemeColorClass();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-foreground tracking-tight uppercase italic">User Management</h1>
                <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest">Manage platform users and space providers.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between mb-6">
                <Tabs value={userRole} onValueChange={setUserRole} className="w-auto">
                    <TabsList className="bg-muted border border-border rounded-3xl p-1.5">
                        <TabsTrigger
                            value="user"
                            className={cn(
                                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg",
                                "text-muted-foreground"
                            )}
                        >
                            <User size={12} className="mr-2" /> Users
                        </TabsTrigger>
                        <TabsTrigger
                            value="space"
                            className={cn(
                                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg",
                                "text-muted-foreground"
                            )}
                        >
                            <Building2 size={12} className="mr-2" /> Space Providers
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* STATISTICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-card border-border p-6 rounded-[2.5rem] flex items-center gap-4 shadow-lg">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Users size={20} className="text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total {userRole === 'user' ? 'Users' : 'Providers'}</p>
                        <p className="text-2xl font-black text-foreground italic">{formatNumber(stats.total)}</p>
                    </div>
                </div>
                <div className="bg-card border-border p-6 rounded-[2.5rem] flex items-center gap-4 shadow-lg">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Accounts</p>
                        <p className="text-2xl font-black text-foreground italic">{formatNumber(stats.active)}</p>
                    </div>
                </div>
                <div className="bg-card border-border p-6 rounded-[2.5rem] flex items-center gap-4 shadow-lg">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                        <XCircle size={20} className="text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Inactive</p>
                        <p className="text-2xl font-black text-foreground italic">{formatNumber(stats.inactive)}</p>
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
                    <div key={owner._id} className="bg-card border-border p-5 rounded-[2.5rem] space-y-4 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center font-black text-primary-foreground italic">
                                    {owner.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-foreground leading-tight">{owner.name}</h3>
                                    <p className="text-[10px] font-bold text-muted-foreground">{owner.email}</p>
                                    {owner.role && (
                                        <p className="text-[8px] text-primary font-black uppercase mt-1">
                                            {owner.role === 'space' ? 'Space Provider' : 'User'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => toggleStatus(owner._id)}
                                className={cn(
                                    "px-2 py-1 rounded-lg text-[8px] font-black uppercase",
                                    owner.isActive
                                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : 'bg-muted text-muted-foreground border border-border'
                                )}
                            >
                                {owner.isActive ? 'Active' : 'Inactive'}
                            </button>
                        </div>

                        {owner.role === 'space' && (owner.business_permit || owner.dti_sec_reg) && (
                            <div className="flex gap-2 pt-2 border-t border-border">
                                {owner.business_permit && (
                                    <button
                                        onClick={() => viewDocument(getDocumentUrl(owner, owner.business_permit), 'Business Permit')}
                                        className="text-[8px] text-primary hover:text-primary/80 transition-colors"
                                    >
                                        📄 View Permit
                                    </button>
                                )}
                                {owner.dti_sec_reg && (
                                    <button
                                        onClick={() => viewDocument(getDocumentUrl(owner, owner.dti_sec_reg), 'DTI/SEC')}
                                        className="text-[8px] text-primary hover:text-primary/80 transition-colors"
                                    >
                                        📄 View DTI/SEC
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-border">
                            <button
                                onClick={() => { setSelectedOwner(owner); setOpenModal(true); }}
                                className="p-2 rounded-xl bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
                            >
                                <Edit3 size={14} />
                            </button>
                            <button
                                onClick={() => handleDelete(owner._id)}
                                className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                )}
            />

            {/* Document Preview Modal */}
            <DocumentPreviewModal
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                docUrl={previewDoc?.url}
                docName={previewDoc?.name}
            />

            {/* Edit User Modal */}
            <EditUserModal
                isOpen={openModal}
                onClose={() => setOpenModal(false)}
                user={selectedOwner}
                onSave={handleSave}
            />
        </div>
    );
};

export default UserManagement;