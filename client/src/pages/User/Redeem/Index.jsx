import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';
import { 
    Ticket, Gift, Coins, Loader2, 
    Clock, Zap, Sparkles, TrendingUp, Award, CheckCircle2, MapPin, Globe, QrCode
} from 'lucide-react';
import { cn } from "@/lib/utils";

// ============================================
// REUSABLE COMPONENTS
// ============================================

const StatCard = ({ label, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white border border-slate-100 p-4 sm:p-6 rounded-2xl sm:rounded-4xl">
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
                <p className={cn("text-xl sm:text-2xl font-[1000] italic mt-1", color)}>{value}</p>
                {subtitle && <p className="text-[7px] sm:text-[8px] text-slate-400 mt-1">{subtitle}</p>}
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-slate-400" />
            </div>
        </div>
    </div>
);

const PointsCard = ({ points }) => (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:p-6 rounded-2xl sm:rounded-4xl border border-amber-100">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Coins size={20} className="text-amber-600" />
            </div>
            <div>
                <p className="text-[8px] sm:text-[9px] font-black uppercase text-amber-600">Your Points</p>
                <p className="text-2xl sm:text-3xl font-[1000] italic text-amber-700">{points}</p>
                <p className="text-[7px] sm:text-[8px] text-amber-500">= ₱{points} value</p>
            </div>
        </div>
    </div>
);

const EmptyState = ({ icon: Icon, title, message }) => (
    <div className="py-16 sm:py-24 text-center border-2 border-dashed border-slate-200 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-50 to-white">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Icon size={28} className="text-slate-300" />
        </div>
        <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400">{title}</p>
        <p className="text-[8px] sm:text-[9px] text-slate-400 mt-2">{message}</p>
    </div>
);

const LoadingSpinner = () => (
    <div className="py-20 sm:py-32 flex flex-col items-center justify-center gap-4">
        <div className="relative">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-3 sm:border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
            <Gift size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
        </div>
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] italic">Loading rewards...</p>
    </div>
);

// ============================================
// VOUCHER CARDS
// ============================================

