// pages/landing/CustomerReviews.jsx
import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { Star, StarOff, MessageCircle, User, Calendar, ThumbsUp, Quote, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';

const CustomerReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState({ total_reviews: 0, average_rating: 0 });
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedRating, setSelectedRating] = useState(null);
    const [likedReviews, setLikedReviews] = useState({});
    const itemsPerPage = 3;

    useEffect(() => {
        fetchReviews();
        // Load liked reviews from localStorage
        const savedLikes = localStorage.getItem('likedReviews');
        if (savedLikes) {
            setLikedReviews(JSON.parse(savedLikes));
        }
    }, []);

    const fetchReviews = async () => {
        try {
            const response = await apiGet('/landing/reviews');
            if (response.success) {
                setReviews(response.data.reviews);
                setStats(response.data.stats);
            }
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (reviewId) => {
        // Disable button immediately
        const likeButton = document.getElementById(`like-btn-${reviewId}`);
        if (likeButton) likeButton.disabled = true;

        try {
            const response = await apiPost(`/landing/reviews/${reviewId}/like`);
            if (response.success) {
                setReviews(prevReviews => prevReviews.map(review =>
                    review._id === reviewId
                        ? { ...review, helpful_count: response.data.helpful_count }
                        : review
                ));
                showToast({ icon: 'success', title: 'Thanks for your feedback!', text: 'You found this review helpful!' });
            }
        } catch (error) {
            console.error('Full error object:', error);
            console.error('Error response:', error.response);
            console.error('Error response data:', error.response?.data);

            // Get message from backend response
            let errorMessage = 'Please try again';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            showToast({
                icon: 'info',
                title: 'Already Liked',
                text: errorMessage
            });

            // Re-enable button on error
            if (likeButton) likeButton.disabled = false;
        }
    };

    const filteredReviews = selectedRating
        ? reviews.filter(r => r.rating === selectedRating)
        : reviews;

    const displayedReviews = filteredReviews.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
    );

    const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);

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

    if (loading) {
        return (
            <div className="bg-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="animate-pulse">Loading reviews...</div>
                </div>
            </div>
        );
    }

    if (reviews.length === 0) {
        return null;
    }

    return (
        <div className="bg-linear-to-br from-slate-50 to-white py-20">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider mb-4">
                        <Heart size={12} className="fill-amber-600" />
                        Customer Love
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                        What Our <span className="text-amber-500">Community</span> Says
                    </h2>
                    <p className="text-slate-500 max-w-2xl mx-auto">
                        Join thousands of satisfied remote workers who found their perfect workspace with FlexSpace
                    </p>

                    {/* Stats Cards */}
                    <div className="flex flex-wrap justify-center gap-8 mt-8">
                        <div className="text-center">
                            <p className="text-3xl font-black text-amber-500">{stats.total_reviews}+</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Reviews</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center gap-1 justify-center">
                                <StarRating rating={stats.average_rating} size={20} />
                                <p className="text-3xl font-black text-amber-500 ml-2">{stats.average_rating}</p>
                            </div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Average Rating</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-black text-amber-500">100%</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Verified Bookings</p>
                        </div>
                    </div>
                </div>

                {/* Rating Filter */}
                <div className="flex flex-wrap justify-center gap-2 mb-10">
                    <button
                        onClick={() => setSelectedRating(null)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${!selectedRating
                                ? 'bg-amber-500 text-white shadow-lg'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300'
                            }`}
                    >
                        All
                    </button>
                    {[5, 4, 3, 2, 1].map(rating => (
                        <button
                            key={rating}
                            onClick={() => setSelectedRating(rating)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1 ${selectedRating === rating
                                    ? 'bg-amber-500 text-white shadow-lg'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300'
                                }`}
                        >
                            {rating} <Star size={12} className={selectedRating === rating ? 'text-white' : 'text-amber-400'} />
                        </button>
                    ))}
                </div>

                {/* Reviews Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {displayedReviews.map((review, index) => (
                        <div
                            key={review._id}
                            className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all group"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Quote Icon */}
                            <div className="mb-4">
                                <Quote size={32} className="text-amber-200 group-hover:text-amber-300 transition-colors" />
                            </div>

                            {/* Review Content */}
                            <p className="text-slate-600 leading-relaxed mb-4 min-h-25">
                                "{review.comment.length > 150 ? `${review.comment.substring(0, 150)}...` : review.comment}"
                            </p>

                            {/* Star Rating */}
                            <div className="mb-3">
                                <StarRating rating={review.rating} size={16} />
                            </div>

                            {/* Reviewer Info */}
                            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
                                    {review.reviewer_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800 text-sm">
                                        {review.reviewer_name}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <span>{review.space_name}</span>
                                        {review.is_verified && (
                                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                        )}
                                        {review.is_verified && (
                                            <span className="text-emerald-600 text-[10px] font-bold">Verified</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    id={`like-btn-${review._id}`}
                                    onClick={() => handleLike(review._id)}
                                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 cursor-pointer transition-all"
                                >
                                    <ThumbsUp size={12} />
                                    <span>{review.helpful_count || 0}</span>
                                </button>
                            </div>

                            {/* Reply Section */}
                            {review.reply && (
                                <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">
                                        Space Owner Response
                                    </p>
                                    <p className="text-xs text-slate-600 italic">
                                        "{review.reply.text}"
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-3 mt-10">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                            disabled={currentPage === 0}
                            className="p-2 rounded-full border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-amber-300 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm text-slate-500">
                            Page {currentPage + 1} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                            disabled={currentPage === totalPages - 1}
                            className="p-2 rounded-full border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-amber-300 transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerReviews;