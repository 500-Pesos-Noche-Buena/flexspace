import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

const PendingApproval = ({ name = "User" }) => {
    return (
        /* BALANCED WIDTH: Matches the 440px fix for Login/Register */
        <div className="w-full max-w-110 animate-in fade-in zoom-in-95 duration-500 text-center">
            
            {/* ICON AREA */}
            <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-4xl border border-amber-100 flex items-center justify-center mx-auto mb-8 shadow-sm">
                <Clock size={44} strokeWidth={2.5} className="animate-pulse" />
            </div>
            
            {/* TEXT CONTENT */}
            <h1 className="text-4xl font-[1000] text-slate-900 tracking-tight mb-4">
                Wait a moment, <span className="text-amber-600">{name}!</span>
            </h1>
            
            <p className="text-slate-500 text-lg font-medium leading-relaxed mb-10 px-2">
                Your <span className="text-slate-900 font-bold">Space Provider</span> account is currently being reviewed. 
                You'll get full dashboard access once our team approves your documents.
            </p>

            {/* ACTION */}
            <div className="space-y-4">
                <Button asChild className="w-full h-16 rounded-2xl bg-slate-900 text-white font-black hover:bg-amber-500 hover:text-slate-900 transition-all flex gap-2 text-lg shadow-xl shadow-slate-200">
                    <Link to="/">
                        Return to Home
                    </Link>
                </Button>
                
                <p className="text-sm font-bold text-slate-400">
                    Need help? <Link to="#" className="text-indigo-600 hover:underline underline-offset-4">Contact Support</Link>
                </p>
            </div>
        </div>
    );
};

export default PendingApproval;