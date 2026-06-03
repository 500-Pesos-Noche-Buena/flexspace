import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';

const PendingApproval = ({ name = "User" }) => {
    const { theme, themeColor } = useTheme();

    // Get dynamic color for button
    const getButtonColor = () => {
        const colors = {
            indigo: 'hover:bg-indigo-600',
            emerald: 'hover:bg-emerald-600',
            purple: 'hover:bg-purple-600',
            blue: 'hover:bg-blue-600',
            rose: 'hover:bg-rose-600',
            amber: 'hover:bg-amber-600',
        };
        return colors[themeColor] || colors.indigo;
    };

    const buttonColorClass = getButtonColor();

    return (
        <div className="w-full max-w-110 animate-in fade-in zoom-in-95 duration-500 text-center">
            
            {/* ICON AREA */}
            <div className="w-24 h-24 bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 rounded-4xl border border-amber-100 dark:border-amber-800 flex items-center justify-center mx-auto mb-8 shadow-sm">
                <Clock size={44} strokeWidth={2.5} className="animate-pulse" />
            </div>
            
            {/* TEXT CONTENT */}
            <h1 className="text-4xl font-[1000] text-slate-900 dark:text-white tracking-tight mb-4">
                Wait a moment, <span className="text-amber-600 dark:text-amber-400">{name}!</span>
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed mb-10 px-2">
                Your <span className="text-slate-900 dark:text-white font-bold">Space Provider</span> account is currently being reviewed. 
                You'll get full dashboard access once our team approves your documents.
            </p>

            {/* ACTION */}
            <div className="space-y-4">
                <Button 
                    asChild 
                    className={cn(
                        "w-full h-16 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-black transition-all flex gap-2 text-lg shadow-xl shadow-slate-200 dark:shadow-slate-900/50 active:scale-[0.98]",
                        buttonColorClass
                    )}
                >
                    <Link to="/">
                        Return to Home
                    </Link>
                </Button>
                
                <p className="text-sm font-bold text-slate-400 dark:text-slate-500">
                    Need help? <Link to="#" className="text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-4">Contact Support</Link>
                </p>
            </div>
        </div>
    );
};

export default PendingApproval;