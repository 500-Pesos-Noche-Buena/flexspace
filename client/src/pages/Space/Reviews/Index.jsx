// pages/space/reviews/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/Api';
import { 
    Star, StarOff, ThumbsUp, MessageCircle, Calendar, User, Loader2, 
    Reply, Edit2, Trash2, X, Send, Filter, ChevronDown, AlertCircle
} from 'lucide-react';
import { showToast, showConfirm } from '@/components/ui/SweetAlert2';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const SpaceReviewList = () => {
    const [reviews, setReviews] = useState([]);
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSpaceId, setSelectedSpaceId] = useState('');
    const [filterRating, setFilterRating] = useState(null);
    const [sortBy, setSortBy] = useState('newest');
    const [stats, setStats] = useState({
        total_reviews: 0,
        average_rating: 0,
        rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    });
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
    
    // Reply states
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [editingReply, setEditingReply] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedSpaceId) params.append('spaceId', selectedSpaceId);
            if (filterRating) params.append('rating', filterRating);
            if (sortBy) params.append('sort', sortBy);
            params.append('page', pagination.page);
            params.append('limit', 10);
            
            const response = await apiGet(`/space/reviews?${params.toString()}`);
            
            if (response.success) {
                setReviews(response.data.reviews || []);
                setSpaces(response.data.spaces || []);
                setStats(response.data.stats || {
                    total_reviews: 0,
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
    }, [selectedSpaceId, filterRating, sortBy, pagination.page]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

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

    const StarRating = ({ rating, size = 16 }) => (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <span key={star}>
                    {rating >= star ? (
                        <Star size={size} className="fill-amber-400 text-amber-400" />
                    ) : (
                        <StarOff size={size} className="text-slate-300" />
                    )}
                </span>
            ))}
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-12">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Customer Reviews</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">
                    Manage and respond to customer feedback
                </p>
            </div>

            {/* Stats Cards */}
            {stats.total_reviews > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-linear-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-5 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Total Reviews</p>
                        <p className="text-3xl font-[1000] text-white italic mt-2">{stats.total_reviews}</p>
                    </div>
                    <div className="bg-linear-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-5 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Average Rating</p>
                        <div className="flex items-center gap-2 mt-2">
                            <StarRating rating={stats.average_rating} size={20} />
                            <p className="text-3xl font-[1000] text-white italic">{stats.average_rating.toFixed(1)}</p>
                        </div>
                    </div>
                    <div className="bg-linear-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-5 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">5-Star Reviews</p>
                        <p className="text-3xl font-[1000] text-white italic mt-2">{stats.rating_breakdown?.[5] || 0}</p>
                    </div>
                    <div className="bg-linear-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-5 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Response Rate</p>
                        <p className="text-3xl font-[1000] text-white italic mt-2">
                            {Math.round((reviews.filter(r => r.reply).length / (stats.total_reviews || 1)) * 100)}%
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Space Filter */}
                    <div className="flex-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                            Filter by Space
                        </label>
                        <div className="relative">
                            <select
                                value={selectedSpaceId}
                                onChange={(e) => setSelectedSpaceId(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-amber-500 outline-none appearance-none cursor-pointer"
                            >
                                <option value="">All Spaces</option>
                                {spaces.map(space => (
                                    <option key={space._id} value={space._id}>{space.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>

                    {/* Rating Filter */}
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                            Rating
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterRating(null)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    !filterRating 
                                        ? "bg-amber-500 text-white" 
                                        : "bg-white/5 text-slate-400 hover:bg-white/10"
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
                                            ? "bg-amber-500 text-white" 
                                            : "bg-white/5 text-slate-400 hover:bg-white/10"
                                    )}
                                >
                                    {rating}★
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sort */}
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                            Sort By
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-amber-500 outline-none"
                        >
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
                    <Loader2 size={40} className="animate-spin text-amber-500" />
                </div>
            ) : reviews.length === 0 ? (
                <div className="text-center py-20 bg-[#111114] border border-white/5 rounded-3xl">
                    <MessageCircle size={64} className="mx-auto text-slate-700 mb-4" />
                    <p className="text-lg text-slate-500 font-medium">No reviews yet</p>
                    <p className="text-sm text-slate-600 mt-2">When customers leave reviews, they'll appear here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review._id} className="bg-[#111114] border border-white/5 rounded-2xl p-6 hover:border-amber-500/30 transition-all">
                            {/* Review Header */}
                            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <StarRating rating={review.rating} size={18} />
                                        {review.is_verified_booking && (
                                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                                Verified Booking
                                            </span>
                                        )}
                                        {review.is_edited && (
                                            <span className="text-[10px] bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full">
                                                Edited
                                            </span>
                                        )}
                                    </div>
                                    
                                    {review.title && (
                                        <h4 className="font-bold text-white text-base mb-2">
                                            {review.title}
                                        </h4>
                                    )}
                                    
                                    <p className="text-slate-300 leading-relaxed">
                                        {review.comment}
                                    </p>
                                </div>
                                
                                <div className="text-right">
                                    <p className="text-sm font-bold text-amber-400">{review.space?.name}</p>
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
                                            className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-white/10"
                                            onClick={() => window.open(img, '_blank')}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Customer Info */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-4 text-sm text-slate-500">
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
                                </div>
                                <div className="flex items-center gap-1 text-sm text-slate-500">
                                    <ThumbsUp size={14} />
                                    <span>{review.helpful_count} found this helpful</span>
                                </div>
                            </div>

                            {/* Reply Section */}
                            {review.reply ? (
                                <div className="mt-4 ml-4 pl-4 border-l-2 border-amber-500 bg-amber-500/5 p-4 rounded-r-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                            <Reply size={12} /> Your Response
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingReply(review._id);
                                                    setReplyText(review.reply.text);
                                                }}
                                                className="p-1 hover:bg-amber-500/20 rounded transition-colors"
                                            >
                                                <Edit2 size={14} className="text-amber-400" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteReply(review._id)}
                                                className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                            >
                                                <Trash2 size={14} className="text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-300">{review.reply.text}</p>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                        Replied on {new Date(review.reply.created_at).toLocaleDateString()}
                                        {review.reply.updated_at !== review.reply.created_at && ' (Edited)'}
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4">
                                    {replyingTo === review._id ? (
                                        <div className="flex gap-3 items-start">
                                            <textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Write your reply to this customer..."
                                                rows="3"
                                                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500 outline-none resize-none"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleReply(review._id)}
                                                    disabled={submitting}
                                                    className="px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-xs disabled:opacity-50 hover:bg-amber-600 transition"
                                                >
                                                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setReplyingTo(null);
                                                        setReplyText('');
                                                    }}
                                                    className="px-4 py-2 bg-white/5 text-slate-400 rounded-xl hover:bg-white/10 transition"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setReplyingTo(review._id)}
                                            className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition font-medium"
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
                        className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition text-sm font-medium"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-slate-400">
                        Page {pagination.page} of {pagination.pages}
                    </span>
                    <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                        disabled={pagination.page === pagination.pages}
                        className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition text-sm font-medium"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Edit Reply Modal */}
            {editingReply && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#111114] border border-white/10 rounded-2xl p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Edit Reply</h3>
                            <button
                                onClick={() => {
                                    setEditingReply(null);
                                    setReplyText('');
                                }}
                                className="p-1 hover:bg-white/10 rounded-lg transition"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows="4"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-500 outline-none resize-none"
                            placeholder="Edit your reply..."
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => handleUpdateReply(editingReply)}
                                disabled={submitting}
                                className="flex-1 py-2 bg-amber-500 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-amber-600 transition"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Update Reply'}
                            </button>
                            <button
                                onClick={() => {
                                    setEditingReply(null);
                                    setReplyText('');
                                }}
                                className="flex-1 py-2 bg-white/5 text-slate-400 rounded-xl font-bold hover:bg-white/10 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpaceReviewList;