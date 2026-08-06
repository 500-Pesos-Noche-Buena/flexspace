import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/Api';
import { EditReplyModal } from '@/components/modal';
import { 
    Star, StarOff, ThumbsUp, MessageCircle, Calendar, User, Loader2, 
    Reply, Edit2, Trash2, X, Send, Filter, ChevronDown, AlertCircle,
    CheckCircle, XCircle
} from 'lucide-react';
import { showToast, showConfirm } from '@/components/ui/SweetAlert2';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

const SpaceReviewList = () => {
    const { themeColor } = useTheme();
    const [reviews, setReviews] = useState([]);
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSpaceId, setSelectedSpaceId] = useState('');
    const [filterRating, setFilterRating] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all'); // ✅ New: all, pending, approved
    const [sortBy, setSortBy] = useState('pending_first'); // ✅ New: pending_first by default
    const [stats, setStats] = useState({
        total_reviews: 0,
        pending_reviews: 0,
        approved_reviews: 0,
        average_rating: 0,
        rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    });
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
    
    // Reply states
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [editingReply, setEditingReply] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedSpaceId) params.append('spaceId', selectedSpaceId);
            if (filterRating) params.append('rating', filterRating);
            if (filterStatus !== 'all') params.append('status', filterStatus);
            if (sortBy) params.append('sort', sortBy);
            params.append('page', pagination.page);
            params.append('limit', 10);
            
            const response = await apiGet(`/space/reviews?${params.toString()}`);
            
            if (response.success) {
                setReviews(response.data.reviews || []);
                setSpaces(response.data.spaces || []);
                setStats(response.data.stats || {
                    total_reviews: 0,
                    pending_reviews: 0,
                    approved_reviews: 0,
                    average_rating: 0,
                    rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                });
                setPagination({
                    page: response.data.pagination?.page || 1,
                    total: response.data.pagination?.total || 0,
                    pages: response.data.pagination?.pages || 0
                });
            }
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
            showToast({ icon: 'error', title: 'Failed to load reviews' });
        } finally {
            setLoading(false);
        }
    }, [selectedSpaceId, filterRating, filterStatus, sortBy, pagination.page]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    // ✅ Approve review
    const handleApproveReview = async (reviewId) => {
        if (await showConfirm('Approve this review?', 'This review will be published and visible to all users.')) {
            try {
                const response = await apiPost(`/space/reviews/${reviewId}/approve`);
                if (response.success) {
                    showToast({ icon: 'success', title: 'Review approved successfully!' });
                    fetchReviews();
                }
            } catch (error) {
                console.error('Failed to approve review:', error);
                showToast({ icon: 'error', title: error.response?.data?.message || 'Failed to approve review' });
            }
        }
    };

    // ✅ Reject review
    const handleRejectReview = async (reviewId) => {
        if (await showConfirm('Reject this review?', 'This review will be hidden and not visible to users.')) {
            try {
                const response = await apiPost(`/space/reviews/${reviewId}/reject`);
                if (response.success) {
                    showToast({ icon: 'success', title: 'Review rejected' });
                    fetchReviews();
                }
            } catch (error) {
                console.error('Failed to reject review:', error);
                showToast({ icon: 'error', title: error.response?.data?.message || 'Failed to reject review' });
            }
        }
    };

    const handleReply = async (reviewId) => {
        if (!replyText.trim()) {
            showToast({ icon: 'warning', title: 'Please enter a reply' });
            return;
        }
        
        setSubmitting(true);
        try {
            const response = await apiPost(`/space/reviews/${reviewId}/reply`, {
                replyText: replyText.trim()
            });
            
            if (response.success) {
                showToast({ icon: 'success', title: 'Reply added successfully' });
                setReplyingTo(null);
                setReplyText('');
                fetchReviews();
            }
        } catch (error) {
            console.error('Failed to reply:', error);
            showToast({ icon: 'error', title: error.response?.data?.message || 'Failed to add reply' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateReply = async (reviewId) => {
        if (!replyText.trim()) {
            showToast({ icon: 'warning', title: 'Please enter a reply' });
            return;
        }
        
        setSubmitting(true);
        try {
            const response = await apiPut(`/space/reviews/${reviewId}/reply`, {
                replyText: replyText.trim()
            });
            
            if (response.success) {
                showToast({ icon: 'success', title: 'Reply updated successfully' });
                setShowEditModal(false);
                setEditingReply(null);
                setReplyText('');
                fetchReviews();
            }
        } catch (error) {
            console.error('Failed to update reply:', error);
            showToast({ icon: 'error', title: error.response?.data?.message || 'Failed to update reply' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteReply = async (reviewId) => {
        if (await showConfirm('Delete this reply?', 'This action cannot be undone.')) {
            try {
                const response = await apiDelete(`/space/reviews/${reviewId}/reply`);
                if (response.success) {
                    showToast({ icon: 'success', title: 'Reply deleted successfully' });
                    fetchReviews();
                }
            } catch (error) {
                console.error('Failed to delete reply:', error);
                showToast({ icon: 'error', title: 'Failed to delete reply' });
            }
        }
    };

    const openEditModal = (reviewId, currentReplyText) => {
        setEditingReply(reviewId);
        setReplyText(currentReplyText);
        setShowEditModal(true);
    };

    const StarRating = ({ rating, size = 16 }) => (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <span key={star}>
                    {rating >= star ? (
                        <Star size={size} className="fill-amber-400 text-amber-400" />
                    ) : (
                        <StarOff size={size} className="text-muted-foreground" />
                    )}
                </span>
            ))}
        </div>
    );

    const getButtonHoverColor = () => {
        const colors = {
            indigo: 'hover:bg-indigo-600',
            emerald: 'hover:bg-emerald-600',
            purple: 'hover:bg-purple-600',
            blue: 'hover:bg-blue-600',
            rose: 'hover:bg-rose-600',
            amber: 'hover:bg-amber-600',
        };
        return colors[themeColor] || colors.indigo;
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-12">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-black text-foreground tracking-tight uppercase italic">Customer Reviews</h1>
                <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest">
                    Manage and respond to customer feedback
                </p>
            </div>

            {/* Stats Cards */}
            {stats.total_reviews > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-linear-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-5 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Total Reviews</p>
                        <p className="text-3xl font-[1000] text-foreground italic mt-2">{stats.total_reviews}</p>
                    </div>
                    <div className="bg-linear-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-5 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Average Rating</p>
                        <div className="flex items-center gap-2 mt-2">
                            <StarRating rating={stats.average_rating} size={20} />
                            <p className="text-3xl font-[1000] text-foreground italic">{stats.average_rating.toFixed(1)}</p>
                        </div>
                    </div>
                    <div className="bg-linear-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-5 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">5-Star Reviews</p>
                        <p className="text-3xl font-[1000] text-foreground italic mt-2">{stats.rating_breakdown?.[5] || 0}</p>
                    </div>
                    <div className="bg-linear-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 p-5 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Approved</p>
                        <p className="text-3xl font-[1000] text-emerald-600 dark:text-emerald-400 italic mt-2">{stats.approved_reviews || 0}</p>
                    </div>
                    <div className="bg-linear-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 p-5 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Pending Approval</p>
                        <p className="text-3xl font-[1000] text-amber-600 dark:text-amber-400 italic mt-2">{stats.pending_reviews || 0}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Space Filter */}
                    <div className="flex-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
                            Filter by Space
                        </label>
                        <div className="relative">
                            <select
                                value={selectedSpaceId}
                                onChange={(e) => setSelectedSpaceId(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:border-primary outline-none appearance-none cursor-pointer"
                            >
                                <option value="">All Spaces</option>
                                {spaces.map(space => (
                                    <option key={space._id} value={space._id}>{space.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>

                    {/* Status Filter - NEW */}
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
                            Status
                        </label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:border-primary outline-none"
                        >
                            <option value="all">All</option>
                            <option value="pending">Pending Approval</option>
                            <option value="approved">Approved</option>
                        </select>
                    </div>

                    {/* Rating Filter */}
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
                            Rating
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setFilterRating(null)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    !filterRating 
                                        ? "bg-primary text-primary-foreground" 
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                            >
                                All
                            </button>
                            {[5, 4, 3, 2, 1].map((rating) => (
                                <button
                                    key={rating}
                                    onClick={() => setFilterRating(rating)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                                        filterRating === rating 
                                            ? "bg-primary text-primary-foreground" 
                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    )}
                                >
                                    {rating}★
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sort */}
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
                            Sort By
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:border-primary outline-none"
                        >
                            <option value="pending_first">Pending First</option>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="highest">Highest Rated</option>
                            <option value="lowest">Lowest Rated</option>
                            <option value="most_helpful">Most Helpful</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-primary" />
                </div>
            ) : reviews.length === 0 ? (
                <div className="text-center py-20 bg-card border border-border rounded-3xl">
                    <MessageCircle size={64} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg text-muted-foreground font-medium">No reviews yet</p>
                    <p className="text-sm text-muted-foreground/60 mt-2">When customers leave reviews, they'll appear here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review._id} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all">
                            {/* Review Header */}
                            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <StarRating rating={review.rating} size={18} />
                                        {review.is_verified_booking && (
                                            <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                                Verified Booking
                                            </span>
                                        )}
                                        {/* ✅ Pending Badge */}
                                        {review.status === 'pending' && (
                                            <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                                Pending Approval
                                            </span>
                                        )}
                                        {review.is_edited && (
                                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                                Edited
                                            </span>
                                        )}
                                    </div>

                                    {review.title && (
                                        <h4 className="font-bold text-foreground text-base mb-2">
                                            {review.title}
                                        </h4>
                                    )}
                                    
                                    <p className="text-foreground/80 leading-relaxed">
                                        {review.comment}
                                    </p>
                                </div>
                                
                                <div className="text-right">
                                    <p className="text-sm font-bold text-primary">{review.space?.name}</p>
                                    {review.status === 'pending' && (
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => handleApproveReview(review._id)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1 transition-all"
                                            >
                                                <CheckCircle size={12} /> Approve
                                            </button>
                                            <button
                                                onClick={() => handleRejectReview(review._id)}
                                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1 transition-all"
                                            >
                                                <XCircle size={12} /> Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Review Images */}
                            {review.images && review.images.length > 0 && (
                                <div className="flex gap-2 mt-3 mb-4 overflow-x-auto">
                                    {review.images.slice(0, 5).map((img, idx) => (
                                        <img
                                            key={idx}
                                            src={img}
                                            alt={`Review ${idx + 1}`}
                                            className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-border"
                                            onClick={() => window.open(img, '_blank')}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Customer Info */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <User size={14} />
                                        <span>{review.customer?.name || review.guest_name || 'Anonymous'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        <span>{new Date(review.created_at).toLocaleDateString('en-PH', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}</span>
                                    </div>
                                    {review.status === 'approved' && (
                                        <div className="flex items-center gap-1">
                                            <CheckCircle size={14} className="text-emerald-500" />
                                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">Approved</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <ThumbsUp size={14} />
                                    <span>{review.helpful_count} found this helpful</span>
                                </div>
                            </div>

                            {/* Reply Section */}
                            {review.reply ? (
                                <div className="mt-4 ml-4 pl-4 border-l-2 border-primary bg-primary/5 p-4 rounded-r-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                            <Reply size={12} /> Your Response
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(review._id, review.reply.text)}
                                                className="p-1 hover:bg-primary/20 rounded transition-colors"
                                            >
                                                <Edit2 size={14} className="text-primary" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteReply(review._id)}
                                                className="p-1 hover:bg-rose-500/20 rounded transition-colors"
                                            >
                                                <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-foreground/80">{review.reply.text}</p>
                                    <p className="text-[10px] text-muted-foreground mt-2">
                                        Replied on {new Date(review.reply.created_at).toLocaleDateString()}
                                        {review.reply.updated_at !== review.reply.created_at && ' (Edited)'}
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4">
                                    {replyingTo === review._id ? (
                                        <div className="flex gap-3 items-start flex-wrap">
                                            <textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Write your reply to this customer..."
                                                rows="3"
                                                className="flex-1 min-w-50 px-4 py-2 bg-background border border-border rounded-xl text-foreground text-sm focus:border-primary outline-none resize-none"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleReply(review._id)}
                                                    disabled={submitting}
                                                    className={cn(
                                                        "px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-xs disabled:opacity-50 transition",
                                                        getButtonHoverColor()
                                                    )}
                                                >
                                                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setReplyingTo(null);
                                                        setReplyText('');
                                                    }}
                                                    className="px-4 py-2 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80 transition"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setReplyingTo(review._id)}
                                            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition font-medium"
                                        >
                                            <Reply size={14} /> Reply to this review
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex justify-center gap-2 mt-8 pt-4">
                    <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 rounded-xl bg-muted text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition text-sm font-medium"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-muted-foreground">
                        Page {pagination.page} of {pagination.pages}
                    </span>
                    <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                        disabled={pagination.page === pagination.pages}
                        className="px-4 py-2 rounded-xl bg-muted text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition text-sm font-medium"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Edit Reply Modal */}
            <EditReplyModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingReply(null);
                    setReplyText('');
                }}
                replyText={replyText}
                setReplyText={setReplyText}
                onSubmit={() => handleUpdateReply(editingReply)}
                isSubmitting={submitting}
            />
        </div>
    );
};

export default SpaceReviewList;