import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';
import { DataTable } from '@/components/ui/DataTable';
import Swal from 'sweetalert2';
import { VoucherModal } from '@/components/modal';
import { 
    Ticket, Plus, XCircle, Loader2, Gift, 
    Calendar, Users, CheckCircle2, Clock, Tag, Trash2, TrendingUp
} from 'lucide-react';
import { cn } from "@/lib/utils";

let globalPollingInstance = null;

const VouchersIndex = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        used: 0,
        active: 0,
        expired: 0
    });

    const paramsRef = useRef(currentParams);
    const lastDataFingerprint = useRef("");

    useEffect(() => {
        paramsRef.current = currentParams;
    }, [currentParams]);

    // --- DATA FETCHING ---
    const fetchVouchers = useCallback(async (params = paramsRef.current, isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const { page, search } = params;
            const res = await apiGet(`/space/vouchers?page=${page}&search=${search}`);
            
            const rowData = res.data?.vouchers || [];
            const total = res.data?.total || 0;
            const fetchedStats = res.data?.stats || { total: 0, used: 0, active: 0, expired: 0 };

            const currentFingerprint = JSON.stringify({ rowData, total, fetchedStats });

            if (currentFingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = currentFingerprint;
                setVouchers(Array.isArray(rowData) ? rowData : []);
                setTotalCount(total);
                setStats(fetchedStats);
            }
        } catch (err) {
            if (isInitial) {
                console.error(err);
                showToast({ icon: 'error', title: 'Failed to fetch vouchers' });
            }
        } finally {
            if (isInitial) setLoading(false);
        }
    }, []);

    const handleParamsChange = useCallback((params) => {
        setCurrentParams(params);
        fetchVouchers(params);
    }, [fetchVouchers]);

    // --- HEARTBEAT POLLING ---
    useEffect(() => {
        if (globalPollingInstance) clearInterval(globalPollingInstance);
        fetchVouchers(paramsRef.current, true);

        globalPollingInstance = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchVouchers(paramsRef.current, false);
            }
        }, 5000);

        return () => {
            clearInterval(globalPollingInstance);
            globalPollingInstance = null;
        };
    }, [fetchVouchers]);

    const handleCreateVoucher = async (formData) => {
        setIsSubmitting(true);
        try {
            const res = await apiPost('/space/vouchers', {
                code: formData.code,
                discount_amount: formData.discount_amount,
                expiry_days: formData.expiry_days,
                usage_limit: formData.usage_limit || null,
                redemption_limit: formData.redemption_limit || null,
                max_uses_per_user: formData.max_uses_per_user || 1,
                min_spend: formData.min_spend || 0
            });

            if (res.success) {
                showToast({ icon: 'success', title: 'Voucher created successfully!' });
                setShowModal(false);
                fetchVouchers(paramsRef.current, false);
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Failed to create voucher' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteVoucher = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Voucher?',
            text: "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
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
                await apiPost(`/space/vouchers/${id}/delete`);
                showToast({ icon: 'success', title: 'Voucher deleted' });
                fetchVouchers(paramsRef.current, false);
            } catch (err) {
                showToast({ icon: 'error', title: 'Failed to delete voucher' });
            }
        }
    };

    const columns = [
        {
            header: "Code",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Ticket size={14} className="text-indigo-400" />
                    </div>
                    <span className="font-mono font-black text-sm text-white">{row.code}</span>
                </div>
            )
        },
        {
            header: "Discount",
            cell: (row) => (
                <div className="text-left">
                    <span className="text-emerald-400 font-[1000] text-lg">₱{row.discount_amount}</span>
                    <p className="text-[8px] text-slate-500 uppercase">off per booking</p>
                </div>
            )
        },
        {
            header: "Redemptions",
            cell: (row) => (
                <div className="text-left">
                    <span className="text-white font-black">
                        {row.redemption_count || 0}
                    </span>
                    <span className="text-slate-500 text-xs">
                        {row.redemption_limit ? ` / ${row.redemption_limit}` : ' / ∞'}
                    </span>
                </div>
            )
        },
        {
            header: "Per User",
            cell: (row) => (
                <div className="text-left">
                    <span className="text-slate-300 text-xs">
                        {row.max_uses_per_user || 1} use(s)
                    </span>
                </div>
            )
        },
        {
            header: "Status",
            cell: (row) => {
                const isExpired = new Date(row.expiry_date) < new Date();
                const isFull = row.redemption_limit && row.redemption_count >= row.redemption_limit;
                let status = 'active';
                let color = 'text-emerald-400 bg-emerald-500/10';
                
                if (isExpired) {
                    status = 'expired';
                    color = 'text-red-400 bg-red-500/10';
                } else if (isFull) {
                    status = 'fully redeemed';
                    color = 'text-slate-500 bg-slate-500/10';
                }
                
                return (
                    <div className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase", color)}>
                        {status}
                    </div>
                );
            }
        },
        {
            header: "Expires",
            cell: (row) => (
                <div className="text-left">
                    <span className="text-slate-300 text-xs">
                        {new Date(row.expiry_date).toLocaleDateString()}
                    </span>
                </div>
            )
        },
        {
            header: "Actions",
            cell: (row) => (
                <button
                    onClick={() => handleDeleteVoucher(row._id)}
                    className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                >
                    <Trash2 size={14} />
                </button>
            )
        }
    ];

    const StatCard = ({ label, value, icon: Icon, color }) => (
        <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem]">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
                    <p className={cn("text-2xl font-[1000] italic mt-1", color)}>{value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Icon size={18} className="text-slate-400" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Vouchers</h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest italic">
                        Create discount vouchers for users to redeem with points
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl hover:bg-indigo-600 hover:text-white active:scale-95"
                >
                    <Plus size={14} /> Create Voucher
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Vouchers" value={stats.total} icon={Ticket} color="text-indigo-400" />
                <StatCard label="Active" value={stats.active} icon={CheckCircle2} color="text-emerald-400" />
                <StatCard label="Fully Redeemed" value={stats.used} icon={Users} color="text-amber-400" />
                <StatCard label="Expired" value={stats.expired} icon={Clock} color="text-red-400" />
            </div>

            {/* Vouchers Table */}
            <DataTable
                columns={columns}
                data={vouchers}
                loading={loading}
                totalCount={totalCount}
                onParamsChange={handleParamsChange}
                renderMobileCard={(voucher) => (
                    <div key={voucher._id} className="bg-[#111114] border border-white/5 p-5 rounded-[2.5rem] space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                    <Ticket size={16} className="text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white font-mono">{voucher.code}</h3>
                                    <p className="text-[10px] font-bold text-emerald-400">₱{voucher.discount_amount} OFF</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDeleteVoucher(voucher._id)}
                                className="p-2 bg-red-500/10 text-red-400 rounded-lg"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500">
                            <span>Redeemed: {voucher.redemption_count || 0}{voucher.redemption_limit ? `/${voucher.redemption_limit}` : '/∞'}</span>
                            <span>Per user: {voucher.max_uses_per_user} use(s)</span>
                            <span>Expires: {new Date(voucher.expiry_date).toLocaleDateString()}</span>
                        </div>
                    </div>
                )}
            />

            {/* Voucher Modal */}
            <VoucherModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleCreateVoucher}
                isSubmitting={isSubmitting}
            />
        </div>
    );
};

export default VouchersIndex;