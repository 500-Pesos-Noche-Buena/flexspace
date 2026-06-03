// User/Bookings/List.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/Api';
import {
    XCircle, Loader2, LogIn, LogOut,
    ReceiptText, Zap, ScanLine, Ticket, Coins, Gift, ChevronLeft, ChevronRight, Star, PenSquare, Trash2
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { cn } from '@/lib/utils';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
import { QRScannerModal, VoucherRedeemModal, FeedbackModal } from '@/components/modal';

const getPHDateDisplay = (dateStr) => new Date(dateStr).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric'
});

const getPHTimeDisplay = (dateStr) => new Date(dateStr).toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit'
});

const STATUS_FILTERS = [
    'all',
    'pending',
    'confirmed',
    'active',
    'pending_payment',
    'completed',
    'cancelled'
];

const statusStyles = {
    pending: { badge: 'bg-amber-500/10 text-amber-600', dot: 'bg-amber-500' },
    confirmed: { badge: 'bg-emerald-500/10 text-emerald-600', dot: 'bg-emerald-500' },
    active: { badge: 'bg-indigo-500/10 text-indigo-500', dot: 'bg-indigo-500' },
    pending_payment: { badge: 'bg-purple-500/10 text-purple-600', dot: 'bg-purple-500' },
    completed: { badge: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
    cancelled: { badge: 'bg-red-500/10 text-red-500', dot: 'bg-red-400' },
    rejected: { badge: 'bg-red-500/10 text-red-500', dot: 'bg-red-400' },
};

// ── Loading Spinner Component ────────────────────────────────────────────────
const LoadingSpinner = () => (
    <div className="py-20 sm:py-32 flex flex-col items-center justify-center gap-4">
        <div className="relative">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-3 sm:border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
            <ReceiptText size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
        </div>
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] italic">Syncing History...</p>
    </div>
);

// ── Empty State Component ────────────────────────────────────────────────────
const EmptyState = () => (
    <div className="py-16 sm:py-24 text-center border-2 border-dashed border-slate-100 rounded-2xl sm:rounded-[3rem] bg-white/50">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <ReceiptText size={28} className="text-slate-300" />
        </div>
        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">No active records found.</p>
        <p className="text-[7px] sm:text-[8px] text-slate-400 mt-2">Start booking spaces to see your history</p>
    </div>
);

