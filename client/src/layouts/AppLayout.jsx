import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react"; 

// Create a context so children can update the progress bar
const ProgressContext = createContext(null);

export const useAppProgress = () => {
    const context = useContext(ProgressContext);
    if (!context) {
        throw new Error('useAppProgress must be used within an AppLayout');
    }
    return context;
};

/**
 * AppLayout Component
 * Standardized for Shadcn/UI Nova Preset
 */
export const AppLayout = ({ children }) => {
    const initialLoadRef = useRef(false);
    const [isAppLoading, setIsAppLoading] = useState(true);
    const [globalProgress, setGlobalProgress] = useState(0); 

    useEffect(() => {
        // Simulate initial app setup (checking auth, etc.)
        const loadTimer = setTimeout(() => {
            setIsAppLoading(false);
            initialLoadRef.current = true;
        }, 1000);

        return () => clearTimeout(loadTimer);
    }, []);

    // Full Page Loading State
    if (isAppLoading) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-100">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">
                    Initializing System Core...
                </p>
            </div>
        );
    }

    return (
        <ProgressContext.Provider value={{ setGlobalProgress }}>
            <div className="relative min-h-screen bg-background text-foreground antialiased">
                
                {/* Global Background Task Progress */}
                {globalProgress > 0 && globalProgress < 100 && (
                    <div className="fixed top-0 left-0 right-0 z-60 bg-background/80 backdrop-blur-sm border-b p-4 shadow-sm">
                        <div className="max-w-7xl mx-auto space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <span>Background Task in Progress</span>
                                <span>{globalProgress}%</span>
                            </div>
                            <Progress value={globalProgress} className="h-1.5 w-full bg-primary/10" />
                        </div>
                    </div>
                )}

                {/* Main Viewport */}
                <main className={`transition-all duration-500 ${
                        globalProgress > 0 && globalProgress < 100 ? 'pt-20' : '' 
                    }`}
                >
                    {children}
                </main>
            </div>
        </ProgressContext.Provider>
    );
};