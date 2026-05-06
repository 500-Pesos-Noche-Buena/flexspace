import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Wrench, AlertTriangle } from "lucide-react";
import { apiGet } from '@/utils/Api';

const ProgressContext = createContext(null);

export const AppLayout = ({ children, logoSrc = "/logo.png" }) => {
    const [isBooting, setIsBooting] = useState(false);
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState(0);
    const [maintenance, setMaintenance] = useState(null);
    const [checkingMaintenance, setCheckingMaintenance] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [isAuthPage, setIsAuthPage] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Check if current page is auth page (login/register)
    useEffect(() => {
        const path = window.location.pathname;
        setIsAuthPage(path === '/login' || path === '/register' || path === '/auth/google-callback');
    }, []);

    // Get current user role from localStorage
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                setUserRole(user.role);
            }
        } catch (e) {
            console.error('Failed to get user role');
        } finally {
            setIsCheckingAuth(false);
        }
    }, []);

    // Check maintenance status from backend
    useEffect(() => {
        const checkMaintenance = async () => {
            try {
                const res = await apiGet('/maintenance/status');
                if (res.maintenance) {
                    setMaintenance({
                        active: true,
                        message: res.message
                    });
                } else {
                    setMaintenance({ active: false });
                }
            } catch (err) {
                console.error('Failed to check maintenance status:', err);
                setMaintenance({ active: false });
            } finally {
                setCheckingMaintenance(false);
            }
        };
        
        checkMaintenance();
        
        // Poll every 30 seconds for status changes
        const interval = setInterval(checkMaintenance, 5000);
        return () => clearInterval(interval);
    }, []);

    // Initial mount logic
    useEffect(() => {
        const hasBooted = sessionStorage.getItem('app_initialized');
        
        if (!hasBooted) {
            setIsBooting(true);
            const timer = setTimeout(() => {
                sessionStorage.setItem('app_initialized', 'true');
                setIsBooting(false);
            }, 800);
            return () => clearTimeout(timer);
        }
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

    // Determine if maintenance screen should show:
    // 1. Maintenance is active
    // 2. User is NOT an admin (or not logged in)
    // 3. User is NOT on auth page (login/register)
    // 4. Not still checking maintenance
    const showMaintenanceScreen = maintenance?.active && 
                                   !checkingMaintenance &&
                                   userRole !== 'admin' && 
                                   !isAuthPage;

    // If still checking maintenance or auth, show loading
    if (checkingMaintenance || isCheckingAuth) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
                <img src={logoSrc} alt="Logo" className="w-32 h-32 mb-6 animate-pulse" />
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-4">
                    Checking system status...
                </p>
            </div>
        );
    }

    // Show maintenance screen
    if (showMaintenanceScreen) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-linear-to-b from-slate-900 to-slate-800 z-10000">
                <img src={logoSrc} alt="Logo" className="w-32 h-32 mb-6 animate-pulse opacity-50" />
                
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
                    <Wrench size={40} className="text-amber-500" />
                </div>
                
                <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-3">
                    Under Maintenance
                </h1>
                
                <p className="text-slate-400 text-center max-w-md mb-8">
                    {maintenance?.message || 'We are currently performing scheduled maintenance. Please check back later.'}
                </p>
                
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <AlertTriangle size={12} />
                    <span>Only administrators can access the system during maintenance</span>
                </div>
                
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                    Refresh Status
                </button>
            </div>
        );
    }

    return (
        <ProgressContext.Provider value={manager}>
            <div className="relative min-h-screen bg-background">
                <ProgressBar value={progress} status={status} logo={logoSrc} />

                {isBooting && (
                    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-background">
                        <img src={logoSrc} alt="Logo" className="w-40 h-40 mb-6 animate-pulse" />
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary animate-pulse">
                                Establishing Session
                            </span>
                        </div>
                        <span className="mt-2 text-[8px] text-muted-foreground/50 uppercase tracking-widest">
                            Please wait...
                        </span>
                    </div>
                )}
                
                <main className={`min-h-screen ${isBooting ? 'hidden' : 'block animate-in fade-in duration-500'}`}>
                    {children}
                </main>
            </div>
        </ProgressContext.Provider>
    );
};

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