// ── Booking Card ─────────────────────────────────────────────────────────────
const BookingCard = ({ booking, userPoints, onScan, onRedeemVoucher, onFeedback }) => {
    const space = booking.space_id;
    const style = statusStyles[booking.status] || statusStyles.cancelled;
    const rateHour = space?.rate_hour || 0;
    const totalPaid = booking.total_amount || 0;

    // Helper function to get the primary image URL (supports Cloudinary)
    const getPrimaryImage = (space) => {
        // Check if there are images in the images array
        if (space?.images && space.images.length > 0) {
            // Images are already full Cloudinary URLs
            return space.images[0];
        }

        // Fallback to single image field
        if (space?.image) {
            // Check if it's a full URL (Cloudinary) or local path
            if (space.image.startsWith('http://') || space.image.startsWith('https://')) {
                return space.image;
            }
            // Local path (fallback)
            return `${API_BASE_URL}/uploads/spaces/${space.user_id}/${space.image}`;
        }

        // Default placeholder
        return '/placeholder.jpg';
    };

    return (
        <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden h-full">
            {/* Mobile: Horizontal layout, Desktop: Flex row */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
                {/* Image - Mobile: full width, Desktop: fixed width */}
                <div className="w-full sm:w-20 h-40 sm:h-20 rounded-xl sm:rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-50 relative">
                    {space?.image ? (
                        <img
                            src={getPrimaryImage(space)}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            alt={space?.name}
                            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.jpg'; }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ReceiptText size={24} />
                        </div>
                    )}
                    {/* Mobile status badge overlay */}
                    <div className={cn(
                        'absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1 sm:hidden',
                        style.badge
                    )}>
                        <span className={cn('w-1 h-1 rounded-full', style.dot)} />
                        {booking.status.replace('_', ' ')}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-slate-900 font-[1000] uppercase text-sm sm:text-base tracking-tight truncate">
                                {space?.name || 'Unknown Hub'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[9px] sm:text-[10px] text-indigo-600 font-black uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg">
                                    ₱{rateHour}/hr
                                </p>
                            </div>
                        </div>

                        {/* Desktop status badge - hidden on mobile */}
                        <div className={cn(
                            'hidden sm:inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest items-center gap-1.5 shrink-0',
                            style.badge
                        )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', style.dot, (booking.status === 'active' || booking.status === 'pending_payment') && 'animate-pulse')} />
                            {booking.status.replace('_', ' ')}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-3">
                        <span className="text-[8px] sm:text-[9px] font-black italic uppercase tracking-tighter text-indigo-600">
                            #{booking.ticket_number}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-200 hidden sm:inline-block" />
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-slate-400 wrap-break-word">
                            {getPHDateDisplay(booking.start_time)} · {getPHTimeDisplay(booking.start_time)}
                        </span>
                    </div>

                    {/* Voucher discount badge */}
                    {booking.voucher_discount > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50">
                            <Gift size={8} className="text-emerald-600" />
                            <span className="text-[7px] sm:text-[8px] font-black text-emerald-600 uppercase">
                                Saved: ₱{booking.voucher_discount}
                            </span>
                        </div>
                    )}

                    {/* Check-in/out times */}
                    {(booking.check_in_at || booking.check_out_at) && (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-3">
                            {booking.check_in_at && (
                                <div className="flex items-center gap-1 text-emerald-600 text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg sm:rounded-xl">
                                    <LogIn size={8} className="sm:w-2.5 sm:h-2.5" /> {getPHTimeDisplay(booking.check_in_at)}
                                </div>
                            )}
                            {booking.check_out_at && (
                                <div className="flex items-center gap-1 text-slate-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg sm:rounded-xl">
                                    <LogOut size={8} className="sm:w-2.5 sm:h-2.5" /> {getPHTimeDisplay(booking.check_out_at)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            {booking.status === 'confirmed' && (
                <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-50">
                    <button
                        onClick={() => onScan(booking)}
                        className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 bg-slate-900 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all hover:bg-indigo-600 shadow-lg shadow-slate-900/20 active:scale-95"
                    >
                        <ScanLine size={12} className="sm:w-3.5 sm:h-3.5" />
                        Scan Hub QR to Check In
                    </button>
                </div>
            )}

            {booking.status === 'active' && (
                <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-50 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <p className="text-[8px] sm:text-[9px] text-indigo-600 font-black uppercase tracking-widest">
                            Session Active
                        </p>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        Enjoy your stay! Go to counter to Check Out.
                    </p>
                </div>
            )}

            {booking.status === 'pending_payment' && (
                <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-50 space-y-3">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 mb-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                            </span>
                            <p className="text-[8px] sm:text-[9px] text-purple-600 font-black uppercase tracking-widest">
                                Awaiting Payment
                            </p>
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                            Total Due: ₱{booking.total_amount?.toFixed(2) || '0.00'}
                        </p>
                    </div>

                    {!booking.voucher_applied && (
                        <button
                            onClick={() => onRedeemVoucher(booking)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-linear-to-r from-amber-500 to-orange-500 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95"
                        >
                            <Ticket size={12} className="sm:w-3.5 sm:h-3.5" />
                            Redeem Voucher
                        </button>
                    )}
                </div>
            )}

            {booking.status === 'completed' && (
                <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-widest">Amount Paid</p>
                        <p className="text-base sm:text-lg font-[1000] italic text-emerald-600 tracking-tighter">
                            ₱{totalPaid.toFixed(2)}
                        </p>
                    </div>

                    {!booking.has_reviewed ? (
                        <button
                            onClick={() => onFeedback(booking)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-linear-to-r from-amber-500 to-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95"
                        >
                            <Star size={12} />
                            Write a Review
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => onFeedback({ ...booking, isEdit: true })}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-blue-100"
                            >
                                <PenSquare size={12} />
                                Edit Review
                            </button>
                            <button
                                onClick={() => onFeedback({ ...booking, isDelete: true })}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-red-100"
                            >
                                <Trash2 size={12} />
                                Delete
                            </button>
                        </div>
                    )}

                    {booking.has_reviewed && booking.is_edited && (
                        <p className="text-[7px] text-amber-600 text-center">(Edited)</p>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Filter Tabs Component ────────────────────────────────────────────────────
const FilterTabs = ({ activeFilter, onFilterChange }) => {
    const [showAll, setShowAll] = useState(false);
    const visibleFilters = showAll ? STATUS_FILTERS : STATUS_FILTERS.slice(0, 4);

    return (
        <div className="relative">
            {/* Horizontal scroll wrapper for mobile */}
            <div className="flex sm:hidden overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2">
                <div className="flex gap-2">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => onFilterChange(f)}
                            className={cn(
                                'px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                                activeFilter === f
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-white text-slate-400 hover:text-slate-900 border border-slate-100'
                            )}
                        >
                            {f === 'all' ? 'All' : f.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Desktop: static buttons */}
            <div className="hidden sm:flex bg-white p-1.5 rounded-4xl border border-slate-100 shadow-sm">
                {STATUS_FILTERS.map((f) => (
                    <button
                        key={f}
                        onClick={() => onFilterChange(f)}
                        className={cn(
                            'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                            activeFilter === f
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-900'
                        )}
                    >
                        {f === 'all' ? 'All' : f.replace('_', ' ')}
                    </button>
                ))}
            </div>
        </div>
    );
};

// Update the handleFeedback function and modal rendering

// ── Main Page ─────────────────────────────────────────────────────────────────
const UserBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [scanningBooking, setScanningBooking] = useState(null);
    const [voucherBooking, setVoucherBooking] = useState(null);
    const [userPoints, setUserPoints] = useState(0);
    const [feedbackBooking, setFeedbackBooking] = useState(null);
    const [editingReview, setEditingReview] = useState(null);
    const [userReviews, setUserReviews] = useState([]);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const statusParam = activeFilter !== 'all' ? `?status=${activeFilter}` : '';
            const res = await apiGet(`/user/bookings${statusParam}`);
            setBookings(res.data?.bookings || []);
            setUserPoints(res.data?.points || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [activeFilter]);

    const fetchUserReviews = useCallback(async () => {
        try {
            const res = await apiGet('/user/reviews');
            if (res.success) {
                console.log('Fetched reviews:', res.data.reviews); // Debug log
                setUserReviews(res.data.reviews);
            }
        } catch (err) {
            console.error('Failed to fetch reviews:', err);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
        fetchUserReviews();
    }, [fetchBookings, fetchUserReviews]);

    const handleDeleteReview = async (booking) => {
        const review = userReviews.find(r => {
            const reviewBookingId = r.booking_id?._id || r.booking_id;
            return reviewBookingId?.toString() === booking._id.toString();
        });

        if (!review) {
            showToast({
                icon: 'error',
                title: 'Review not found',
                text: 'Unable to find the review to delete.'
            });
            return;
        }

        if (confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
            try {
                const res = await apiDelete(`/user/reviews/${review._id}`);
                if (res.success) {
                    showToast({
                        icon: 'success',
                        title: 'Review deleted successfully!'
                    });
                    fetchBookings();
                    fetchUserReviews();
                }
            } catch (err) {
                showToast({
                    icon: 'error',
                    title: 'Failed to delete review',
                    text: err.response?.data?.message || err.message
                });
            }
        }
    };

    /// Handle edit button click - FIXED comparison
    const handleEditClick = (booking) => {
        console.log('Looking for review with booking_id:', booking._id);
        console.log('Available reviews:', userReviews);

        // Convert both to string for comparison
        const review = userReviews.find(r => {
            const reviewBookingId = r.booking_id?._id || r.booking_id;
            return reviewBookingId?.toString() === booking._id.toString();
        });

        console.log('Found review:', review);

        if (review) {
            setEditingReview(review);
        } else {
            console.error('Review not found for booking:', booking._id);
            showToast({
                icon: 'error',
                title: 'Review not found',
                text: 'Unable to find the review for editing. Please try again.'
            });
        }
    };


    // Handle feedback from BookingCard
    const handleBookingAction = (item) => {
        if (item.isEdit) {
            handleEditClick(item);
        } else if (item.isDelete) {
            handleDeleteReview(item);
        } else {
            setFeedbackBooking(item);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 sm:pb-32 selection:bg-indigo-100 animate-in fade-in duration-700">
            {/* Header Section */}
            <section className="pt-6 sm:pt-8 pb-8 sm:pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8">
                    <div className="relative">
                        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 sm:mb-6 rounded-full bg-indigo-50 border border-indigo-100">
                            <Zap size={10} className="text-indigo-600 fill-indigo-600" />
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                Booking History
                            </span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[1000] italic tracking-tighter uppercase leading-[0.85] mb-3 sm:mb-4 text-slate-900">
                            My <br /><span className="text-indigo-600">Bookings.</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md">
                            Review your past sessions and active hub visits.
                        </p>

                        {/* Points Display */}
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-50 border border-amber-200">
                            <Coins size={14} className="text-amber-600" />
                            <span className="text-[10px] sm:text-xs font-black uppercase text-amber-700">
                                Available Points: {userPoints}
                            </span>
                        </div>
                    </div>

                    <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />
                </div>
            </section>

            {/* Bookings Grid */}
            <section className="px-4 sm:px-6 max-w-7xl mx-auto">
                {loading ? (
                    <LoadingSpinner />
                ) : bookings.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                        {bookings.map((b) => (
                            <BookingCard
                                key={b._id}
                                booking={b}
                                userPoints={userPoints}
                                onScan={setScanningBooking}
                                onRedeemVoucher={setVoucherBooking}
                                onFeedback={handleBookingAction}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Modals */}
            {scanningBooking && (
                <QRScannerModal
                    booking={scanningBooking}
                    onClose={() => setScanningBooking(null)}
                    onSuccess={fetchBookings}
                />
            )}
            {voucherBooking && (
                <VoucherRedeemModal
                    booking={voucherBooking}
                    userPoints={userPoints}
                    onClose={() => setVoucherBooking(null)}
                    onSuccess={fetchBookings}
                />
            )}

            {/* Create Review Modal */}
            {feedbackBooking && (
                <FeedbackModal
                    booking={feedbackBooking}
                    onClose={() => setFeedbackBooking(null)}
                    onSuccess={() => {
                        fetchBookings();
                        fetchUserReviews();
                    }}
                />
            )}

            {editingReview && (
                <FeedbackModal
                    booking={null}
                    review={editingReview}
                    onClose={() => setEditingReview(null)}
                    onSuccess={() => {
                        fetchBookings();
                        fetchUserReviews();
                        setEditingReview(null);
                    }}
                />
            )}
        </div>
    );
};

export default UserBookings;