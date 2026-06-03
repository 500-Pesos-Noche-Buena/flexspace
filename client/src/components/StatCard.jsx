import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

export const StatCard = ({ title, value, icon: Icon, trend, color, field, editing, editValue, onEditChange }) => {
    const { themeColor } = useTheme();

    return (
        <Card className="bg-card border-border hover:border-primary/30 transition-all shadow-lg">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <Icon size={18} className="text-muted-foreground" />
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 text-[9px] font-black",
                            trend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                            {trend > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                            {Math.abs(trend)}%
                        </div>
                    )}
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
                {editing && field ? (
                    <input
                        type="number"
                        value={editValue}
                        onChange={(e) => onEditChange(field, e.target.value)}
                        className="mt-2 w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-xl font-[1000] italic focus:border-primary outline-none"
                    />
                ) : (
                    <p className={cn("text-2xl font-[1000] italic mt-1", color)}>{value}</p>
                )}
            </CardContent>
        </Card>
    );
};