// components/ui/UserManual.jsx
// FULL WIDTH - Better visibility for all roles
// FIXED: sidebar flex-direction bug (list was invisible on desktop)
// CHANGED: 'public' (guest) and 'user' (logged-in) roles merged into a single
//          'user' role so both get the same "how to use the system" content.
//          'space' (provider) and 'staff' remain separate. Admin is intentionally
//          not handled here — it falls through and just gets no manual entries.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    BookOpen, X, Menu, Search, CheckCircle, 
    ChevronDown, Minimize2, Maximize2, LogIn,
    User, Calendar, CreditCard, Home, Settings,
    Users, MapPin, Clock, Star, Bell, Phone
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'react-router-dom';

const UserManual = () => {
    const { user, isAuthenticated } = useAuth();
    const location = useLocation();
    
    // UI States
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [selectedModule, setSelectedModule] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState([]);
    const contentRef = useRef(null);

    // ============================================
    // 1. DETERMINE USER ROLE
    // ============================================
    // Only three effective buckets now:
    //   'user'  -> guests (not logged in) AND logged-in regular users/admins
    //   'space' -> space provider / space owner
    //   'staff' -> staff accounts

    const getUserRole = useCallback(() => {
        if (isAuthenticated) {
            if (user?.role === 'space' || user?.role === 'space_owner') return 'space';
            if (user?.role === 'staff') return 'staff';
        }
        // Guests, regular logged-in users, and anything else (e.g. admin) land here.
        return 'user';
    }, [isAuthenticated, user]);

    const currentRole = getUserRole();

    // ============================================
    // 2. POSITION (Left for regular users, Right for Space/Staff)
    // ============================================
    
    const getPosition = useCallback(() => {
        return currentRole === 'user' ? 'left' : 'right';
    }, [currentRole]);

    const position = getPosition();
    const positionClass = position === 'left' ? 'left-4 md:left-6' : 'right-4 md:right-6';

    // ============================================
    // 3. MANUAL CONTENT - ACTUAL GUIDES
    // ============================================

    const MANUAL_MODULES = {
        // ===== GENERAL / GETTING STARTED (all users, guest or logged in) =====
        'what-is-flexspace': {
            id: 'what-is-flexspace',
            title: '📖 What is FlexSpace?',
            description: 'Learn about the platform',
            category: 'Getting Started',
            icon: '🏠',
            order: 0,
            roles: ['user', 'space', 'staff'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">What is FlexSpace?</h2>
                        <p class="text-muted-foreground text-base leading-relaxed">
                            FlexSpace is the premier platform for booking premium workspaces, study hubs, and meeting rooms in Iloilo City. 
                            We connect people who need productive spaces with space providers who have quality venues.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="bg-card rounded-xl p-5 border border-border">
                            <div class="text-3xl mb-3">🎯</div>
                            <h3 class="text-foreground font-semibold text-base mb-2">For Users</h3>
                            <ul class="text-muted-foreground text-sm space-y-2">
                                <li class="flex items-start gap-2">
                                    <span class="text-primary mt-0.5">•</span>
                                    <span>Find and book workspaces by the hour or day</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span class="text-primary mt-0.5">•</span>
                                    <span>View real-time availability and pricing</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span class="text-primary mt-0.5">•</span>
                                    <span>Manage bookings and earn reward points</span>
                                </li>
                            </ul>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border">
                            <div class="text-3xl mb-3">🏢</div>
                            <h3 class="text-foreground font-semibold text-base mb-2">For Space Providers</h3>
                            <ul class="text-muted-foreground text-sm space-y-2">
                                <li class="flex items-start gap-2">
                                    <span class="text-primary mt-0.5">•</span>
                                    <span>List and manage your spaces</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span class="text-primary mt-0.5">•</span>
                                    <span>Track bookings and earnings</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span class="text-primary mt-0.5">•</span>
                                    <span>Manage staff and operations</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div class="bg-primary/5 border border-primary/10 rounded-xl p-4">
                        <h4 class="text-foreground font-semibold text-sm mb-2">✅ Ready to get started?</h4>
                        <div class="flex flex-wrap gap-3">
                            <button onclick="document.querySelector('[data-manual-close]')?.click(); window.location.href='/register'" 
                                class="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2">
                                <LogIn size={16} /> Sign Up Free
                            </button>
                            <button onclick="document.querySelector('[data-manual-close]')?.click(); window.location.href='/spaces'" 
                                class="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold px-5 py-2.5 rounded-lg text-sm transition-all border border-border">
                                Browse Spaces →
                            </button>
                        </div>
                    </div>
                </div>
            `
        },

        'how-to-signup': {
            id: 'how-to-signup',
            title: '📝 How to Sign Up',
            description: 'Create your account in 3 easy steps',
            category: 'Getting Started',
            icon: '📝',
            order: 1,
            roles: ['user'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Create an Account</h2>
                        <p class="text-muted-foreground text-base">Follow these simple steps to join FlexSpace.</p>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">1</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Click "Join Now" or "Sign Up"</h4>
                                <p class="text-muted-foreground text-sm">Find the button in the top-right corner of the homepage.</p>
                                <div class="mt-2 bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground border border-border">
                                    📍 Located in the main navigation bar
                                </div>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">2</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Fill in Your Details</h4>
                                <ul class="text-muted-foreground text-sm space-y-1">
                                    <li>• <strong>Full Name</strong> - Your real name</li>
                                    <li>• <strong>Email Address</strong> - Use a valid email</li>
                                    <li>• <strong>Password</strong> - At least 8 characters</li>
                                    <li>• <strong>Role</strong> - Choose "User" or "Space Provider"</li>
                                </ul>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">3</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Verify Your Email</h4>
                                <p class="text-muted-foreground text-sm">Check your inbox for a verification link. Click it to activate your account.</p>
                                <div class="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400">
                                    ⚠️ Check your spam folder if you don't see the email.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                        <p class="text-emerald-400 text-sm flex items-center gap-2">
                            <CheckCircle size={16} /> Once verified, you can start booking spaces immediately!
                        </p>
                    </div>
                </div>
            `
        },

        'how-to-login': {
            id: 'how-to-login',
            title: '🔐 How to Login',
            description: 'Step-by-step login guide',
            category: 'Getting Started',
            icon: '🔐',
            order: 2,
            roles: ['user'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Login</h2>
                        <p class="text-muted-foreground text-base">Access your FlexSpace account.</p>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">1</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Click "Sign In"</h4>
                                <p class="text-muted-foreground text-sm">Find the button in the top-right corner of the homepage.</p>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">2</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Enter Your Credentials</h4>
                                <ul class="text-muted-foreground text-sm space-y-1">
                                    <li>• <strong>Email</strong> - Your registered email address</li>
                                    <li>• <strong>Password</strong> - Your account password</li>
                                </ul>
                                <div class="mt-2 bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground border border-border">
                                    💡 Check "Remember Me" to stay logged in on this device.
                                </div>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">3</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Click "Sign In"</h4>
                                <p class="text-muted-foreground text-sm">You'll be redirected to your dashboard.</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <p class="text-amber-400 text-sm flex items-start gap-2">
                            <span>🔑</span>
                            <span><strong>Forgot Password?</strong> Click "Forgot Password" on the login page to reset via email.</span>
                        </p>
                    </div>
                </div>
            `
        },

        'how-to-book': {
            id: 'how-to-book',
            title: '📅 How to Book a Space',
            description: 'Find and book your perfect workspace',
            category: 'How to Use',
            icon: '📅',
            order: 10,
            roles: ['user'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Book a Space</h2>
                        <p class="text-muted-foreground text-base">Find and book the perfect workspace in minutes.</p>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">1</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Browse Available Spaces</h4>
                                <p class="text-muted-foreground text-sm">Go to the <strong>Spaces</strong> page to see all available workspaces.</p>
                                <ul class="text-muted-foreground text-sm mt-2 space-y-1">
                                    <li>• Use filters to narrow down by <strong>location, price, or amenities</strong></li>
                                    <li>• Click on any space to view <strong>photos, details, and reviews</strong></li>
                                </ul>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">2</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Check Availability</h4>
                                <p class="text-muted-foreground text-sm">Select your desired <strong>date and time</strong>.</p>
                                <div class="mt-2 bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground border border-border">
                                    💡 Popular spaces fill up quickly. Book 3-5 days in advance.
                                </div>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">3</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Confirm Your Booking</h4>
                                <p class="text-muted-foreground text-sm">Review the details and click <strong>"Book Now"</strong>.</p>
                                <ul class="text-muted-foreground text-sm mt-2 space-y-1">
                                    <li>• You'll receive an <strong>instant confirmation</strong></li>
                                    <li>• The booking will appear in your <strong>dashboard</strong></li>
                                </ul>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">4</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Manage Your Booking</h4>
                                <p class="text-muted-foreground text-sm">View, reschedule, or cancel from your dashboard.</p>
                                <div class="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400">
                                    ⚠️ Cancellations within 24 hours may incur a fee.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `
        },

        'how-to-earn-points': {
            id: 'how-to-earn-points',
            title: '🎁 How to Earn & Redeem Points',
            description: 'Maximize your rewards',
            category: 'How to Use',
            icon: '🎁',
            order: 11,
            roles: ['user'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Earn & Redeem Points</h2>
                        <p class="text-muted-foreground text-base">Earn points and get rewards for being a loyal FlexSpace user.</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h3 class="text-foreground font-semibold mb-3">💎 How to Earn Points</h3>
                            <ul class="text-muted-foreground text-sm space-y-3">
                                <li class="flex items-start gap-3">
                                    <span class="text-primary font-bold">10 pts</span>
                                    <span>Per hour booked</span>
                                </li>
                                <li class="flex items-start gap-3">
                                    <span class="text-primary font-bold">5 pts</span>
                                    <span>Per review left</span>
                                </li>
                                <li class="flex items-start gap-3">
                                    <span class="text-primary font-bold">50 pts</span>
                                    <span>Per friend referred</span>
                                </li>
                            </ul>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h3 class="text-foreground font-semibold mb-3">🎯 How to Redeem</h3>
                            <ol class="text-muted-foreground text-sm space-y-2">
                                <li class="flex items-start gap-2">
                                    <span class="text-primary font-bold">1.</span>
                                    <span>Go to <strong>Redeem Points</strong> in your dashboard</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span class="text-primary font-bold">2.</span>
                                    <span>Browse available rewards</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span class="text-primary font-bold">3.</span>
                                    <span>Click <strong>"Redeem"</strong> on your chosen reward</span>
                                </li>
                            </ol>
                        </div>
                    </div>

                    <div class="bg-primary/5 border border-primary/10 rounded-xl p-4">
                        <p class="text-foreground/80 text-sm">
                            💡 <strong>Pro Tip:</strong> Save your points for bigger rewards like free bookings!
                        </p>
                    </div>
                </div>
            `
        },

        'how-to-manage-bookings': {
            id: 'how-to-manage-bookings',
            title: '📋 How to Manage Bookings',
            description: 'View, reschedule, and cancel bookings',
            category: 'How to Use',
            icon: '📋',
            order: 12,
            roles: ['user'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Manage Your Bookings</h2>
                        <p class="text-muted-foreground text-base">Keep track of all your bookings in one place.</p>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h4 class="text-foreground font-semibold mb-2">📊 View Your Bookings</h4>
                            <p class="text-muted-foreground text-sm">Go to <strong>My Bookings</strong> in your dashboard sidebar.</p>
                            <ul class="text-muted-foreground text-sm mt-2 space-y-1">
                                <li>• <strong>Upcoming</strong> - Future bookings</li>
                                <li>• <strong>Past</strong> - Completed bookings</li>
                                <li>• <strong>Cancelled</strong> - Cancelled bookings</li>
                            </ul>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h4 class="text-foreground font-semibold mb-2">🔄 Reschedule a Booking</h4>
                            <ol class="text-muted-foreground text-sm space-y-2">
                                <li>1. Find the booking in <strong>My Bookings</strong></li>
                                <li>2. Click <strong>"Reschedule"</strong></li>
                                <li>3. Select a new date and time</li>
                                <li>4. Confirm the change</li>
                            </ol>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h4 class="text-foreground font-semibold mb-2">❌ Cancel a Booking</h4>
                            <ol class="text-muted-foreground text-sm space-y-2">
                                <li>1. Find the booking in <strong>My Bookings</strong></li>
                                <li>2. Click <strong>"Cancel"</strong></li>
                                <li>3. Confirm the cancellation</li>
                            </ol>
                            <div class="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400">
                                ⚠️ Cancellations within 24 hours may incur a fee.
                            </div>
                        </div>
                    </div>
                </div>
            `
        },

        // ===== SPACE PROVIDER MODULES (separate from regular users) =====
        'how-to-add-space': {
            id: 'how-to-add-space',
            title: '🏗️ How to Add a Space',
            description: 'List your workspace on FlexSpace',
            category: 'For Providers',
            icon: '🏗️',
            order: 20,
            roles: ['space'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Add a New Space</h2>
                        <p class="text-muted-foreground text-base">List your workspace and start earning.</p>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">1</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Go to "My Spaces"</h4>
                                <p class="text-muted-foreground text-sm">Find it in your dashboard sidebar.</p>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">2</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Click "Add New Space"</h4>
                                <p class="text-muted-foreground text-sm">Fill in all the details:</p>
                                <ul class="text-muted-foreground text-sm mt-2 space-y-1">
                                    <li>• <strong>Name</strong> - A catchy name for your space</li>
                                    <li>• <strong>Location</strong> - Full address with map pin</li>
                                    <li>• <strong>Capacity</strong> - How many people can fit</li>
                                    <li>• <strong>Price</strong> - Per hour rate (₱)</li>
                                    <li>• <strong>Amenities</strong> - WiFi, AC, Coffee, etc.</li>
                                </ul>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">3</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Upload Photos</h4>
                                <p class="text-muted-foreground text-sm">High-quality photos get more bookings.</p>
                                <div class="mt-2 bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground border border-border">
                                    📸 Use well-lit, clear photos showing the space from different angles.
                                </div>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">4</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Submit for Approval</h4>
                                <p class="text-muted-foreground text-sm">Our team will review and approve your space within 24-48 hours.</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-primary/5 border border-primary/10 rounded-xl p-4">
                        <p class="text-foreground/80 text-sm">
                            💡 <strong>Pro Tip:</strong> Good photos = More bookings! List your best amenities.
                        </p>
                    </div>
                </div>
            `
        },

        'how-to-manage-space': {
            id: 'how-to-manage-space',
            title: '⚙️ How to Manage Your Space',
            description: 'Keep your space listings up to date',
            category: 'For Providers',
            icon: '⚙️',
            order: 21,
            roles: ['space'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Manage Your Space</h2>
                        <p class="text-muted-foreground text-base">Keep your listings fresh and up to date.</p>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h4 class="text-foreground font-semibold mb-2">✏️ Edit Space Details</h4>
                            <ol class="text-muted-foreground text-sm space-y-2">
                                <li>1. Go to <strong>My Spaces</strong> in your dashboard</li>
                                <li>2. Click <strong>"Edit"</strong> on the space you want to update</li>
                                <li>3. Update photos, pricing, or availability</li>
                                <li>4. Click <strong>"Save"</strong> to apply changes</li>
                            </ol>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h4 class="text-foreground font-semibold mb-2">📅 Update Availability Calendar</h4>
                            <ol class="text-muted-foreground text-sm space-y-2">
                                <li>1. Go to <strong>My Spaces</strong></li>
                                <li>2. Click <strong>"Calendar"</strong></li>
                                <li>3. Block out dates when you're closed</li>
                                <li>4. Set different pricing for peak times</li>
                            </ol>
                            <div class="mt-2 bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground border border-border">
                                💡 Keep your calendar updated to avoid double bookings.
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h4 class="text-foreground font-semibold mb-2">👀 View Space Analytics</h4>
                            <ul class="text-muted-foreground text-sm space-y-1">
                                <li>• <strong>Views</strong> - How many people viewed your space</li>
                                <li>• <strong>Bookings</strong> - How many bookings you've received</li>
                                <li>• <strong>Revenue</strong> - How much you've earned</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `
        },

        'how-to-handle-bookings': {
            id: 'how-to-handle-bookings',
            title: '📊 How to Handle Bookings',
            description: 'Manage incoming booking requests',
            category: 'For Providers',
            icon: '📊',
            order: 22,
            roles: ['space'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Handle Bookings</h2>
                        <p class="text-muted-foreground text-base">Manage booking requests efficiently.</p>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h4 class="text-foreground font-semibold mb-2">📋 View Booking Requests</h4>
                            <ul class="text-muted-foreground text-sm space-y-1">
                                <li>• Go to <strong>Bookings</strong> in your dashboard</li>
                                <li>• See all <strong>Pending, Confirmed, and Completed</strong> bookings</li>
                            </ul>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h4 class="text-foreground font-semibold mb-2">✅ Approve or Decline</h4>
                            <ol class="text-muted-foreground text-sm space-y-2">
                                <li>1. Go to <strong>Bookings</strong> → <strong>Pending</strong></li>
                                <li>2. Click <strong>"Approve"</strong> to confirm</li>
                                <li>3. Click <strong>"Decline"</strong> if you're not available</li>
                            </ol>
                            <div class="mt-2 bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground border border-border">
                                💡 Respond to requests within 24 hours for good ratings.
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h4 class="text-foreground font-semibold mb-2">📅 Check-in / Check-out</h4>
                            <ul class="text-muted-foreground text-sm space-y-1">
                                <li>• <strong>Check-in:</strong> Confirm guest arrival</li>
                                <li>• <strong>Check-out:</strong> Mark booking as completed</li>
                                <li>• <strong>No-show:</strong> Mark if guest doesn't arrive within 30 min</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `
        },

        'how-to-track-earnings': {
            id: 'how-to-track-earnings',
            title: '💰 How to Track Earnings',
            description: 'Monitor your revenue and payouts',
            category: 'For Providers',
            icon: '💰',
            order: 23,
            roles: ['space'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Track Your Earnings</h2>
                        <p class="text-muted-foreground text-base">Keep track of your revenue and payouts.</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h4 class="text-foreground font-semibold mb-3">📊 View Earnings</h4>
                            <ul class="text-muted-foreground text-sm space-y-2">
                                <li>• Go to <strong>Earnings</strong> in your dashboard</li>
                                <li>• View <strong>daily, weekly, and monthly</strong> earnings</li>
                                <li>• See breakdown by space</li>
                            </ul>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h4 class="text-foreground font-semibold mb-3">💳 Payout Information</h4>
                            <ul class="text-muted-foreground text-sm space-y-2">
                                <li>• <strong>Schedule:</strong> Weekly on Mondays</li>
                                <li>• <strong>Minimum:</strong> ₱500 per payout</li>
                                <li>• <strong>Methods:</strong> Bank Transfer, GCash</li>
                            </ul>
                            <div class="mt-2 bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground border border-border">
                                💡 Keep your payment details updated for smooth payouts.
                            </div>
                        </div>
                    </div>

                    <div class="bg-primary/5 border border-primary/10 rounded-xl p-4">
                        <p class="text-foreground/80 text-sm">
                            📌 <strong>Commission:</strong> FlexSpace takes a 15% commission on all bookings.
                        </p>
                    </div>
                </div>
            `
        },

        'how-to-manage-staff': {
            id: 'how-to-manage-staff',
            title: '👔 How to Manage Staff',
            description: 'Add and manage team members',
            category: 'For Providers',
            icon: '👔',
            order: 24,
            roles: ['space'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Manage Staff</h2>
                        <p class="text-muted-foreground text-base">Build your team and assign permissions.</p>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">1</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Go to Staff Management</h4>
                                <p class="text-muted-foreground text-sm">Find <strong>"Staff"</strong> in your dashboard sidebar.</p>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">2</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Click "Add Staff"</h4>
                                <p class="text-muted-foreground text-sm">Enter the staff member's email address.</p>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">3</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Set Permissions</h4>
                                <ul class="text-muted-foreground text-sm space-y-2">
                                    <li>• <strong>Manager:</strong> Full access to everything</li>
                                    <li>• <strong>Staff:</strong> Can manage bookings and walk-ins</li>
                                    <li>• <strong>Viewer:</strong> Can only view, no changes</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="bg-primary/5 border border-primary/10 rounded-xl p-4">
                        <p class="text-foreground/80 text-sm">
                            💡 <strong>Tip:</strong> Assign staff to specific spaces for better organization.
                        </p>
                    </div>
                </div>
            `
        },

        'how-to-use-walkins': {
            id: 'how-to-use-walkins',
            title: '🚶 How to Handle Walk-ins',
            description: 'Manage walk-in customers',
            category: 'For Staff',
            icon: '🚶',
            order: 30,
            roles: ['staff'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Handle Walk-in Customers</h2>
                        <p class="text-muted-foreground text-base">Process walk-in bookings quickly and efficiently.</p>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">1</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Greet the Customer</h4>
                                <p class="text-muted-foreground text-sm">Welcome them and ask about their needs.</p>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">2</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Check Availability</h4>
                                <p class="text-muted-foreground text-sm">Check if the requested space is available.</p>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">3</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Process Booking</h4>
                                <ul class="text-muted-foreground text-sm space-y-1">
                                    <li>• Create a <strong>walk-in booking</strong> in the system</li>
                                    <li>• Process <strong>payment</strong> (Cash, GCash, Card)</li>
                                    <li>• Provide <strong>receipt</strong> to customer</li>
                                </ul>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border flex gap-4 items-start">
                            <div class="shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-lg">4</div>
                            <div>
                                <h4 class="text-foreground font-semibold mb-1">Show to Space</h4>
                                <p class="text-muted-foreground text-sm">Escort the customer to their booked space.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `
        },

        'how-to-use-pos': {
            id: 'how-to-use-pos',
            title: '💳 How to Use POS',
            description: 'Process payments and manage sales',
            category: 'For Staff',
            icon: '💳',
            order: 31,
            roles: ['staff'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Use the POS System</h2>
                        <p class="text-muted-foreground text-base">Process payments and manage orders.</p>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h4 class="text-foreground font-semibold mb-2">💵 Processing Payments</h4>
                            <ol class="text-muted-foreground text-sm space-y-2">
                                <li>1. Select the <strong>items or services</strong></li>
                                <li>2. Apply any <strong>discounts or vouchers</strong></li>
                                <li>3. Choose <strong>payment method</strong> (Cash, GCash, Card)</li>
                                <li>4. <strong>Complete</strong> the transaction</li>
                            </ol>
                            <div class="mt-2 bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground border border-border">
                                💡 Always confirm payment before completing the transaction.
                            </div>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border">
                            <h4 class="text-foreground font-semibold mb-2">📋 Managing Orders</h4>
                            <ul class="text-muted-foreground text-sm space-y-1">
                                <li>• <strong>View</strong> order history</li>
                                <li>• <strong>Process</strong> refunds (with manager approval)</li>
                                <li>• <strong>Track</strong> daily sales</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `
        },

        'faq': {
            id: 'faq',
            title: '❓ FAQ',
            description: 'Frequently asked questions',
            category: 'Support',
            icon: '❓',
            order: 40,
            roles: ['user', 'space', 'staff'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">Frequently Asked Questions</h2>
                        <p class="text-muted-foreground text-base">Find answers to the most common questions.</p>
                    </div>

                    <div class="space-y-3">
                        <div class="bg-card rounded-xl border border-border overflow-hidden">
                            <div class="faq-item">
                                <div class="faq-question flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors" onclick="this.closest('.faq-item').classList.toggle('open')">
                                    <h4 class="text-foreground font-semibold text-sm">🔒 Is my data secure?</h4>
                                    <ChevronDown size={18} class="text-muted-foreground transition-transform duration-200" />
                                </div>
                                <div class="faq-answer max-h-0 overflow-hidden transition-all duration-300">
                                    <div class="p-4 pt-0 text-muted-foreground text-sm border-t border-border">
                                        Yes! FlexSpace uses enterprise-grade encryption (AES-256) and SSL/TLS for all connections. We never share your personal information with third parties.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl border border-border overflow-hidden">
                            <div class="faq-item">
                                <div class="faq-question flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors" onclick="this.closest('.faq-item').classList.toggle('open')">
                                    <h4 class="text-foreground font-semibold text-sm">💳 Do I need a credit card to sign up?</h4>
                                    <ChevronDown size={18} class="text-muted-foreground transition-transform duration-200" />
                                </div>
                                <div class="faq-answer max-h-0 overflow-hidden transition-all duration-300">
                                    <div class="p-4 pt-0 text-muted-foreground text-sm border-t border-border">
                                        No! You can start with our free plan. No credit card required. You only need to add payment details when you're ready to book a space.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl border border-border overflow-hidden">
                            <div class="faq-item">
                                <div class="faq-question flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors" onclick="this.closest('.faq-item').classList.toggle('open')">
                                    <h4 class="text-foreground font-semibold text-sm">📱 Is there a mobile app?</h4>
                                    <ChevronDown size={18} class="text-muted-foreground transition-transform duration-200" />
                                </div>
                                <div class="faq-answer max-h-0 overflow-hidden transition-all duration-300">
                                    <div class="p-4 pt-0 text-muted-foreground text-sm border-t border-border">
                                        Yes! We have iOS and Android apps available on the App Store and Google Play. Download the app for easy booking on the go.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl border border-border overflow-hidden">
                            <div class="faq-item">
                                <div class="faq-question flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors" onclick="this.closest('.faq-item').classList.toggle('open')">
                                    <h4 class="text-foreground font-semibold text-sm">🔄 Can I cancel my booking?</h4>
                                    <ChevronDown size={18} class="text-muted-foreground transition-transform duration-200" />
                                </div>
                                <div class="faq-answer max-h-0 overflow-hidden transition-all duration-300">
                                    <div class="p-4 pt-0 text-muted-foreground text-sm border-t border-border">
                                        Yes! You can cancel from your dashboard. Cancellations within 24 hours may incur a fee. Full refund for cancellations made 24+ hours in advance.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="bg-card rounded-xl border border-border overflow-hidden">
                            <div class="faq-item">
                                <div class="faq-question flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors" onclick="this.closest('.faq-item').classList.toggle('open')">
                                    <h4 class="text-foreground font-semibold text-sm">💰 How do I get paid as a space provider?</h4>
                                    <ChevronDown size={18} class="text-muted-foreground transition-transform duration-200" />
                                </div>
                                <div class="faq-answer max-h-0 overflow-hidden transition-all duration-300">
                                    <div class="p-4 pt-0 text-muted-foreground text-sm border-t border-border">
                                        Payouts are processed weekly via bank transfer or GCash. Set up your payment details in the Payment Settings. Minimum payout is ₱500.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-primary/5 border border-primary/10 rounded-xl p-4">
                        <p class="text-foreground/80 text-sm flex items-center gap-2">
                            <Phone size={16} /> Still have questions? <a href="/contact" class="text-primary hover:underline">Contact Support →</a>
                        </p>
                    </div>
                </div>
            `
        },

        'contact-support': {
            id: 'contact-support',
            title: '📞 Contact Support',
            description: 'How to get help',
            category: 'Support',
            icon: '📞',
            order: 41,
            roles: ['user', 'space', 'staff'],
            content: `
                <div class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-3">Contact Support</h2>
                        <p class="text-muted-foreground text-base">We're here to help! Choose your preferred channel.</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="bg-card rounded-xl p-5 border border-border">
                            <div class="text-3xl mb-3">💬</div>
                            <h4 class="text-foreground font-semibold mb-1">Live Chat</h4>
                            <p class="text-muted-foreground text-sm">Click the chat icon at the bottom-right corner.</p>
                            <span class="inline-block mt-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">● Available 24/7</span>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border">
                            <div class="text-3xl mb-3">📧</div>
                            <h4 class="text-foreground font-semibold mb-1">Email</h4>
                            <p class="text-muted-foreground text-sm"><strong>support@flexspace.ph</strong></p>
                            <p class="text-muted-foreground text-xs mt-1">Response within 24 hours</p>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border">
                            <div class="text-3xl mb-3">📱</div>
                            <h4 class="text-foreground font-semibold mb-1">Phone</h4>
                            <p class="text-muted-foreground text-sm"><strong>(033) 123-4567</strong></p>
                            <p class="text-muted-foreground text-xs mt-1">Mon-Fri, 9AM - 6PM (PHT)</p>
                        </div>

                        <div class="bg-card rounded-xl p-5 border border-border">
                            <div class="text-3xl mb-3">📝</div>
                            <h4 class="text-foreground font-semibold mb-1">Contact Form</h4>
                            <p class="text-muted-foreground text-sm">Submit a support ticket online.</p>
                            <button onclick="document.querySelector('[data-manual-close]')?.click(); window.location.href='/contact'" 
                                class="mt-2 text-primary text-sm hover:underline">
                                Go to Contact Form →
                            </button>
                        </div>
                    </div>
                </div>
            `
        }
    };

    // ============================================
    // 4. GET MODULES FOR CURRENT ROLE
    // ============================================

    const getModulesForRole = useCallback(() => {
        return Object.values(MANUAL_MODULES).filter(m => m.roles.includes(currentRole));
    }, [currentRole]);

    const availableModules = getModulesForRole();

    const getCategories = useCallback(() => {
        const cats = {};
        availableModules.forEach(m => {
            const cat = m.category || 'General';
            if (!cats[cat]) cats[cat] = [];
            cats[cat].push(m);
        });
        return cats;
    }, [availableModules]);

    const categories = getCategories();

    // ============================================
    // 5. SEARCH
    // ============================================

    const getFilteredModules = useCallback(() => {
        if (!searchQuery.trim()) return availableModules;
        const q = searchQuery.toLowerCase().trim();
        return availableModules.filter(m => 
            m.title.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q)
        );
    }, [searchQuery, availableModules]);

    const filteredModules = getFilteredModules();

    // ============================================
    // 6. RESPONSIVE
    // ============================================

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleCategory = (cat) => {
        setExpandedCategories(prev => 
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    useEffect(() => {
        if (availableModules.length > 0 && !selectedModule) {
            setSelectedModule(availableModules[0]);
        }
    }, [availableModules, selectedModule]);

    const selectModule = (m) => {
        setSelectedModule(m);
        if (isMobile) setIsSidebarOpen(false);
    };

    const getRoleBadge = () => {
        const roles = {
            user: isAuthenticated ? '🌟 Member' : '👤 Visitor',
            space: '🏢 Space Provider',
            staff: '👔 Staff'
        };
        return roles[currentRole] || '👤 Visitor';
    };

    // ============================================
    // 7. RENDER - FULL WIDTH FIX
    // ============================================

    // Floating Button
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 ${positionClass} p-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-2xl shadow-primary/30 transition-all active:scale-95 z-9999 group`}
                style={{ zIndex: 9999 }}
            >
                <BookOpen className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full animate-pulse"></span>
            </button>
        );
    }

    // Main Modal - FULL WIDTH
    return (
        <div 
            className={`fixed bottom-4 md:bottom-6 ${positionClass} w-[98vw] md:w-[95vw] lg:w-[90vw] xl:w-[85vw] max-w-7xl bg-background border border-border rounded-2xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden z-9999 ${
                isMinimized ? 'h-17.5' : 'h-[92vh] md:h-[88vh] max-h-[95vh]'
            }`}
            style={{ zIndex: 9999 }}
        >
            {/* ===== HEADER ===== */}
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border bg-card/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm md:text-base font-bold text-foreground tracking-wide truncate">User Manual</h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[8px] md:text-[10px] font-medium text-primary bg-primary/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                                {getRoleBadge()}
                            </span>
                            <span className="text-[8px] md:text-[10px] text-muted-foreground whitespace-nowrap">
                                {isAuthenticated ? '📊 Dashboard View' : '🌐 Public View'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1.5 md:p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 md:p-2 hover:bg-destructive/20 hover:text-destructive rounded-lg text-muted-foreground transition-colors"
                        data-manual-close
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <div className="flex flex-1 overflow-hidden">
                    {/* ===== SIDEBAR ===== */}
                    {/* FIX: added flex-col to the desktop branch below — previously it was
                        missing, which made the sidebar lay out its children (search box +
                        module list) in a row instead of a column, squeezing the module
                        list into an invisible sliver. */}
                    <div className={`
                        ${isMobile ? 'absolute inset-0 z-10 bg-background' : 'relative'}
                        ${isMobile && !isSidebarOpen ? 'hidden' : 'flex'}
                        ${isMobile ? 'flex flex-col' : 'flex flex-col w-64 md:w-72 lg:w-80 shrink-0 border-r border-border'}
                    `}>
                        {/* Search */}
                        <div className="p-3 md:p-4 border-b border-border">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search manual..."
                                    className="w-full bg-secondary/50 border border-border rounded-xl py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Module List */}
                        <div className="flex-1 overflow-y-auto p-2 md:p-3 scrollbar-hide">
                            {filteredModules.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <p className="text-sm">No results found</p>
                                    <p className="text-xs mt-1">Try a different search term</p>
                                </div>
                            ) : (
                                <>
                                    {!searchQuery ? (
                                        Object.entries(categories).map(([cat, modules]) => {
                                            const isExpanded = expandedCategories.includes(cat) || modules.some(m => m.id === selectedModule?.id);
                                            return (
                                                <div key={cat} className="mb-2">
                                                    <button
                                                        onClick={() => toggleCategory(cat)}
                                                        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                                    >
                                                        <span>{cat}</span>
                                                        <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {isExpanded && (
                                                        <div className="space-y-0.5">
                                                            {modules.map(m => (
                                                                <button
                                                                    key={m.id}
                                                                    onClick={() => selectModule(m)}
                                                                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                                                                        selectedModule?.id === m.id
                                                                            ? 'bg-primary/20 text-primary border border-primary/30'
                                                                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                                                    }`}
                                                                >
                                                                    <span className="block truncate">{m.title}</span>
                                                                    {m.description && (
                                                                        <span className="text-[10px] text-muted-foreground/60 block truncate">{m.description}</span>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        filteredModules.map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => selectModule(m)}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                                                    selectedModule?.id === m.id
                                                        ? 'bg-primary/20 text-primary border border-primary/30'
                                                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                                }`}
                                            >
                                                <span className="block truncate">{m.title}</span>
                                                {m.description && (
                                                    <span className="text-[10px] text-muted-foreground/60 block truncate">{m.description}</span>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </>
                            )}
                        </div>

                        {/* Mobile Close */}
                        {isMobile && (
                            <div className="p-3 border-t border-border">
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="w-full py-2 bg-secondary hover:bg-secondary/80 rounded-xl text-sm text-muted-foreground transition-colors"
                                >
                                    Close Menu
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ===== CONTENT - FULL WIDTH ===== */}
                    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                        {/* Mobile Toggle */}
                        <div className="md:hidden flex items-center gap-2 p-3 border-b border-border">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg text-muted-foreground transition-colors"
                            >
                                <Menu size={18} />
                            </button>
                            <span className="text-xs text-muted-foreground truncate">
                                {selectedModule?.title || 'Select a topic'}
                            </span>
                        </div>

                        {/* Content Area - FULL WIDTH with padding */}
                        <div 
                            ref={contentRef}
                            className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-hide"
                        >
                            {selectedModule ? (
                                <div className="w-full max-w-none">
                                    <div dangerouslySetInnerHTML={{ __html: selectedModule.content }} />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <div className="text-center">
                                        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">Select a topic from the sidebar</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 md:px-6 py-2 md:py-3 border-t border-border bg-card/30 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground shrink-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span>Viewing as: <strong className="text-primary">{getRoleBadge()}</strong></span>
                                <span className="text-border hidden sm:inline">•</span>
                                <span>{availableModules.length} topics</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] text-muted-foreground/50">v2.0</span>
                                {isAuthenticated && (
                                    <span className="flex items-center gap-1 text-emerald-500">
                                        <CheckCircle size={10} />
                                        <span>Verified</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManual;