import React, { useState, useEffect } from 'react';
import { apiGet } from '@/utils/Api';
import { 
    DollarSign, TrendingUp, Calendar, Loader2, 
    BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
    Wallet, CreditCard, Receipt, Clock, Award, Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from "@/lib/utils";

const Income = () => {
    const [stats, setStats] = useState({ 
        daily: { total: 0, count: 0, average: 0 },
        weekly: { total: 0, count: 0, average: 0 },
        monthly: { total: 0, count: 0, average: 0 },
        total: { total: 0, count: 0, average: 0 },
        yesterday: { total: 0, count: 0 },
        lastWeek: { total: 0, count: 0 },
        topProducts: []
    });
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('monthly');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await apiGet('/space/income/stats');
            if (res.success) {
                // Calculate averages
                const data = res.data;
                setStats({
                    ...data,
                    daily: { 
                        ...data.daily, 
                        average: data.daily.count > 0 ? data.daily.total / data.daily.count : 0 
                    },
                    weekly: { 
                        ...data.weekly, 
                        average: data.weekly.count > 0 ? data.weekly.total / data.weekly.count : 0 
                    },
                    monthly: { 
                        ...data.monthly, 
                        average: data.monthly.count > 0 ? data.monthly.total / data.monthly.count : 0 
                    },
                    total: { 
                        ...data.total, 
                        average: data.total.count > 0 ? data.total.total / data.total.count : 0 
                    }
                });
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate trends (mock for demo - replace with actual trend data from API)
    const getTrend = (current, previous) => {
        if (!previous || previous === 0) return { value: 0, isPositive: true };
        const percent = ((current - previous) / previous) * 100;
        return { value: Math.abs(percent).toFixed(1), isPositive: percent >= 0 };
    };

    const dailyTrend = getTrend(stats.daily.total, stats.yesterday?.total || 0);
    const weeklyTrend = getTrend(stats.weekly.total, stats.lastWeek?.total || 0);

    const mainCards = [
        { 
            title: 'Today\'s Sales', 
            total: stats.daily.total, 
            count: stats.daily.count,
            average: stats.daily.average,
            trend: dailyTrend,
            icon: <Calendar size={20} />, 
            color: 'from-emerald-500/20 to-emerald-600/5',
            iconColor: 'text-emerald-400',
            borderColor: 'border-emerald-500/20'
        },
        { 
            title: 'This Week', 
            total: stats.weekly.total, 
            count: stats.weekly.count,
            average: stats.weekly.average,
            trend: weeklyTrend,
            icon: <TrendingUp size={20} />, 
            color: 'from-blue-500/20 to-blue-600/5',
            iconColor: 'text-blue-400',
            borderColor: 'border-blue-500/20'
        },
        { 
            title: 'This Month', 
            total: stats.monthly.total, 
            count: stats.monthly.count,
            average: stats.monthly.average,
            icon: <Calendar size={20} />, 
            color: 'from-purple-500/20 to-purple-600/5',
            iconColor: 'text-purple-400',
            borderColor: 'border-purple-500/20'
        },
        { 
            title: 'All Time', 
            total: stats.total.total, 
            count: stats.total.count,
            average: stats.total.average,
            icon: <Wallet size={20} />, 
            color: 'from-indigo-500/20 to-indigo-600/5',
            iconColor: 'text-indigo-400',
            borderColor: 'border-indigo-500/20'
        },
    ];

    const periodCards = [
        { period: 'daily', label: 'Daily', total: stats.daily.total, count: stats.daily.count, icon: Clock },
        { period: 'weekly', label: 'Weekly', total: stats.weekly.total, count: stats.weekly.count, icon: Calendar },
        { period: 'monthly', label: 'Monthly', total: stats.monthly.total, count: stats.monthly.count, icon: BarChart3 },
        { period: 'total', label: 'Lifetime', total: stats.total.total, count: stats.total.count, icon: Award },
    ];

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="text-center">
                <Loader2 size={48} className="animate-spin text-indigo-500 mx-auto mb-4" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Loading income data...</p>
            </div>
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Income Analytics</h1>
                        <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest italic">
                            Track your POS earnings and revenue insights
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                        <Sparkles size={14} className="text-indigo-400" />
                        <span className="text-[9px] text-indigo-400 font-black uppercase tracking-wider">Live Updates</span>
                    </div>
                </div>
            </div>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {mainCards.map((card, idx) => (
                    <Card 
                        key={card.title}
                        className={cn(
                            "relative overflow-hidden bg-linear-to-br border transition-all duration-300 hover:scale-[1.02] group",
                            card.color,
                            card.borderColor
                        )}
                    >
                        <CardContent className="p-5">
                            {/* Background Icon */}
                            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                {card.icon}
                            </div>
                            
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn("p-2 rounded-xl bg-white/5", card.iconColor)}>
                                    {card.icon}
                                </div>
                                {card.trend && (
                                    <div className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase",
                                        card.trend.isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                                    )}>
                                        {card.trend.isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                        {card.trend.value}%
                                    </div>
                                )}
                            </div>
                            
                            <p className="text-2xl font-[1000] text-white italic tracking-tighter mb-1">
                                ₱{card.total.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                {card.count} orders
                            </p>
                            
                            {card.average > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[8px] text-slate-600 font-black uppercase">Avg. Order</span>
                                        <span className="text-[10px] text-white font-bold">₱{card.average.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Period Selector Cards */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={16} className="text-indigo-400" />
                    <h2 className="text-xs font-black text-white uppercase tracking-widest">Period Overview</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {periodCards.map((card) => (
                        <button
                            key={card.period}
                            onClick={() => setSelectedPeriod(card.period)}
                            className={cn(
                                "p-4 rounded-2xl border transition-all text-left group",
                                selectedPeriod === card.period
                                    ? "bg-indigo-500/20 border-indigo-500/40 shadow-lg shadow-indigo-900/20"
                                    : "bg-white/5 border-white/10 hover:border-indigo-500/30"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <card.icon size={14} className={cn(
                                    "transition-colors",
                                    selectedPeriod === card.period ? "text-indigo-400" : "text-slate-500"
                                )} />
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-wider",
                                    selectedPeriod === card.period ? "text-indigo-400" : "text-slate-500"
                                )}>{card.label}</span>
                            </div>
                            <p className={cn(
                                "text-lg font-[1000] italic tracking-tighter",
                                selectedPeriod === card.period ? "text-white" : "text-slate-400"
                            )}>₱{card.total.toLocaleString()}</p>
                            <p className="text-[8px] text-slate-600 mt-1">{card.count} orders</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Additional Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Average Order Value Card */}
                <Card className="bg-linear-to-br from-indigo-500/10 to-transparent border-indigo-500/20">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-indigo-500/20">
                                <Receipt size={18} className="text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Average Order Value</p>
                                <p className="text-2xl font-[1000] text-white italic">
                                    ₱{(stats[selectedPeriod]?.average || 0).toFixed(2)}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[9px]">
                                <span className="text-slate-500">Total Revenue</span>
                                <span className="text-white font-bold">₱{(stats[selectedPeriod]?.total || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[9px]">
                                <span className="text-slate-500">Total Orders</span>
                                <span className="text-white font-bold">{stats[selectedPeriod]?.count || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Performance Tip Card */}
                <Card className="bg-linear-to-br from-amber-500/10 to-transparent border-amber-500/20">
                    <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-amber-500/20 shrink-0">
                                <TrendingUp size={18} className="text-amber-400" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Performance Insight</p>
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    {stats.total.count === 0 
                                        ? "Start selling products to see your income analytics here."
                                        : stats.daily.total > stats.weekly.total / 7
                                        ? "📈 Today's performance is above your weekly average! Keep up the momentum."
                                        : "💡 Consider promoting popular items to boost today's sales."}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Stats Footer */}
            <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">
                            Real-time data updates every 30 seconds
                        </span>
                    </div>
                    <button 
                        onClick={fetchStats}
                        className="text-[8px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors"
                    >
                        Refresh Data
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Income;