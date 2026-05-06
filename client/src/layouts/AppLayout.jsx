import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from "lucide-react";

const ProgressContext = createContext(null);

export const AppLayout = ({ children, logoSrc = "/logo.png" }) => {
    // START WITH FALSE to prevent white-screen traps
    const [isBooting, setIsBooting] = useState(false);
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState(0);

    // Initial mount logic
    useEffect(() => {
        const hasBooted = sessionStorage.getItem('app_initialized');
        
        if (!hasBooted) {
            // First time in this session: Show splash
            setIsBooting(true);
            const timer = setTimeout(() => {
                sessionStorage.setItem('app_initialized', 'true');
                setIsBooting(false);
            }, 800);
            return () => clearTimeout(timer);
        }
        // If already booted, isBooting stays false, children show immediately.
    }, []);

    const manager = useMemo(() => {
        let count = 0;
        let interval;
        return {
            start: () => {
                count++;
                if (count === 1) {
                    setStatus('loading');
                    interval = setInterval(() => {
                        setProgress(p => (p < 94 ? p + (p < 40 ? 4 : 0.5) : p));
                    }, 200);
                }
            },
            stop: () => {
                count = Math.max(0, count - 1);
                if (count === 0) {
                    clearInterval(interval);
                    setStatus('finishing');
                    setProgress(100);
                    setTimeout(() => { setStatus('idle'); setProgress(0); }, 500);
                }
            }
        };
    }, []);

    return (
        <ProgressContext.Provider value={manager}>
            <div className="relative min-h-screen bg-background">
                {/* 1. Global Progress Bar (The mini one for background tasks) */}
                <ProgressBar value={progress} status={status} logo={logoSrc} />

               {/* SPLASH OVERLAY */}
{isBooting && (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-background">
        <img src={logoSrc} alt="Logo" className="w-40 h-40 mb-6 animate-pulse" />
        <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary animate-pulse">
                Establishing Session
            </span>
        </div>
        {/* Sub-text for extra "Better" points */}
        <span className="mt-2 text-[8px] text-muted-foreground/50 uppercase tracking-widest">
            Please wait...
        </span>
    </div>
)}
                {/* 3. Main Content: Guaranteed to show if isBooting is false */}
                <main className={`min-h-screen ${isBooting ? 'hidden' : 'block animate-in fade-in duration-500'}`}>
                    {children}
                </main>
            </div>
        </ProgressContext.Provider>
    );
};

/**
 * MINI PROGRESS BAR (Top of screen)
 */
const ProgressBar = ({ value, status, logo }) => {
    if (status === 'idle') return null;
    return createPortal(
        <div className="fixed top-0 left-0 right-0 z-10000 pointer-events-none">
            <div 
                className="h-0.75 bg-primary transition-all duration-300 ease-out shadow-[0_0_8px_#7c3aed]" 
                style={{ width: `${value}%` }} 
            />
        </div>,
        document.body
    );
};

export const useAppTask = () => useContext(ProgressContext);