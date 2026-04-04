import React, { useState, useEffect } from 'react';
import { apiGet } from '@/utils/Api';
import { Receipt, TrendingUp, Wallet, ArrowUpRight, History } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';

const EarningsTracker = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEarnings = async () => {
            try {
                const res = await apiGet('/space/earnings');
                setData(res.data);
            } catch (err) {
                console.error("Failed to load earnings", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEarnings();
    }, []);

    if (loading) return <div className="p-10 text-white italic opacity-50">Calculating revenue...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Earnings Tracker</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Financial performance & payout history</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Gross Revenue" value={`₱${data?.totalRevenue?.toLocaleString()}`} icon={<TrendingUp className="text-emerald-400" />} color="bg-emerald-500/10" />
                <StatCard title="Net Earnings" value={`₱${data?.netEarnings?.toLocaleString()}`} icon={<Wallet className="text-indigo-400" />} color="bg-indigo-500/10" />
                <StatCard title="Platform Fees" value={`₱${data?.platformFee?.toLocaleString()}`} icon={<ArrowUpRight className="text-rose-400" />} color="bg-rose-500/10" />
            </div>

            {/* Transactions */}
            <div className="bg-[#111114] border border-white/5 rounded-[2.5rem] p-8">
                <div className="flex items-center gap-3 mb-6">
                    <History size={18} className="text-slate-500" />
                    <h2 className="text-sm font-black text-white uppercase italic">Transaction History</h2>
                </div>
                
                <DataTable 
                    columns={[
                        { header: "Reference", cell: (r) => <span className="font-mono text-indigo-400 font-bold">{r.reference}</span> },
                        { header: "Space", cell: (r) => <span className="text-white font-bold">{r.space}</span> },
                        { header: "Amount", cell: (r) => <span className="text-emerald-500 font-black">₱{r.amount?.toLocaleString()}</span> },
                        { header: "Date", cell: (r) => <span className="text-slate-500 text-xs font-medium">{new Date(r.date).toLocaleDateString()}</span> }
                    ]}
                    data={data?.transactions || []}
                    // 🔥 ADD THIS LINE to prevent the crash
                    onParamsChange={(params) => console.log("Params changed:", params)} 
                    totalCount={data?.transactions?.length || 0}
                />
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-[#111114] border border-white/5 p-6 rounded-[2.5rem] flex items-center justify-between shadow-xl shadow-black/20">
        <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-2xl font-black text-white">{value}</h3>
        </div>
        <div className={`p-4 rounded-2xl ${color}`}>
            {icon}
        </div>
    </div>
);

export default EarningsTracker;