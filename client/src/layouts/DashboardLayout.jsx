import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutGrid, Users, FileText, Calendar, Box, Fence,
    ShoppingCart, Receipt, ChevronLeft, LogOut, User,
    Settings as SettingsIcon, Menu, X, History, MapPin, Search, ShieldCheck
} from "lucide-react";

export default function DashboardLayout() {
    const user = JSON.parse(localStorage.getItem('user')) || { name: 'Josiah Admin', role: 'admin' };
    const location = useLocation();
    const navigate = useNavigate();

    const isAdmin = user.role === "admin";
    const isSpaceOwner = user.role === "space";

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsProfileOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isRouteActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

    const handleLogout = async () => {
        try {
            if (typeof apiPost === 'function') {
                await apiPost('/auth/logout');
            }
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.clear();
            navigate('/login', { replace: true });
        }
    };

    const sidebarSections = useMemo(() => {
        const sections = [];

        // MANAGEMENT
        sections.push({
            title: "Management",
            items: [
                {
                    href: isAdmin ? "/admin/dashboard" : "/space/dashboard",
                    active: isRouteActive(isAdmin ? "/admin/dashboard" : "/space/dashboard"),
                    icon: <LayoutGrid />,
                    label: "Dashboard"
                },
                ...(isAdmin ? [
                    { href: "/admin/users", active: isRouteActive("/admin/users"), icon: <Users />, label: "Users" }
                ] : []),
            ],
        });

        // CORE BUSINESS
        sections.push({
            title: "Core Business",
            items: [
                ...(isAdmin ? [
                    { href: "/admin/spaces", active: isRouteActive("/admin/spaces"), icon: <MapPin />, label: "Co-Working Hubs" },
                    { href: "/admin/space/applications", active: isRouteActive("/admin/space/applications"), icon: <ShieldCheck />, label: "Space Applications" },
                ] : []),

                ...(isSpaceOwner ? [
                    { href: "/space/my-spaces", active: isRouteActive("/space/my-spaces"), icon: <MapPin />, label: "My Spaces" },
                    { href: "/space/bookings", active: isRouteActive("/space/bookings"), icon: <Calendar />, label: "Bookings" },
                    { href: "/space/walkins", active: isRouteActive("/space/walkins"), icon: <Users />, label: "Walk-ins" },
                ] : []),
            ],
        });

        // FINANCE
        sections.push({
            title: "Finance",
            items: [
                ...(isAdmin ? [
                    { href: "/admin/earnings", active: isRouteActive("/admin/earnings"), icon: <Receipt />, label: "Earnings Tracker" }
                ] : []),
                ...(isSpaceOwner ? [
                    { href: "/space/earnings", active: isRouteActive("/space/earnings"), icon: <Receipt />, label: "Earnings Tracker" }
                ] : []),
            ],
        });

        // SYSTEM
        if (isAdmin) {
            sections.push({
                title: "System",
                items: [
                    { href: "/admin/logs", active: isRouteActive("/admin/logs"), icon: <History />, label: "Activity Logs" },
                ],
            });
        }

        return sections;
    }, [isAdmin, isSpaceOwner, location.pathname]);

    return (
        <div className="min-h-screen bg-[#09090b] text-slate-100 font-sans selection:bg-emerald-500/30">
            {/* MOBILE OVERLAY */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            {/* SIDEBAR */}
            <aside className={`fixed top-0 left-0 z-50 h-screen transition-all duration-300 bg-[#111114] border-r border-white/5
                ${isMobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"}
                ${isSidebarOpen ? "lg:w-64" : "lg:w-20"}`}
            >
                <div className="flex flex-col h-full p-4">
                    {/* LOGO SECTION */}
                    <div className="flex items-center justify-between mb-6 px-1 h-14">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
                                <MapPin className="w-5 h-5" />
                            </div>
                            {(isSidebarOpen || isMobileMenuOpen) && (
                                <div className="leading-tight animate-in fade-in duration-300">
                                    <div className="text-lg font-bold tracking-tight">FlexSpace</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                                        {isAdmin ? "Admin Console" : "Space Portal"}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-slate-400 hover:bg-white/5 rounded-xl">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* NAVIGATION */}
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                        {sidebarSections.map((section) => (
                            <div key={section.title}>
                                <p className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-3 ${!isSidebarOpen && !isMobileMenuOpen ? "lg:text-center" : ""}`}>
                                    {isSidebarOpen || isMobileMenuOpen ? section.title : "•"}
                                </p>
                                <nav className="space-y-1">
                                    {section.items.map((item) => (
                                        <NavLink
                                            key={item.href}
                                            to={item.href}
                                            active={item.active}
                                            icon={item.icon}
                                            label={item.label}
                                            isOpen={isSidebarOpen || isMobileMenuOpen}
                                        />
                                    ))}
                                </nav>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className={`transition-all duration-300 ${isSidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
                <header className="mb-5 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 bg-[#09090b]/80 backdrop-blur-md z-40 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-white/5 rounded-xl hover:bg-white/10 text-slate-100 transition-all">
                            <Menu className="w-5 h-5" />
                        </button>
                        <button onClick={() => setIsSidebarOpen((s) => !s)} className="hidden lg:flex p-2.5 bg-white/5 rounded-xl hover:bg-white/10 text-slate-400 transition-all">
                            <ChevronLeft className={`w-5 h-5 transition-transform duration-300 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className="hidden md:flex flex-col ml-2 leading-none">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live Status</span>
                            <span className="text-xs font-bold text-slate-400">{new Date().toDateString()}</span>
                        </div>
                    </div>

                    <div className="relative flex items-center gap-3" ref={dropdownRef}>
                        <div className="text-right hidden sm:flex flex-col leading-tight mr-1">
                            <p className="text-sm font-black tracking-tight text-white">{user.name}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{user.role}</p>
                        </div>
                        <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="relative flex items-center group focus:outline-none">
                            <div className={`absolute -inset-1 bg-linear-to-tr from-emerald-600 to-emerald-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300 ${isProfileOpen ? 'opacity-60' : ''}`} />
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=059669&color=fff&bold=true`}
                                className={`relative w-10 h-10 rounded-xl border-2 transition-all duration-300 ${isProfileOpen ? "border-emerald-500 scale-95" : "border-transparent"}`}
                                alt="profile"
                            />
                        </button>

                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-4 w-60 bg-[#111114] rounded-4xl shadow-2xl border border-white/5 p-2 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                                {/* Header / Label */}
                                <div className="px-4 py-3 mb-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Account Session</p>
                                </div>

                                <div className="flex flex-col gap-1">
                                    {/* Profile Button */}
                                    <button
                                        onClick={() => {
                                            navigate('/profile');
                                            setIsProfileOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-white/5 rounded-3xl transition-all text-left group"
                                    >
                                        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all duration-300">
                                            <User className="w-3.5 h-3.5" />
                                        </div>
                                        My Profile
                                    </button>

                                    {/* Separator Line */}
                                    <div className="h-px bg-white/5 mx-3 my-1" />

                                    {/* Sign Out Button */}
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 rounded-3xl transition-all text-left group"
                                    >
                                        <div className="p-2 rounded-xl bg-rose-500/5 group-hover:bg-rose-500/20 transition-all duration-300">
                                            <LogOut className="w-3.5 h-3.5" />
                                        </div>
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <main className="px-4 lg:px-8 pb-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

function NavLink({ to, active, label, icon, isOpen }) {
    return (
        <Link
            to={to}
            className={`flex items-center gap-3 rounded-xl transition-all duration-200 group px-3 py-2.5
            ${active ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" : "text-slate-400 hover:text-emerald-500 hover:bg-white/5"}`}
        >
            <div className="shrink-0">
                {React.cloneElement(icon, { size: 18, strokeWidth: active ? 3 : 2 })}
            </div>
            {isOpen && <span className="text-[13px] font-semibold whitespace-nowrap">{label}</span>}
        </Link>
    );
}