import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';
import { 
    Ticket, Gift, Coins, Loader2, 
    Clock, Zap, Sparkles, TrendingUp, Award
} from 'lucide-react';
import { cn } from "@/lib/utils";

const VoucherCard = ({ voucher, userPoints, onRedeem, isRedeeming, minPointsToRedeem }) => {
    const canRedeem = userPoints >= voucher.points_required && userPoints >= minPointsToRedeem;
    const isExpired = new Date(voucher.expiry_date) < new Date();
    
    return (
        <div className={cn(
            "bg-white border rounded-4xl p-6 transition-all group",
            canRedeem && !isExpired
                ? "border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5"
                : "opacity-60 border-slate-100"
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Gift size={22} className="text-white" />
                </div>
                {!isExpired && canRedeem && (
                    <div className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest">
                        Available
                    </div>
                )}
                {!isExpired && !canRedeem && (
                    <div className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-[8px] font-black uppercase tracking-widest">
                        Need {voucher.points_required - userPoints} more
                    </div>
                )}
                {isExpired && (
                    <div className="px-2 py-1 rounded-full bg-red-50 text-red-500 text-[8px] font-black uppercase tracking-widest">
                        Expired
                    </div>
                )}
            </div>

            <div className="mb-4">
                <h3 className="font-[1000] uppercase text-lg tracking-tight text-slate-900">
                    ₱{voucher.discount_amount} OFF
                </h3>
                <p className="text-[9px] text-slate-400 mt-1">
                    Redeem for {voucher.points_required} points
                </p>
            </div>

            <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-[9px] text-slate-500">
                    <Coins size={12} className="text-amber-500" />
                    <span className="font-black uppercase">Points Required:</span>
                    <span className="font-bold text-amber-600">{voucher.points_required} points</span>
                </div>
                {voucher.min_spend > 0 && (
                    <div className="flex items-center gap-2 text-[9px] text-slate-500">
                        <TrendingUp size={12} className="text-slate-400" />
                        <span className="font-black uppercase">Min. Spend:</span>
                        <span className="font-bold">₱{voucher.min_spend}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 text-[9px] text-slate-500">
                    <Clock size={12} className="text-slate-400" />
                    <span className="font-black uppercase">Expires:</span>
                    <span className="font-bold">{new Date(voucher.expiry_date).toLocaleDateString()}</span>
                </div>
            </div>

            <button
                onClick={() => onRedeem(voucher)}
                disabled={!canRedeem || isExpired || isRedeeming}
                className={cn(
                    "w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    canRedeem && !isExpired
                        ? "bg-linear-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg active:scale-95"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
            >
                {isRedeeming ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : (
                    <>
                        <Ticket size={14} />
                        {canRedeem && !isExpired ? 'Redeem Now' : 'Not Available'}
                    </>
                )}
            </button>
        </div>
    );
};

const UserRedeem = () => {
    const [vouchers, setVouchers] = useState([]);
    const [myVouchers, setMyVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userPoints, setUserPoints] = useState(0);
    const [redeemingId, setRedeemingId] = useState(null);
    const [minPointsToRedeem, setMinPointsToRedeem] = useState(50);
    const [stats, setStats] = useState({
        total_earned: 0,
        total_redeemed: 0,
        available_points: 0
    });

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

    useEffect(() => {
        fetchVouchers();
    }, [fetchVouchers]);

    const handleRedeem = async (voucher) => {
        setRedeemingId(voucher._id);
        try {
            const res = await apiPost('/user/vouchers/redeem', {
                voucher_id: voucher._id
            });
            
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

    const StatCard = ({ label, value, icon: Icon, color, subtitle }) => (
        <div className="bg-white border border-slate-100 p-6 rounded-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
                    <p className={cn("text-2xl font-[1000] italic mt-1", color)}>{value}</p>
                    {subtitle && (
                        <p className="text-[8px] text-slate-400 mt-1">{subtitle}</p>
                    )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                    <Icon size={18} className="text-slate-400" />
                </div>
            </div>
        </div>
    );

    const pointsValue = userPoints;
    const nextVoucherPoints = Math.max(0, minPointsToRedeem - userPoints);
    const canRedeemAny = userPoints >= minPointsToRedeem;

    return (
        <div className="min-h-screen bg-slate-50 pb-24 selection:bg-indigo-100">
            {/* Header */}
            <section className="pt-8 pb-12 px-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="relative">
                        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-indigo-50 border border-indigo-100">
                            <Sparkles size={12} className="text-indigo-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                Rewards Center
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-[1000] italic tracking-tighter uppercase leading-[0.85] mb-4 text-slate-900">
                            Redeem <br /><span className="text-indigo-600">Points.</span>
                        </h1>
                        <p className="text-sm text-slate-500 font-medium max-w-md">
                            Exchange your hard-earned points for discount vouchers
                        </p>
                    </div>

                    <div className="bg-linear-to-r from-amber-50 to-orange-50 p-6 rounded-4xl border border-amber-100 min-w-50">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                <Coins size={24} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase text-amber-600">Your Points</p>
                                <p className="text-3xl font-[1000] italic text-amber-700">{userPoints}</p>
                                <p className="text-[8px] text-amber-500">= ₱{pointsValue} value</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Grid */}
            <section className="px-6 max-w-7xl mx-auto mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard 
                        label="Points Earned" 
                        value={stats.total_earned} 
                        icon={Award}
                        color="text-indigo-600"
                        subtitle="lifetime points"
                    />
                    <StatCard 
                        label="Vouchers Redeemed" 
                        value={stats.total_redeemed} 
                        icon={Ticket}
                        color="text-emerald-600"
                        subtitle="total vouchers"
                    />
                    <StatCard 
                        label="Available Points" 
                        value={stats.available_points} 
                        icon={Coins}
                        color="text-amber-600"
                        subtitle={`worth ₱${stats.available_points}`}
                    />
                </div>
            </section>

            {/* Points Info Banner */}
            {!canRedeemAny && userPoints > 0 && (
                <section className="px-6 max-w-7xl mx-auto mb-8">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-4xl p-5 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <Zap size={18} className="text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase text-indigo-600">Need {nextVoucherPoints} more points</p>
                                <p className="text-[10px] text-slate-600">Book more sessions to earn points and unlock vouchers!</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] text-slate-500">Minimum {minPointsToRedeem} points to redeem</p>
                            <p className="text-[8px] font-bold text-indigo-600">1 point = ₱1 value</p>
                        </div>
                    </div>
                </section>
            )}

            {userPoints === 0 && (
                <section className="px-6 max-w-7xl mx-auto mb-8">
                    <div className="bg-slate-100 border border-slate-200 rounded-4xl p-5 text-center">
                        <p className="text-[10px] font-black uppercase text-slate-500">No points yet</p>
                        <p className="text-[8px] text-slate-400 mt-1">Start booking spaces to earn points!</p>
                    </div>
                </section>
            )}

            {/* Available Vouchers Grid */}
            <section className="px-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-black uppercase italic text-slate-900 tracking-tight">
                            Available Vouchers
                        </h2>
                        <p className="text-[10px] text-slate-400 mt-1">
                            Exchange your points for discounts
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] text-slate-400">Exchange rate</p>
                        <p className="text-[9px] font-black text-indigo-600">1 point = ₱1</p>
                    </div>
                </div>

                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="text-indigo-600 animate-spin" size={40} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Loading rewards...</p>
                    </div>
                ) : vouchers.length === 0 ? (
                    <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-white/50">
                        <Gift size={32} className="text-slate-200 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No vouchers available</p>
                        <p className="text-[8px] text-slate-400 mt-2">Check back later for new rewards!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

            {/* My Vouchers Section - Show redeemed codes */}
            {myVouchers.length > 0 && (
                <section className="px-6 max-w-7xl mx-auto mt-12">
                    <h2 className="text-xl font-black uppercase italic text-slate-900 tracking-tight mb-4">
                        My Vouchers
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myVouchers.map((voucher) => (
                            <div key={voucher._id} className="bg-linear-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[9px] font-black text-emerald-600 uppercase">Voucher Code</p>
                                        <p className="font-mono font-bold text-sm text-emerald-800">{voucher.code}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-[1000] italic text-emerald-700">₱{voucher.discount_amount} OFF</p>
                                        <p className="text-[8px] text-emerald-600">{voucher.remaining_uses} use(s) left</p>
                                    </div>
                                </div>
                                {voucher.min_spend > 0 && (
                                    <p className="text-[8px] text-slate-500 mt-2">Min spend: ₱{voucher.min_spend}</p>
                                )}
                                <div className="mt-3 pt-2 border-t border-emerald-200 flex justify-between text-[8px]">
                                    <span className="text-slate-500">Expires: {new Date(voucher.expires).toLocaleDateString()}</span>
                                    <span className="text-emerald-600 font-bold">Show this code to staff</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* How it works section */}
            <section className="px-6 max-w-7xl mx-auto mt-16">
                <div className="bg-white rounded-4xl border border-slate-100 p-8">
                    <h3 className="font-[1000] uppercase text-sm text-slate-900 mb-4">How It Works</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">1</div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-900">Earn Points</p>
                                <p className="text-[8px] text-slate-500 mt-1">Get 1 point for every ₱20 spent on bookings</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">2</div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-900">Exchange Points</p>
                                <p className="text-[8px] text-slate-500 mt-1">Use {minPointsToRedeem}+ points to get discount vouchers (1 point = ₱1)</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">3</div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-900">Use Voucher</p>
                                <p className="text-[8px] text-slate-500 mt-1">Apply code at checkout to save on your next booking</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default UserRedeem;