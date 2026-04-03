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
            
            {/* --- HEADER / NAVBAR --- */}
            <header className="sticky top-0 z-1000 bg-white/90 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="h-16 lg:h-20 flex items-center justify-between gap-3">

                        {/* Brand */}
                        <Link to="/" className="flex items-center gap-2 md:gap-3 shrink-0 min-w-0">
                            <div className="h-9 w-9 md:h-11 md:w-11 rounded-xl bg-slate-900 text-white grid place-items-center font-black text-sm md:text-lg shadow-lg shadow-slate-200 shrink-0">
                                FS
                            </div>
                            <div className="leading-tight min-w-0 text-left">
                                <p className="font-black text-slate-900 text-sm md:text-lg tracking-tight truncate">FlexSpace</p>
                                <p className="hidden sm:block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Premium Spaces</p>
                            </div>
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden lg:flex items-center gap-8 text-[13px] font-bold uppercase tracking-wider text-slate-500">
                            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
                            <a href="#top" className="hover:text-indigo-600 transition-colors">Top Spaces</a>
                            <a href="#how" className="hover:text-indigo-600 transition-colors">How it works</a>
                            <a href="#contact" className="hover:text-indigo-600 transition-colors">Contact</a>
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <Button variant="ghost" asChild className="hidden md:inline-flex rounded-full font-bold text-slate-700">
                                <Link to="/login">Sign in</Link>
                            </Button>

                            <Button asChild className="rounded-full bg-indigo-600 text-white font-black hover:bg-indigo-700 transition active:scale-95 px-5 md:px-7">
                                <Link to="/register">Sign Up</Link>
                            </Button>

                            {/* Mobile Toggle */}
                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="lg:hidden p-2.5 rounded-xl bg-slate-50 text-slate-900 hover:bg-slate-100 transition"
                            >
                                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* MOBILE DROPDOWN */}
                <div className={`lg:hidden border-t border-slate-100 bg-white transition-all duration-300 ${isMenuOpen ? 'block' : 'hidden'}`}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                        <nav className="grid gap-1">
                            <MobileNavLink href="#features">Features</MobileNavLink>
                            <MobileNavLink href="#top">Top Spaces</MobileNavLink>
                            <MobileNavLink href="#how">How it works</MobileNavLink>
                            <MobileNavLink href="#contact">Contact</MobileNavLink>
                            
                            <div className="my-2 border-t border-slate-100"></div>
                            
                            <MobileNavLink href="/login" className="text-indigo-600">Sign In</MobileNavLink>
                            <MobileNavLink href="/register" className="bg-indigo-600 text-white hover:bg-indigo-700">
                                Sign up
                            </MobileNavLink>
                        </nav>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 p-10">
                <Outlet />
            </main>

            {/* --- FOOTER --- */}
            <footer id="contact" className="border-t border-slate-100 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
                        <div>
                            <p className="font-extrabold text-slate-900">Co-Working Space Finder</p>
                            <p className="text-sm text-slate-500">Iloilo City • Panay-ready • Philippines Scalable</p>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
                            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
                            <a href="#top" className="hover:text-slate-900 transition-colors">Top Spaces</a>
                            <a href="#how" className="hover:text-slate-900 transition-colors">How it works</a>
                            <Link to="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
                        </div>
                    </div>

                    <div className="mt-6 text-xs text-slate-500 font-medium">
                        © {new Date().getFullYear()} FlexSpace. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

const MobileNavLink = ({ href, children, className = "" }) => (
    <a 
        href={href} 
        className={`block px-4 py-3 rounded-xl font-black text-[15px] transition-colors ${
            className.includes('bg-indigo-600') 
            ? className 
            : `text-slate-900 hover:bg-slate-50 hover:text-indigo-600 ${className}`
        }`}
    >
        {children}
    </a>
);

export default MainLayout;