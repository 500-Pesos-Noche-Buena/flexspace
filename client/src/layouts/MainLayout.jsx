import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard, User, LogOut, Globe, ReceiptText } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import ChatSupport from '@/components/ui/ChatSupport';
import { showToast } from '@/components/ui/SweetAlert2';
import { apiPost } from '@/utils/Api';

const MainLayout = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [portalContainer, setPortalContainer] = useState(null);
    const { user, logout, isAuthenticated } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Ensure portal container exists
    useEffect(() => {
        setPortalContainer(document.body);
    }, []);

    // ✅ Check if current route requires authentication
    const isProtectedRoute = useCallback(() => {
        const protectedPaths = ['/dashboard', '/user', '/profile', '/account'];
        return protectedPaths.some(path => location.pathname.startsWith(path));
    }, [location.pathname]);

    // ✅ Redirect unauthenticated users from protected routes to login
    useEffect(() => {
        if (!isAuthenticated && isProtectedRoute()) {
            console.log('🔐 Protected route - redirecting to login');
            navigate('/login', { replace: true });
            return;
        }
    }, [isAuthenticated, isProtectedRoute, navigate]);

    // ✅ Redirect admin and space owners to their specific dashboards
    useEffect(() => {
        if (isAuthenticated && user) {
            const currentPath = location.pathname;

            if (currentPath === '/login' || currentPath === '/register') {
                return;
            }

            if (user.role === 'admin' && !currentPath.startsWith('/admin')) {
                navigate('/admin/dashboard', { replace: true });
            }
            else if ((user.role === 'space' || user.role === 'staff') && !currentPath.startsWith('/space')) {
                navigate('/space/dashboard', { replace: true });
            }
        }
    }, [isAuthenticated, user, navigate, location.pathname]);

    // ✅ Handle logout
    const handleLogout = async () => {
        try {
            await apiPost('/auth/logout');
            showToast({
                icon: 'success',
                title: 'Logged Out',
                text: 'Come back soon!'
            });
        } catch (error) {
            console.error("Logout error:", error);
            showToast({
                icon: 'warning',
                title: 'Logged Out',
                text: 'Session cleared'
            });
        } finally {
            setTimeout(() => {
                logout();
            }, 500);
        }
    };

    const closeOverlays = useCallback(() => {
        setIsMenuOpen(false);
        setIsProfileOpen(false);
    }, []);

    const handleNavigate = (path) => {
        closeOverlays();
        navigate(path);
    };

    useEffect(() => {
        closeOverlays();
    }, [location.pathname, closeOverlays]);

    // Profile dropdown content
    const profileDropdown = (
        <div className="fixed right-4 top-20 mt-4 w-64 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-3 z-99999 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="px-5 py-4 mb-2 bg-slate-50 rounded-[1.8rem]">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Authenticated Account</p>
                <p className="text-xs font-black text-slate-900 truncate italic uppercase">{user?.name}</p>
                <p className="text-[8px] text-slate-400 mt-1 uppercase">
                    {user?.role === 'admin' ? 'Administrator' : user?.role === 'space' ? 'Space Provider' : 'Regular User'}
                </p>
            </div>
            <div className="flex flex-col gap-1">
                <button onClick={() => handleNavigate('/dashboard')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-[1.2rem] transition-all text-left">
                    <LayoutDashboard size={14} /> Dashboard
                </button>
                <button onClick={() => handleNavigate('/user/bookings')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-[1.2rem] transition-all text-left">
                    <ReceiptText className="w-3.5 h-3.5" /> My Bookings
                </button>
                <button onClick={() => handleNavigate('/user/redeem')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-[1.2rem] transition-all text-left">
                    <ReceiptText className="w-3.5 h-3.5" /> Redeem Points
                </button>
                <button onClick={() => handleNavigate('/account')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-[1.2rem] transition-all text-left">
                    <User className="w-3.5 h-3.5" /> My Profile
                </button>
                <div className="h-px bg-slate-100 mx-4 my-2" />
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-[1.2rem] transition-all text-left">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col antialiased">

            {/* --- HEADER --- */}
            <header className="sticky top-0 z-100 bg-white/90 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="h-20 flex items-center justify-between gap-3">

                        {/* Brand */}
                        <Link to="/" onClick={closeOverlays} className="flex items-center gap-3 shrink-0 group">
                            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white grid place-items-center font-black text-lg shadow-lg group-hover:scale-105 transition-transform">
                                FS
                            </div>
                            <div className="leading-tight">
                                <p className="font-black text-slate-900 text-lg tracking-tighter uppercase italic">FlexSpace</p>
                                <p className="hidden sm:block text-[8px] text-slate-400 font-bold uppercase tracking-[0.3em]">Premium Spaces</p>
                            </div>
                        </Link>

                        {/* Actions */}
                        <div className="flex items-center gap-2 sm:gap-4">

                            {!isAuthenticated ? (
                                <>
                                    <div className="hidden md:flex items-center gap-6 mr-2">
                                        <Link to="/spaces" onClick={closeOverlays} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">Explore</Link>
                                        <Link to="/login" onClick={closeOverlays} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Sign in</Link>
                                    </div>

                                    <Button asChild onClick={closeOverlays} className="rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 px-6 text-[10px] uppercase tracking-widest h-11 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                                        <Link to="/register">Join Now</Link>
                                    </Button>

                                    <button
                                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                                        className="md:hidden p-3 rounded-2xl bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors"
                                    >
                                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Button variant="ghost" asChild onClick={closeOverlays} className="hidden sm:inline-flex rounded-2xl font-black text-indigo-600 text-[10px] uppercase tracking-widest hover:bg-indigo-50 h-11">
                                        <Link to="/dashboard">
                                            <LayoutDashboard size={14} className="mr-2" /> Dashboard
                                        </Link>
                                    </Button>

                                    <div className="relative">
                                        <button
                                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                                            className="h-11 w-11 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-900 hover:border-indigo-600 transition-all overflow-hidden active:scale-95 shadow-sm"
                                        >
                                            {user?.avatar ? (
                                                <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-black text-xs uppercase text-indigo-600">{user?.name?.charAt(0)}</span>
                                            )}
                                        </button>

                                        {/* Portal dropdown - only render when container is ready */}
                                        {isProfileOpen && portalContainer && createPortal(profileDropdown, portalContainer)}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* MOBILE NAV OVERLAY */}
                {!isAuthenticated && isMenuOpen && (
                    <div className="md:hidden absolute top-20 left-0 right-0 bg-white border-b border-slate-100 p-6 shadow-xl animate-in slide-in-from-top duration-300">
                        <nav className="flex flex-col gap-4">
                            <button onClick={() => handleNavigate('/spaces')} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                                Explore Hubs <Globe size={14} className="text-indigo-600" />
                            </button>
                            <button onClick={() => handleNavigate('/login')} className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">
                                Existing Member? Sign In
                            </button>
                        </nav>
                    </div>
                )}
            </header>

            <main className="flex-1">
                <Outlet />
            </main>

            <ChatSupport />

            <footer className="border-t border-slate-100 bg-white py-16 px-8 mt-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
                        {/* Brand & Mission */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white grid place-items-center font-black text-xs shadow-lg">FS</div>
                                <div>
                                    <p className="font-black text-slate-900 text-sm uppercase italic tracking-widest leading-none">FlexSpace Iloilo</p>
                                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-[0.4em] mt-1.5 leading-none">Premium Workstations • 2026</p>
                                </div>
                            </div>
                            <p className="max-w-xs text-[10px] leading-relaxed text-slate-400 font-medium uppercase tracking-wider">
                                Providing the most productive study hubs and co-working spaces in the Heart of the Philippines.
                            </p>
                        </div>

                        {/* Navigation Links - REMOVED non-existent pages */}
                        <div className="flex flex-wrap gap-x-12 gap-y-6">
                            <div className="flex flex-col gap-3">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-1">Explore</p>
                                <Link to="/spaces" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Find Workspace</Link>
                                {/* REMOVED: /how-it-works - doesn't exist */}
                            </div>
                            <div className="flex flex-col gap-3">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-1">Legal</p>
                                <Link to="/privacy" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Privacy Policy</Link>
                                <Link to="/terms" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Terms of Service</Link>
                            </div>
                            <div className="flex flex-col gap-3">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-1">Support</p>
                                <Link to="/contact" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Contact Us</Link>
                                <Link to="/faq" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">FAQs</Link>
                                {/* REMOVED: /help - doesn't exist */}
                            </div>
                        </div>
                    </div>

                    {/* FAQ Preview Section - Quick answers (keep this - it links to FAQ) */}
                    <div className="mt-12 pt-8 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] mb-3">Quick Answers</h4>
                                <ul className="space-y-2">
                                    <li><Link to="/faq#wifi" className="text-[8px] text-slate-400 hover:text-indigo-600 transition-colors">Fastest WiFi in Iloilo?</Link></li>
                                    <li><Link to="/faq#booking" className="text-[8px] text-slate-400 hover:text-indigo-600 transition-colors">Do I need to book in advance?</Link></li>
                                    <li><Link to="/faq#rates" className="text-[8px] text-slate-400 hover:text-indigo-600 transition-colors">Are rates accurate?</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] mb-3">Popular Questions</h4>
                                <ul className="space-y-2">
                                    <li><Link to="/faq#food" className="text-[8px] text-slate-400 hover:text-indigo-600 transition-colors">Is outside food allowed?</Link></li>
                                    <li><Link to="/faq#247" className="text-[8px] text-slate-400 hover:text-indigo-600 transition-colors">24/7 study hubs?</Link></li>
                                    <li><Link to="/faq#walkins" className="text-[8px] text-slate-400 hover:text-indigo-600 transition-colors">Walk-ins welcome?</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] mb-3">Still Need Help?</h4>
                                <p className="text-[8px] text-slate-400 mb-2">Chat with our support team</p>
                                <Link to="/contact" className="text-[8px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Contact Support →</Link>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                            &copy; 2026 FlexSpace PH. All Rights Reserved.
                        </p>
                        <div className="flex gap-4">
                            <div className="h-6 w-6 rounded-lg bg-slate-50 border border-slate-100 grid place-items-center opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
                                <Globe size={10} className="text-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;