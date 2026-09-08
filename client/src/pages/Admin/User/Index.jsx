import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost, apiDelete, apiPut } from '@/utils/Api';
import {
    Trash2, Edit3, Users, CheckCircle, XCircle, User, Building2,
    Eye, FileText, Search, Filter, Mail, Phone, Calendar,
    Award, Shield, Clock, Star, Sparkles, TrendingUp,
    MoreVertical, Download, Printer, RefreshCw
} from 'lucide-react';
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
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [showBulkActions, setShowBulkActions] = useState(false);

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
        }, 5000);
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
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            background: 'var(--card)',
            color: 'var(--foreground)',
            customClass: {
                popup: 'rounded-[2.5rem] border border-border shadow-2xl',
                confirmButton: 'rounded-xl bg-rose-500 hover:bg-rose-600 font-black uppercase text-[10px] tracking-widest px-6 py-2.5',
                cancelButton: 'rounded-xl bg-muted hover:bg-muted/80 font-black uppercase text-[10px] tracking-widest px-6 py-2.5 text-muted-foreground'
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

    const getStatusBadge = (isActive) => {
        return (
            <span className={cn(
                "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5",
                isActive
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10'
            )}>
                <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isActive ? 'bg-emerald-500' : 'bg-rose-500'
                )} />
                {isActive ? 'Active' : 'Inactive'}
            </span>
        );
    };

    const getRoleBadge = (role) => {
        return (
            <span className={cn(
                "px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-tighter",
                role === 'space'
                    ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                    : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20'
            )}>
                {role === 'space' ? 'Provider' : 'User'}
            </span>
        );
    };

    const columns = [
        {
            header: "User",
            cell: (owner) => (
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-black text-primary-foreground text-lg italic border border-primary/10">
                            {owner.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1">
                            {getRoleBadge(owner.role)}
                        </div>
                    </div>
                    <div>
                        <p className="font-bold text-foreground text-sm leading-tight">{owner.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Mail size={10} className="text-muted-foreground" />
                            <p className="text-[10px] text-muted-foreground font-medium">{owner.email}</p>
                        </div>
                        {owner.phone && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <Phone size={8} className="text-muted-foreground" />
                                <p className="text-[8px] text-muted-foreground">{owner.phone}</p>
                            </div>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: "Status",
            cell: (owner) => (
                <button
                    onClick={() => toggleStatus(owner._id)}
                    className="hover:opacity-80 transition-opacity"
                >
                    {getStatusBadge(owner.isActive)}
                </button>
            )
        },
        {
            header: "Joined",
            cell: (owner) => (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Calendar size={12} />
                    {owner.createdAt ? (
                        new Date(owner.createdAt).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })
                    ) : (
                        <span className="text-rose-500">Invalid Date</span>
                    )}
                </div>
            )
        },
        ...(userRole === 'space' ? [{
            header: "Documents",
            cell: (owner) => (
                <div className="flex flex-wrap gap-1.5">
                    {owner.business_permit && (
                        <button
                            onClick={() => viewDocument(getDocumentUrl(owner, owner.business_permit), 'Business Permit')}
                            className="flex items-center gap-1 px-2.5 py-1 bg-muted rounded-lg text-[8px] text-primary hover:bg-primary/20 transition-all font-bold uppercase tracking-tighter"
                        >
                            <FileText size={10} /> Permit
                        </button>
                    )}
                    {owner.dti_sec_reg && (
                        <button
                            onClick={() => viewDocument(getDocumentUrl(owner, owner.dti_sec_reg), 'DTI/SEC Registration')}
                            className="flex items-center gap-1 px-2.5 py-1 bg-muted rounded-lg text-[8px] text-primary hover:bg-primary/20 transition-all font-bold uppercase tracking-tighter"
                        >
                            <FileText size={10} /> DTI/SEC
                        </button>
                    )}
                    {!owner.business_permit && !owner.dti_sec_reg && (
                        <span className="text-muted-foreground text-[9px]">—</span>
                    )}
                </div>
            )
        }] : []),
        {
            header: "Actions",
            cell: (owner) => (
                <div className="flex justify-end gap-1.5">
                    <button
                        onClick={() => { setSelectedOwner(owner); setOpenModal(true); }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all group"
                        title="Edit User"
                    >
                        <Edit3 size={14} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                        onClick={() => handleDelete(owner._id)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all group"
                        title="Delete User"
                    >
                        <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            )
        }
    ];

    const color = getThemeColorClass();

    // Quick Stats Cards with icons
    const statCards = [
        {
            title: `Total ${userRole === 'user' ? 'Users' : 'Providers'}`,
            value: formatNumber(stats.total),
            icon: Users,
            color: 'primary',
            bg: 'bg-primary/5',
            border: 'border-primary/10'
        },
        {
            title: 'Active Accounts',
            value: formatNumber(stats.active),
            icon: CheckCircle,
            color: 'emerald',
            bg: 'bg-emerald-500/5',
            border: 'border-emerald-500/10'
        },
        {
            title: 'Inactive',
            value: formatNumber(stats.inactive),
            icon: XCircle,
            color: 'rose',
            bg: 'bg-rose-500/5',
            border: 'border-rose-500/10'
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-foreground tracking-tight uppercase italic flex items-center gap-3">
                        <Users size={24} className="text-primary" />
                        User Management
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest">
                        Manage platform users and space providers with ease.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { fetchData({ ...paramsRef.current, role: userRole }, true); }}
                        className="p-2.5 bg-muted rounded-xl border border-border hover:bg-muted/80 transition-all active:scale-95"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className="text-muted-foreground" />
                    </button>
                    <div className="flex bg-muted border border-border rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Users size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Filter size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between mb-6">
                <Tabs value={userRole} onValueChange={setUserRole} className="w-auto">
                    <TabsList className="bg-card border border-border rounded-3xl p-1.5 shadow-sm">
                        <TabsTrigger
                            value="user"
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg",
                                "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <User size={12} className="mr-2" /> Users
                        </TabsTrigger>
                        <TabsTrigger
                            value="space"
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg",
                                "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Building2 size={12} className="mr-2" /> Space Providers
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-2 text-[8px] text-muted-foreground">
                    <span className="font-black uppercase tracking-wider">Total:</span>
                    <span className="font-black text-foreground">{formatNumber(stats.total)}</span>
                    <span className="w-px h-4 bg-border mx-2" />
                    <span className="font-black uppercase tracking-wider text-emerald-500">Active:</span>
                    <span className="font-black text-emerald-500">{formatNumber(stats.active)}</span>
                </div>
            </div>

            {/* STATISTICS GRID - Upgraded */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {statCards.map((stat, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "bg-card border p-6 rounded-[2.5rem] flex items-center gap-4 shadow-lg transition-all hover:shadow-xl hover:border-primary/20",
                            stat.bg,
                            stat.border
                        )}
                    >
                        <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all",
                            stat.bg,
                            stat.border
                        )}>
                            <stat.icon size={24} className={cn(
                                stat.color === 'primary' && 'text-primary',
                                stat.color === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
                                stat.color === 'rose' && 'text-rose-600 dark:text-rose-400'
                            )} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">{stat.title}</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-black text-foreground italic">{stat.value}</p>
                                {stat.color === 'emerald' && (
                                    <TrendingUp size={14} className="text-emerald-500" />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={owners}
                loading={loading}
                totalCount={totalCount}
                onParamsChange={handleParamsChange}
                renderMobileCard={(owner) => (
                    <div key={owner._id} className="bg-card border-border p-5 rounded-[2.5rem] space-y-4 shadow-lg hover:shadow-xl transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-black text-primary-foreground text-xl italic border border-primary/10">
                                    {owner.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-foreground leading-tight">{owner.name}</h3>
                                    <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                        <Mail size={10} /> {owner.email}
                                    </p>
                                    {owner.phone && (
                                        <p className="text-[8px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <Phone size={8} /> {owner.phone}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {getStatusBadge(owner.isActive)}
                        </div>

                        <div className="flex items-center gap-2">
                            {getRoleBadge(owner.role)}
                            <span className="text-[8px] text-muted-foreground flex items-center gap-1">
                                <Calendar size={10} />
                                Joined {owner.createdAt ? new Date(owner.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>

                        {owner.role === 'space' && (owner.business_permit || owner.dti_sec_reg) && (
                            <div className="flex gap-2 pt-2 border-t border-border">
                                {owner.business_permit && (
                                    <button
                                        onClick={() => viewDocument(getDocumentUrl(owner, owner.business_permit), 'Business Permit')}
                                        className="flex items-center gap-1 text-[8px] text-primary hover:text-primary/80 transition-colors bg-primary/5 px-2.5 py-1.5 rounded-lg"
                                    >
                                        <FileText size={10} /> Permit
                                    </button>
                                )}
                                {owner.dti_sec_reg && (
                                    <button
                                        onClick={() => viewDocument(getDocumentUrl(owner, owner.dti_sec_reg), 'DTI/SEC')}
                                        className="flex items-center gap-1 text-[8px] text-primary hover:text-primary/80 transition-colors bg-primary/5 px-2.5 py-1.5 rounded-lg"
                                    >
                                        <FileText size={10} /> DTI/SEC
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-border">
                            <button
                                onClick={() => { setSelectedOwner(owner); setOpenModal(true); }}
                                className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
                                title="Edit"
                            >
                                <Edit3 size={14} />
                            </button>
                            <button
                                onClick={() => handleDelete(owner._id)}
                                className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                                title="Delete"
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