const VoucherCard = ({ voucher, userPoints, onRedeem, isRedeeming, minPointsToRedeem }) => {
    const isExpired = new Date(voucher.expiry_date) < new Date();
    const alreadyRedeemed = voucher.already_redeemed;
    const canAfford = userPoints >= voucher.points_required && userPoints >= minPointsToRedeem;
    const canRedeem = canAfford && !alreadyRedeemed && !isExpired;
    const isGlobal = voucher.type === 'global';
    const pointsNeeded = voucher.points_required - userPoints;
    const progressPercent = Math.min(100, (userPoints / voucher.points_required) * 100);

    return (
        <div className={cn(
            "bg-white border rounded-2xl sm:rounded-4xl p-4 sm:p-6 transition-all group flex flex-col h-full",
            canRedeem
                ? "border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5"
                : "opacity-60 border-slate-100"
        )}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Gift size={18} className="text-white" />
                </div>

                <div className="flex flex-wrap gap-1 justify-end">
                    {alreadyRedeemed && (
                        <div className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[7px] sm:text-[8px] font-black uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                            <CheckCircle2 size={8} />
                            You Own This
                        </div>
                    )}
                    {!alreadyRedeemed && !isExpired && canAfford && (
                        <div className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[7px] sm:text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                            Available
                        </div>
                    )}
                    {!alreadyRedeemed && !isExpired && !canAfford && (
                        <div className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-[7px] sm:text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                            Need {pointsNeeded} more
                        </div>
                    )}
                    {isExpired && (
                        <div className="px-2 py-1 rounded-full bg-red-50 text-red-500 text-[7px] sm:text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                            Expired
                        </div>
                    )}
                </div>
            </div>

            {/* Discount */}
            <div className="mb-3">
                <h3 className="font-[1000] uppercase text-lg sm:text-xl tracking-tight text-slate-900">
                    ₱{voucher.discount_amount} OFF
                </h3>
                <p className="text-[8px] sm:text-[9px] text-slate-400 mt-1">
                    Redeem for {voucher.points_required} points
                </p>
            </div>

            {/* Progress Bar (Mobile friendly) */}
            {!isExpired && !canRedeem && userPoints > 0 && (
                <div className="mb-4">
                    <div className="flex justify-between text-[7px] sm:text-[8px] text-slate-500 mb-1">
                        <span className="font-black uppercase">Progress</span>
                        <span className="font-bold">{userPoints}/{voucher.points_required} pts</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Scope badge */}
            <div className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-xl mb-4 w-fit",
                isGlobal ? "bg-violet-50" : "bg-blue-50"
            )}>
                {isGlobal ? (
                    <Globe size={10} className="text-violet-500 shrink-0" />
                ) : (
                    <MapPin size={10} className="text-blue-500 shrink-0" />
                )}
                <span className={cn(
                    "text-[8px] sm:text-[9px] font-black uppercase tracking-wide truncate",
                    isGlobal ? "text-violet-600" : "text-blue-600"
                )}>
                    {isGlobal ? 'All spaces' : (voucher.space?.name || 'All spaces')}
                </span>
            </div>

            {/* Details Grid - Mobile optimized */}
            <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2">
                        <Coins size={10} className="text-amber-500" />
                        <span className="text-[7px] sm:text-[8px] font-black uppercase">Points</span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-bold text-amber-600">{voucher.points_required} pts</span>
                </div>
                {voucher.min_spend > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={10} className="text-slate-400" />
                            <span className="text-[7px] sm:text-[8px] font-black uppercase">Min Spend</span>
                        </div>
                        <span className="text-[8px] sm:text-[9px] font-bold">₱{voucher.min_spend}</span>
                    </div>
                )}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2">
                        <Clock size={10} className="text-slate-400" />
                        <span className="text-[7px] sm:text-[8px] font-black uppercase">Expires</span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-bold">
                        {new Date(voucher.expiry_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Button */}
            <button
                onClick={() => onRedeem(voucher)}
                disabled={!canRedeem || isRedeeming}
                className={cn(
                    "mt-auto w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    canRedeem
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg active:scale-95"
                        : alreadyRedeemed
                            ? "bg-indigo-50 text-indigo-400 cursor-not-allowed"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
            >
                {isRedeeming ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : alreadyRedeemed ? (
                    <><CheckCircle2 size={12} /> Owned</>
                ) : (
                    <><Ticket size={12} /> {canRedeem ? 'Redeem' : 'Locked'}</>
                )}
            </button>
        </div>
    );
};

const MyVoucherCard = ({ voucher }) => {
    const isGlobal = voucher.type === 'global';
    const isExpiringSoon = new Date(voucher.expires) - new Date() < 7 * 24 * 60 * 60 * 1000;
    const expiresToday = new Date(voucher.expires).toDateString() === new Date().toDateString();
    
    return (
        <div className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
            {/* Gradient Border */}
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl",
                isGlobal ? "bg-gradient-to-r from-violet-500 to-purple-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"
            )} style={{ padding: '2px', mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
            
            <div className="relative bg-white rounded-2xl p-4 sm:p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-4 gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                            "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0",
                            isGlobal ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"
                        )}>
                            {isGlobal ? <Globe size={14} className="text-white" /> : <MapPin size={14} className="text-white" />}
                        </div>
                        <div className="min-w-0">
                            <p className={cn("text-[7px] sm:text-[8px] font-black uppercase tracking-wider", isGlobal ? "text-violet-600" : "text-emerald-600")}>
                                {isGlobal ? 'Global' : 'Space Specific'}
                            </p>
                            <p className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-700 mt-0.5 truncate max-w-[120px] sm:max-w-none">
                                {voucher.code}
                            </p>
                        </div>
                    </div>
                    
                    {/* Expiry Badge */}
                    {expiresToday ? (
                        <div className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg bg-red-100 shrink-0">
                            <p className="text-[7px] sm:text-[8px] font-black text-red-600 uppercase whitespace-nowrap">Expires Today!</p>
                        </div>
                    ) : isExpiringSoon ? (
                        <div className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg bg-amber-100 shrink-0">
                            <p className="text-[7px] sm:text-[8px] font-black text-amber-600 uppercase whitespace-nowrap">Expiring Soon</p>
                        </div>
                    ) : (
                        <div className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg bg-emerald-100 shrink-0">
                            <p className="text-[7px] sm:text-[8px] font-black text-emerald-600 uppercase whitespace-nowrap">Active</p>
                        </div>
                    )}
                </div>

                {/* Discount */}
                <div className="text-center mb-4">
                    <p className="text-[8px] sm:text-[10px] text-slate-400 font-black uppercase tracking-wider">Discount</p>
                    <p className={cn("text-3xl sm:text-4xl font-[1000] italic tracking-tighter", isGlobal ? "text-violet-600" : "text-emerald-600")}>
                        ₱{voucher.discount_amount}
                    </p>
                    <p className="text-[7px] sm:text-[8px] text-slate-400">off per booking</p>
                </div>

                {/* Usage Counter */}
                <div className="flex items-center justify-between mb-3 p-2 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-1.5">
                        <Ticket size={10} className="text-slate-400" />
                        <span className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase">Remaining</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className={cn("text-sm sm:text-base font-[1000]", voucher.remaining_uses > 0 ? "text-emerald-600" : "text-red-500")}>
                            {voucher.remaining_uses}
                        </span>
                        <span className="text-[7px] sm:text-[8px] text-slate-400">/ {voucher.remaining_uses + (voucher.used_count || 0)}</span>
                    </div>
                </div>

                {/* Location */}
                <div className={cn("flex items-center gap-2 p-2 rounded-xl mb-3", isGlobal ? "bg-violet-50" : "bg-emerald-50")}>
                    {isGlobal ? <Globe size={10} className="text-violet-500 shrink-0" /> : <MapPin size={10} className="text-emerald-500 shrink-0" />}
                    <span className={cn("text-[8px] sm:text-[9px] font-black uppercase truncate", isGlobal ? "text-violet-700" : "text-emerald-700")}>
                        {isGlobal ? 'All spaces' : (voucher.space?.name || 'All spaces')}
                    </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 mb-4">
                    {voucher.min_spend > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-[7px] sm:text-[8px] text-slate-500 font-black uppercase">Min Spend</span>
                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-700">₱{voucher.min_spend}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-[7px] sm:text-[8px] text-slate-500 font-black uppercase">Expires</span>
                        <div className="flex items-center gap-1">
                            <Clock size={8} className={isExpiringSoon ? "text-amber-500" : "text-slate-400"} />
                            <span className={cn("text-[8px] sm:text-[9px] font-bold", isExpiringSoon ? "text-amber-600" : "text-slate-600")}>
                                {new Date(voucher.expires).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-dashed border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <div className="px-2 bg-white">
                            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center">
                    <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl", isGlobal ? "bg-violet-50" : "bg-emerald-50")}>
                        <QrCode size={10} className={isGlobal ? "text-violet-600" : "text-emerald-600"} />
                        <span className={cn("text-[7px] sm:text-[8px] font-black uppercase tracking-wider", isGlobal ? "text-violet-700" : "text-emerald-700")}>
                            Show to staff
                        </span>
                    </div>
                </div>

                {/* Decoration */}
                <div className="absolute top-3 right-3 opacity-10">
                    <Ticket size={32} className={isGlobal ? "text-violet-600" : "text-emerald-600"} />
                </div>
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const UserRedeem = () => {
    const [vouchers, setVouchers] = useState([]);
    const [myVouchers, setMyVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userPoints, setUserPoints] = useState(0);
    const [redeemingId, setRedeemingId] = useState(null);
    const [minPointsToRedeem, setMinPointsToRedeem] = useState(50);
    const [stats, setStats] = useState({ total_earned: 0, total_redeemed: 0, available_points: 0 });

    const fetchVouchers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiGet('/user/vouchers');
            setVouchers(res.data?.vouchers || []);
            setMyVouchers(res.data?.my_vouchers || []);
            setUserPoints(res.data?.user_points || 0);
            setMinPointsToRedeem(res.data?.stats?.min_points_to_redeem || 50);
            setStats({
                total_earned: res.data?.stats?.total_earned || 0,
                total_redeemed: res.data?.stats?.total_redeemed || 0,
                available_points: res.data?.user_points || 0
            });
        } catch (err) {
            console.error(err);
            showToast({ icon: 'error', title: 'Failed to fetch vouchers' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

    const handleRedeem = async (voucher) => {
        setRedeemingId(voucher._id);
        try {
            const res = await apiPost('/user/vouchers/redeem', { voucher_id: voucher._id });
            if (res.success) {
                showToast({
                    icon: 'success',
                    title: 'Voucher Redeemed!',
                    text: `You got ₱${voucher.discount_amount} off! Code: ${res.data.voucher?.code}`
                });
                fetchVouchers();
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Failed to redeem voucher' });
        } finally {
            setRedeemingId(null);
        }
    };

    const nextVoucherPoints = Math.max(0, minPointsToRedeem - userPoints);
    const canRedeemAny = userPoints >= minPointsToRedeem;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 sm:pb-24 selection:bg-indigo-100">
            {/* Header Section */}
            <section className="pt-6 sm:pt-8 pb-8 sm:pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8">
                    <div className="relative">
                        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 sm:mb-6 rounded-full bg-indigo-50 border border-indigo-100">
                            <Sparkles size={10} className="text-indigo-600" />
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-600">Rewards Center</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[1000] italic tracking-tighter uppercase leading-[0.85] mb-3 sm:mb-4 text-slate-900">
                            Redeem <br /><span className="text-indigo-600">Points.</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md">
                            Exchange your hard-earned points for discount vouchers
                        </p>
                    </div>
                    <PointsCard points={userPoints} />
                </div>
            </section>

            {/* Stats Grid */}
            <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-6 sm:mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <StatCard label="Points Earned" value={stats.total_earned} icon={Award} color="text-indigo-600" subtitle="lifetime points" />
                    <StatCard label="Vouchers Redeemed" value={stats.total_redeemed} icon={Ticket} color="text-emerald-600" subtitle="total vouchers" />
                    <StatCard label="Available Points" value={stats.available_points} icon={Coins} color="text-amber-600" subtitle={`worth ₱${stats.available_points}`} />
                </div>
            </section>

            {/* Info Banner */}
            {!canRedeemAny && userPoints > 0 && (
                <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-6 sm:mb-8">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl sm:rounded-4xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                <Zap size={14} className="text-indigo-600" />
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-[8px] sm:text-[9px] font-black uppercase text-indigo-600">Need {nextVoucherPoints} more points</p>
                                <p className="text-[9px] sm:text-[10px] text-slate-600">Book more sessions to earn points!</p>
                            </div>
                        </div>
                        <div className="text-center sm:text-right">
                            <p className="text-[7px] sm:text-[8px] text-slate-500">Minimum {minPointsToRedeem} points to redeem</p>
                            <p className="text-[7px] sm:text-[8px] font-bold text-indigo-600">1 point = ₱1 value</p>
                        </div>
                    </div>
                </section>
            )}

            {userPoints === 0 && (
                <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-6 sm:mb-8">
                    <div className="bg-slate-100 border border-slate-200 rounded-2xl sm:rounded-4xl p-4 sm:p-5 text-center">
                        <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500">No points yet</p>
                        <p className="text-[7px] sm:text-[8px] text-slate-400 mt-1">Start booking spaces to earn points!</p>
                    </div>
                </section>
            )}

            {/* Available Vouchers Section */}
            <section className="px-4 sm:px-6 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-8 gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-2 sm:mb-3">
                            <Sparkles size={8} className="text-indigo-600" />
                            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-indigo-600">Rewards Store</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black uppercase italic text-slate-900 tracking-tight">
                            Available Vouchers
                        </h2>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1">
                            Exchange your hard-earned points for exclusive discounts
                        </p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-indigo-100 shrink-0">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <Coins size={12} className="text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[6px] sm:text-[7px] font-black uppercase text-indigo-600">Exchange Rate</p>
                                <p className="text-[9px] sm:text-[11px] font-black text-indigo-700">1 point = ₱1 value</p>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <LoadingSpinner />
                ) : vouchers.length === 0 ? (
                    <EmptyState icon={Gift} title="No vouchers available" message="Check back later for new rewards!" />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {vouchers.map((voucher) => (
                            <VoucherCard
                                key={voucher._id}
                                voucher={voucher}
                                userPoints={userPoints}
                                onRedeem={handleRedeem}
                                isRedeeming={redeemingId === voucher._id}
                                minPointsToRedeem={minPointsToRedeem}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* My Vouchers Section */}
            {myVouchers.length > 0 && (
                <section className="px-4 sm:px-6 max-w-7xl mx-auto mt-10 sm:mt-12">
                    <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2">
                        <h2 className="text-xl sm:text-2xl font-black uppercase italic text-slate-900 tracking-tight">
                            My Vouchers
                        </h2>
                        <div className="px-2 py-1 rounded-full bg-emerald-100">
                            <p className="text-[8px] sm:text-[9px] font-black text-emerald-700">
                                {myVouchers.length} voucher{myVouchers.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {myVouchers.map((voucher) => (
                            <MyVoucherCard key={voucher._id} voucher={voucher} />
                        ))}
                    </div>
                </section>
            )}

            {/* How It Works */}
            <section className="px-4 sm:px-6 max-w-7xl mx-auto mt-12 sm:mt-16">
                <div className="bg-white rounded-2xl sm:rounded-4xl border border-slate-100 p-5 sm:p-8">
                    <h3 className="font-[1000] uppercase text-sm sm:text-base text-slate-900 mb-4 sm:mb-6">How It Works</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {[
                            { n: 1, title: 'Earn Points', desc: 'Get 1 point for every ₱20 spent on bookings' },
                            { n: 2, title: 'Exchange Points', desc: `Use ${minPointsToRedeem}+ points to get discount vouchers (1 point = ₱1)` },
                            { n: 3, title: 'Use Voucher', desc: 'Apply code at checkout to save on your next booking' }
                        ].map(({ n, title, desc }) => (
                            <div key={n} className="flex items-start gap-3">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs sm:text-sm shrink-0">
                                    {n}
                                </div>
                                <div>
                                    <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-900">{title}</p>
                                    <p className="text-[7px] sm:text-[8px] text-slate-500 mt-1 leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default UserRedeem;