import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { History, Calendar, MapPin, Star, DollarSign, User } from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber';
import { cn } from '@/lib/utils';

const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-card p-4 rounded-2xl border border-border hover:border-primary/30 transition-all">
        <div className="flex items-center justify-between mb-2">
            <div className={cn("p-2 rounded-xl", `bg-${color}-500/10`)}>{icon}</div>
        </div>
        <p className="text-2xl font-black text-foreground mb-0.5">{formatNumber(value)}</p>
        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
    </div>
);

export const StatsModal = ({ isOpen, onClose, stats, detailedStats }) => {
    if (!detailedStats) return null;

    return (
        <Modal open={isOpen} onClose={onClose} title="Detailed Statistics" size="2xl">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <StatCard title="Total" value={detailedStats?.total || stats?.total || 0} icon={<History size={14} className="text-muted-foreground" />} color="slate" />
                    <StatCard title="Monthly" value={detailedStats?.monthly || 0} icon={<Calendar size={14} className="text-primary" />} color="indigo" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <StatCard title="Districts" value={detailedStats?.district || 0} icon={<MapPin size={14} className="text-purple-600 dark:text-purple-400" />} color="purple" />
                    <StatCard title="Reviews" value={detailedStats?.review || 0} icon={<Star size={14} className="text-amber-600 dark:text-amber-400" />} color="yellow" />
                    <StatCard title="Earnings" value={detailedStats?.earnings || 0} icon={<DollarSign size={14} className="text-emerald-600 dark:text-emerald-400" />} color="emerald" />
                    <StatCard title="Registrations" value={detailedStats?.register || 0} icon={<User size={14} className="text-blue-600 dark:text-blue-400" />} color="blue" />
                </div>
                {detailedStats?.topUsers && detailedStats.topUsers.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Top Active Users</h3>
                        <div className="space-y-2">
                            {detailedStats.topUsers.map((user, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded-xl">
                                    <span className="text-[11px] font-bold text-foreground">{user.name || user._id}</span>
                                    <span className="text-[9px] text-primary">{user.count} actions</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};