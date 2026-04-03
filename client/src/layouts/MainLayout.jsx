import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const MainLayout = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsMenuOpen(false);
    }, [location]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
            
            {/* --- HEADER --- */}
            <header className="sticky top-0 z-100 bg-white/90 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="h-16 lg:h-20 flex items-center justify-between gap-3">

                        {/* Brand */}
                        <Link to="/" className="flex items-center gap-2 shrink-0">
                            <div className="h-8 w-8 md:h-11 md:w-11 rounded-lg md:xl bg-slate-900 text-white grid place-items-center font-black text-xs md:text-lg shadow-lg shrink-0">
                                FS
                            </div>
                            <div className="leading-tight">
                                <p className="font-black text-slate-900 text-sm md:text-lg tracking-tight">FlexSpace</p>
                                <p className="hidden sm:block text-[9px] text-slate-400 font-bold uppercase tracking-widest">Premium Spaces</p>
                            </div>
                        </Link>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" asChild className="hidden sm:inline-flex rounded-full font-bold text-slate-700 text-xs">
                                <Link to="/login">Sign in</Link>
                            </Button>

                            <Button asChild className="rounded-full bg-indigo-600 text-white font-black hover:bg-indigo-700 px-4 md:px-7 text-xs md:text-sm">
                                <Link to="/register">Sign Up</Link>
                            </Button>

                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="lg:hidden p-2 rounded-lg bg-slate-50 text-slate-900"
                            >
                                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* MOBILE MENU */}
                {isMenuOpen && (
                    <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1">
                        <MobileNavLink href="#features">Features</MobileNavLink>
                        <MobileNavLink href="#top">Top Spaces</MobileNavLink>
                        <MobileNavLink href="#how">How it works</MobileNavLink>
                        <div className="pt-2 border-t border-slate-50">
                             <MobileNavLink href="/login" className="text-indigo-600">Sign In</MobileNavLink>
                        </div>
                    </div>
                )}
            </header>

            {/* --- MAIN CONTENT (FIXED PADDING) --- */}
            <main className="flex-1 p-4 md:p-10"> 
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>

            {/* --- FOOTER --- */}
            <footer className="border-t border-slate-100 bg-white py-8 px-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                    <div>
                        <p className="font-black text-slate-900 text-sm">FlexSpace Iloilo</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Built for Deep Work • 2026</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const MobileNavLink = ({ href, children, className = "" }) => (
    <a href={href} className={`block px-4 py-2.5 rounded-lg font-bold text-sm text-slate-700 hover:bg-slate-50 ${className}`}>{children}</a>
);

export default MainLayout;