import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutGrid, Users, FileText, Calendar, Box, Fence,
    ShoppingCart, Receipt, ChevronLeft, LogOut, User,
    DollarSign,
    Package,
    ClipboardList,
    Settings as SettingsIcon, Menu, X, History, MapPin, Search, ShieldCheck, Ticket, Activity, Star, Database, CreditCard
} from "lucide-react";
import { apiPost, apiGet } from "@/utils/Api";
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/components/ui/SweetAlert2';
import { useTheme } from '@/hooks/useTheme';
import { usePendingFees } from '@/hooks/usePendingFees'; // Add this

export default function DashboardLayout() {
    const { user: authUser, isAuthenticated, logout } = useAuth();
    const { themeColor } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
        const { hasPendingFees, pendingFees } = usePendingFees(); // Add this


    // Load sidebar state from localStorage with default true
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        // If saved is 'true' then collapsed (false), else expanded (true)
        return saved !== 'true';
    });
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [parentName, setParentName] = useState(null);
    const dropdownRef = useRef(null);

    const userAvatar = authUser?.avatar || null;

    // Save sidebar state to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', (!isSidebarOpen).toString());
    }, [isSidebarOpen]);

    useEffect(() => {
        // Only read from localStorage once on mount
        const savedTheme = localStorage.getItem('theme_mode') || 'dark';
        const savedColor = localStorage.getItem('theme_color') || 'indigo';

        // Apply theme
        const applyTheme = () => {
            // Apply mode
            if (savedTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else if (savedTheme === 'light') {
                document.documentElement.classList.remove('dark');
            } else if (savedTheme === 'system') {
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (isDark) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }

            // Apply color
            document.documentElement.style.setProperty('--theme-primary', `var(--${savedColor}-500)`);
            document.documentElement.style.setProperty('--theme-primary-dark', `var(--${savedColor}-600)`);
            document.documentElement.style.setProperty('--theme-primary-light', `var(--${savedColor}-400)`);
        };

        applyTheme();

        // Listen for theme changes from Settings page
        const handleThemeChange = () => {
            const newTheme = localStorage.getItem('theme_mode');
            const newColor = localStorage.getItem('theme_color');

            if (newTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else if (newTheme === 'light') {
                document.documentElement.classList.remove('dark');
            } else if (newTheme === 'system') {
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (isDark) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }

            if (newColor) {
                document.documentElement.style.setProperty('--theme-primary', `var(--${newColor}-500)`);
                document.documentElement.style.setProperty('--theme-primary-dark', `var(--${newColor}-600)`);
                document.documentElement.style.setProperty('--theme-primary-light', `var(--${newColor}-400)`);
            }
        };

        // Listen for storage events (when Settings page updates localStorage)
        window.addEventListener('storage', handleThemeChange);

        // Also listen for custom event from Settings page
        window.addEventListener('theme-changed', handleThemeChange);

        return () => {
            window.removeEventListener('storage', handleThemeChange);
            window.removeEventListener('theme-changed', handleThemeChange);
        };
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { replace: true });
            return;
        }

        const isAdminRoute = location.pathname.startsWith('/admin');
        const isSpaceRoute = location.pathname.startsWith('/space');

        if (isAdminRoute && authUser?.role !== 'admin') {
            navigate('/dashboard', { replace: true });
        } else if (isSpaceRoute && !['space', 'staff'].includes(authUser?.role)) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, authUser, location.pathname, navigate]);

    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target))
                setIsProfileOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (authUser?.role !== 'staff') return;
        apiGet('/auth/me/parent')
            .then(res => { if (res.success) setParentName(res.parentName); })
            .catch(() => { });
    }, [authUser?.role]);

    const isRouteActive = useCallback((path) => {
        return location.pathname === path || location.pathname.startsWith(path + "/");
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            const response = await apiPost('/auth/logout');

            if (response.success || response.status === 'success') {
                showToast({
                    icon: 'success',
                    title: 'Logged Out',
                    text: 'Come back soon!'
                });
            } else {
                showToast({
                    icon: 'success',
                    title: 'Logged Out'
                });
            }
        } catch (error) {
            console.error("Logout error:", error);
            showToast({
                icon: 'warning',
                title: 'Logged Out Locally',
                text: 'Session cleared'
            });
        } finally {
            logout();
        }
    };

    const isAdmin = authUser?.role === "admin";
    const hasSpaceAccess = ["space", "staff"].includes(authUser?.role);
    const isActualOwner = authUser?.role === "space";
    const isStaff = authUser?.role === "staff";

    const getAvatarUrl = () => {
        if (userAvatar) {
            return userAvatar;
        }
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser?.name || 'User')}&background=${primaryColor.replace('#', '')}&color=fff&bold=true`;
    };

    const sidebarSections = useMemo(() => {
        const sections = [];

        if (isAdmin) {
            sections.push({
                title: "Dashboard",
                items: [
                    { href: "/admin/dashboard", active: isRouteActive("/admin/dashboard"), icon: <LayoutGrid />, label: "Dashboard" },
                ],
            });

            sections.push({
                title: "Management",
                items: [
                    { href: "/admin/users", active: isRouteActive("/admin/users"), icon: <Users />, label: "Users" },
                    { href: "/admin/space/applications", active: isRouteActive("/admin/space/applications"), icon: <ShieldCheck />, label: "Space Applications" },
                    { href: "/admin/locations", active: isRouteActive("/admin/locations"), icon: <MapPin />, label: "Locations" },
                ],
            });
            sections.push({
                title: "Core Business",
                items: [
                    { href: "/admin/spaces", active: isRouteActive("/admin/spaces"), icon: <MapPin />, label: "Co-Working Hubs" },
                    { href: "/admin/vouchers", active: isRouteActive("/admin/vouchers"), icon: <Ticket />, label: "Vouchers" },
                    { href: "/admin/insights", active: isRouteActive("/admin/insights"), icon: <Activity />, label: "Insights" },
                ],
            });

            sections.push({
                title: "Finance",
                items: [
                    { href: "/admin/earnings", active: isRouteActive("/admin/earnings"), icon: <Receipt />, label: "Earnings Tracker" },
                ],
            });

            sections.push({
                title: "System",
                items: [
                    { href: "/admin/logs", active: isRouteActive("/admin/logs"), icon: <History />, label: "Activity Logs" },
                    { href: "/admin/queues", active: isRouteActive("/admin/queue"), icon: <Database />, label: "Queue Monitor" },
                ],
            });
        }
        else if (hasSpaceAccess) {
            sections.push({
                title: "Management",
                items: [
                    { href: "/space/dashboard", active: isRouteActive("/space/dashboard"), icon: <LayoutGrid />, label: "Dashboard" },
                ],
            });

            sections.push({
                title: "Core Business",
                items: [
                    ...(isActualOwner ? [
                        { href: "/space/staff", active: isRouteActive("/space/staff"), icon: <Users />, label: "Staff Management" },
                        { href: "/space/my-spaces", active: isRouteActive("/space/my-spaces"), icon: <MapPin />, label: "My Spaces" },
                        { href: "/space/vouchers", active: isRouteActive("/space/vouchers"), icon: <Ticket />, label: "Vouchers" },
                        { href: "/space/reviews", active: isRouteActive("/space/reviews"), icon: <Star />, label: "Reviews" },
                    ] : []),
                    { href: "/space/bookings", active: isRouteActive("/space/bookings"), icon: <Calendar />, label: "Bookings" },
                ],
            });

            sections.push({
                title: "Point of Sale",
                items: [
                    { href: "/space/pos", active: isRouteActive("/space/pos"), icon: <ShoppingCart />, label: "Point of Sale" },
                    { href: "/space/inventory", active: isRouteActive("/space/inventory"), icon: <Package />, label: "Inventory" },
                    { href: "/space/orders", active: isRouteActive("/space/orders"), icon: <ClipboardList />, label: "Customer Orders" },
                ],
            });

            sections.push({
                title: "Finance",
                items: [
                    ...(isActualOwner ? [
                        { href: "/space/earnings", active: isRouteActive("/space/earnings"), icon: <Receipt />, label: "Earnings Tracker" }
                    ] : []),
                ],
            });
        }

        return sections.filter(section => section.items.length > 0);
    }, [isAdmin, hasSpaceAccess, isActualOwner, isRouteActive]);

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            {/* MOBILE OVERLAY */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            {/* SIDEBAR */}
            <aside className={`fixed top-0 left-0 z-50 h-screen transition-all duration-300 bg-card border-r border-border
                ${isMobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"}
                ${isSidebarOpen ? "lg:w-64" : "lg:w-20"}`}
            >
                <div className="flex flex-col h-full p-4">
                    {/* LOGO */}
                    <div className="flex items-center justify-between mb-6 px-1 h-14">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: 'var(--theme-primary)' }}>
                                <MapPin className="w-5 h-5" />
                            </div>
                            {(isSidebarOpen || isMobileMenuOpen) && (
                                <div className="leading-tight animate-in fade-in duration-300">
                                    <div className="text-lg font-bold tracking-tight">FlexSpace</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--theme-primary)' }}>
                                        {isAdmin ? "Admin Console" : isStaff ? "Staff Portal" : "Space Portal"}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-muted-foreground hover:bg-accent rounded-xl">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* NAVIGATION */}
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                        {sidebarSections.map((section) => (
                            <div key={section.title}>
                                <p className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-3 ${!isSidebarOpen && !isMobileMenuOpen ? "lg:text-center" : ""}`}>
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

            {/* MAIN CONTENT */}
            <div className={`transition-all duration-300 ${isSidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
                <header className="mb-5 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-accent rounded-xl hover:bg-accent/80 text-foreground transition-all">
                            <Menu className="w-5 h-5" />
                        </button>
                        <button onClick={() => setIsSidebarOpen((s) => !s)} className="hidden lg:flex p-2.5 bg-accent rounded-xl hover:bg-accent/80 text-muted-foreground transition-all">
                            <ChevronLeft className={`w-5 h-5 transition-transform duration-300 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className="hidden md:flex flex-col ml-2 leading-none">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Live Status</span>
                            <span className="text-xs font-bold text-muted-foreground">{new Date().toDateString()}</span>
                        </div>
                    </div>

                    <div className="relative flex items-center gap-3" ref={dropdownRef}>
                        <div className="text-right hidden sm:flex flex-col leading-tight mr-1">
                            <p className="text-sm font-black tracking-tight text-foreground">{authUser?.name}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                {authUser?.role === 'staff' && parentName
                                    ? `Staff of ${parentName}`
                                    : authUser?.role === 'google' ? 'Google User' : authUser?.role
                                }
                            </p>
                        </div>

                        <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="relative flex items-center group focus:outline-none">
                            <div
                                className={`absolute -inset-1 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300 ${isProfileOpen ? 'opacity-60' : ''} theme-gradient-bg`}
                            />
                            <img
                                src={getAvatarUrl()}
                                className={`relative w-10 h-10 rounded-xl border-2 transition-all duration-300 object-cover ${isProfileOpen ? "scale-95" : "border-transparent"}`}
                                style={isProfileOpen ? { borderColor: 'var(--theme-primary)' } : {}}
                                alt="profile"
                                onError={(e) => {
                                    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser?.name || 'User')}&background=${primaryColor.replace('#', '')}&color=fff&bold=true`;
                                }}
                            />
                        </button>

                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-4 w-60 bg-card rounded-4xl shadow-2xl border border-border p-2 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="px-4 py-3 mb-1">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Account Session</p>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-accent rounded-3xl transition-all text-left group"
                                    >
                                        <div className="p-2 rounded-xl bg-accent group-hover:bg-primary/20 group-hover:text-primary transition-all duration-300">
                                            <User className="w-3.5 h-3.5" />
                                        </div>
                                        My Profile
                                    </button>

                                    {(authUser?.role === 'space') && (
                                        <button
                                            onClick={() => { navigate('/space/payment-settings'); setIsProfileOpen(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-accent rounded-3xl transition-all text-left group"
                                        >
                                            <div className="p-2 rounded-xl bg-accent group-hover:bg-primary/20 group-hover:text-primary transition-all duration-300">
                                                <CreditCard className="w-3.5 h-3.5" />
                                            </div>
                                            Payment Settings
                                        </button>
                                    )}

                                    <button
                                        onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-accent rounded-3xl transition-all text-left group"
                                    >
                                        <div className="p-2 rounded-xl bg-accent group-hover:bg-primary/20 group-hover:text-primary transition-all duration-300">
                                            <SettingsIcon className="w-3.5 h-3.5" />
                                        </div>
                                        System Settings
                                    </button>

                                    <div className="h-px bg-border mx-3 my-1" />

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
            className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group px-3 py-2.5
            ${active ? "text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-primary hover:bg-accent"}`}
            style={active ? { backgroundColor: 'var(--theme-primary)', boxShadow: `0 10px 15px -3px ${'var(--theme-primary)'}20` } : {}}
        >
            <div className="shrink-0">
                {React.cloneElement(icon, { size: 18, strokeWidth: active ? 3 : 2 })}
            </div>
            {isOpen && <span className="text-[13px] font-semibold whitespace-nowrap">{label}</span>}
            
            {/* Tooltip when sidebar is collapsed */}
            {!isOpen && (
                <>
                    <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-xl bg-gray-900 dark:bg-gray-800 border border-gray-700">
                        <span className="text-[10px] font-black uppercase tracking-wider text-white">{label}</span>
                        {/* Tooltip arrow */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 rotate-45 bg-gray-900 dark:bg-gray-800 border-l border-t border-gray-700"></div>
                    </div>
                </>
            )}
        </Link>
    );
}