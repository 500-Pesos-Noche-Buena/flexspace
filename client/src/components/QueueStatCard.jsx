import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/formatNumber';

export const QueueStatCard = ({ title, value, icon, color = 'indigo', warning = false }) => (
    <div className="bg-card p-4 rounded-2xl border border-border hover:border-primary/30 transition-all shadow-lg">
        <div className="flex items-center justify-between mb-3">
            <div className={cn("p-2 rounded-xl", `bg-${color}-500/10`)}>{icon}</div>
            {warning && <AlertCircle size={14} className="text-rose-600 dark:text-rose-400 animate-pulse" />}
        </div>
        <p className="text-2xl font-black text-foreground mb-1">{formatNumber(value)}</p>
        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
    </div>
);