// pages/landing/CustomerReviews.jsx
import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { Star, StarOff, MessageCircle, User, Calendar, ThumbsUp, Quote, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';

const CustomerReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState({ total_reviews: 0, average_rating: 0 });
    const [loading, setLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [selectedRating, setSelectedRating] = useState(null);
    const [likedReviews, setLikedReviews] = useState({});
    
    // Responsive items per view
    const [itemsPerView, setItemsPerView] = useState(3);
    
    useEffect(() => {
        // Handle responsive items per view
        const handleResize = () => {
            if (window.innerWidth < 640) {
                setItemsPerView(1); // Mobile: 1 card
            } else if (window.innerWidth < 1024) {
                setItemsPerView(2); // Tablet: 2 cards
            } else {
                setItemsPerView(3); // Desktop: 3 cards
            }
        };
        
        handleResize();
        window.addEventListener('resize', handleResize);
        
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

            if (likeButton) likeButton.disabled = false;
        }
    };

    const filteredReviews = selectedRating
        ? reviews.filter(r => r.rating === selectedRating)
        : reviews;

    const totalSlides = Math.ceil(filteredReviews.length / itemsPerView);
    
    const getCurrentReviews = () => {
        const start = currentSlide * itemsPerView;
        const end = start + itemsPerView;
        return filteredReviews.slice(start, end);
    };

    const nextSlide = () => {
        if (currentSlide < totalSlides - 1) {
            setCurrentSlide(currentSlide + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
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

    const currentReviews = getCurrentReviews();

    return (
        <div className="bg-linear-to-br from-slate-50 to-white py-12 md:py-20">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header Section */}
                <div className="text-center mb-8 md:mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider mb-4">
                        <Heart size={12} className="fill-amber-600" />
                        Customer Love
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-3 md:mb-4">
                        What Our <span className="text-amber-500">Community</span> Says
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 max-w-2xl mx-auto px-4">
                        Join thousands of satisfied remote workers who found their perfect workspace with FlexSpace
                    </p>

                    {/* Stats Cards - Responsive */}
                    <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-6 md:mt-8">
                        <div className="text-center">
                            <p className="text-2xl md:text-3xl font-black text-amber-500">{stats.total_reviews}+</p>
                            <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider">Reviews</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center gap-1 justify-center">
                                <StarRating rating={stats.average_rating} size={16} />
                                <p className="text-2xl md:text-3xl font-black text-amber-500 ml-1 md:ml-2">{stats.average_rating}</p>
                            </div>
                            <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider">Average Rating</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl md:text-3xl font-black text-amber-500">100%</p>
                            <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider">Verified Bookings</p>
                        </div>
                    </div>
                </div>

                {/* Rating Filter - Horizontal Scroll on Mobile */}
                <div className="overflow-x-auto pb-4 mb-6 md:mb-10 scrollbar-hide">
                    <div className="flex flex-nowrap justify-center gap-2 min-w-max">
                        <button
                            onClick={() => {
                                setSelectedRating(null);
                                setCurrentSlide(0);
                            }}
                            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all whitespace-nowrap ${!selectedRating
                                    ? 'bg-amber-500 text-white shadow-lg'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300'
                                }`}
                        >
                            All
                        </button>
                        {[5, 4, 3, 2, 1].map(rating => (
                            <button
                                key={rating}
                                onClick={() => {
                                    setSelectedRating(rating);
                                    setCurrentSlide(0);
                                }}
                                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all flex items-center gap-1 whitespace-nowrap ${selectedRating === rating
                                        ? 'bg-amber-500 text-white shadow-lg'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300'
                                    }`}
                            >
                                {rating} <Star size={12} className={selectedRating === rating ? 'text-white' : 'text-amber-400'} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Carousel Section */}
                {filteredReviews.length > 0 && (
                    <div className="relative">
                        {/* Carousel Container */}
                        <div className="overflow-hidden">
                            <div 
                                className="transition-transform duration-300 ease-in-out"
                                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                            >
                                <div className="flex">
                                    {Array.from({ length: totalSlides }).map((_, slideIndex) => (
                                        <div key={slideIndex} className="w-full shrink-0">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                                {filteredReviews.slice(
                                                    slideIndex * itemsPerView,
                                                    (slideIndex + 1) * itemsPerView
                                                ).map((review, index) => (
                                                    <div
                                                        key={review._id}
                                                        className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all group mx-2"
                                                    >
                                                        {/* Quote Icon */}
                                                        <div className="mb-3 md:mb-4">
                                                            <Quote size={24} className="text-amber-200 group-hover:text-amber-300 transition-colors" />
                                                        </div>

                                                        {/* Review Content */}
                                                        <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-3 md:mb-4 min-h-20">
                                                            "{review.comment.length > 120 ? `${review.comment.substring(0, 120)}...` : review.comment}"
                                                        </p>

                                                        {/* Star Rating */}
                                                        <div className="mb-2 md:mb-3">
                                                            <StarRating rating={review.rating} size={14} />
                                                        </div>

                                                        {/* Reviewer Info */}
                                                        <div className="flex items-center gap-2 md:gap-3 pt-2 md:pt-3 border-t border-slate-100">
                                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                                                                {review.reviewer_name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-slate-800 text-xs md:text-sm truncate">
                                                                    {review.reviewer_name}
                                                                </p>
                                                                <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-slate-400">
                                                                    <span className="truncate">{review.space_name}</span>
                                                                    {review.is_verified && (
                                                        <>
                                                                            <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                                                                            <span className="text-emerald-600 font-bold text-[8px] md:text-[10px] shrink-0">Verified</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button
                                                                id={`like-btn-${review._id}`}
                                                                onClick={() => handleLike(review._id)}
                                                                className="flex items-center gap-1 text-[10px] md:text-xs text-slate-400 hover:text-amber-500 cursor-pointer transition-all shrink-0"
                                                            >
                                                                <ThumbsUp size={12} />
                                                                <span>{review.helpful_count || 0}</span>
                                                            </button>
                                                        </div>

                                                        {/* Reply Section */}
                                                        {review.reply && (
                                                            <div className="mt-3 md:mt-4 p-2 md:p-3 bg-amber-50 rounded-lg md:rounded-xl border border-amber-100">
                                                                <p className="text-[8px] md:text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">
                                                                    Space Owner Response
                                                                </p>
                                                                <p className="text-[10px] md:text-xs text-slate-600 italic">
                                                                    "{review.reply.text.length > 80 ? `${review.reply.text.substring(0, 80)}...` : review.reply.text}"
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons - Only show if more than one slide */}
                        {totalSlides > 1 && (
                            <>
                                <button
                                    onClick={prevSlide}
                                    disabled={currentSlide === 0}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 md:-ml-4 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-50 hover:border-amber-300 transition-all z-10"
                                >
                                    <ChevronLeft size={18} className="text-slate-600" />
                                </button>
                                <button
                                    onClick={nextSlide}
                                    disabled={currentSlide === totalSlides - 1}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 -mr-2 md:-mr-4 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-50 hover:border-amber-300 transition-all z-10"
                                >
                                    <ChevronRight size={18} className="text-slate-600" />
                                </button>
                            </>
                        )}

                        {/* Dots Indicator */}
                        {totalSlides > 1 && (
                            <div className="flex justify-center gap-1 md:gap-2 mt-6 md:mt-8">
                                {Array.from({ length: totalSlides }).map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSlide(idx)}
                                        className={`transition-all rounded-full ${
                                            currentSlide === idx
                                                ? 'w-6 md:w-8 h-1.5 md:h-2 bg-amber-500'
                                                : 'w-1.5 md:w-2 h-1.5 md:h-2 bg-slate-300 hover:bg-amber-300'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerReviews;