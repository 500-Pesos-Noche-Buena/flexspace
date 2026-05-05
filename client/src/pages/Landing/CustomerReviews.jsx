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
    const [expandedReviews, setExpandedReviews] = useState({}); // NEW: Track expanded state
    
    // Responsive items per view
    const [itemsPerView, setItemsPerView] = useState(3);
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 640) {
                setItemsPerView(1);
                setIsMobile(true);
                setIsTablet(false);
            } else if (width < 1024) {
                setItemsPerView(2);
                setIsMobile(false);
                setIsTablet(true);
            } else {
                setItemsPerView(3);
                setIsMobile(false);
                setIsTablet(false);
            }
        };
        
        handleResize();
        window.addEventListener('resize', handleResize);
        
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchReviews();
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

    // Toggle expanded state for a review
    const toggleExpand = (reviewId) => {
        setExpandedReviews(prev => ({
            ...prev,
            [reviewId]: !prev[reviewId]
        }));
    };

    const filteredReviews = selectedRating
        ? reviews.filter(r => r.rating === selectedRating)
        : reviews;

    const totalSlides = Math.ceil(filteredReviews.length / itemsPerView);
    
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

    const StarRating = ({ rating, size = 14 }) => (
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

    // Check if text needs truncation
    const needsTruncation = (text, isMobile, isTablet) => {
        if (isMobile) return text.length > 80;
        if (isTablet) return text.length > 100;
        return text.length > 150;
    };

    // Get display text based on expanded state
    const getDisplayText = (text, isExpanded, isMobile, isTablet) => {
        if (isExpanded) return text;
        if (isMobile) return text.length > 80 ? `${text.substring(0, 80)}...` : text;
        if (isTablet) return text.length > 100 ? `${text.substring(0, 100)}...` : text;
        return text.length > 150 ? `${text.substring(0, 150)}...` : text;
    };

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
        <div className="bg-gradient-to-br from-slate-50 to-white py-8 sm:py-12 md:py-20">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
                {/* Header Section */}
                <div className="text-center mb-6 sm:mb-8 md:mb-12">
                    <div className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-3 sm:mb-4">
                        <Heart size={10} className="fill-amber-600" />
                        Customer Love
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-2 sm:mb-3 md:mb-4">
                        What Our <span className="text-amber-500">Community</span> Says
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-slate-500 max-w-2xl mx-auto px-4">
                        Join thousands of satisfied remote workers who found their perfect workspace with FlexSpace
                    </p>

                    {/* Stats Cards - Responsive */}
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-8 mt-5 sm:mt-6 md:mt-8">
                        <div className="text-center">
                            <p className="text-xl sm:text-2xl md:text-3xl font-black text-amber-500">{stats.total_reviews}+</p>
                            <p className="text-[8px] sm:text-[9px] md:text-xs text-slate-500 uppercase tracking-wider">Reviews</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center gap-1 justify-center">
                                <StarRating rating={stats.average_rating} size={12} />
                                <p className="text-xl sm:text-2xl md:text-3xl font-black text-amber-500 ml-1">{stats.average_rating}</p>
                            </div>
                            <p className="text-[8px] sm:text-[9px] md:text-xs text-slate-500 uppercase tracking-wider">Average Rating</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl sm:text-2xl md:text-3xl font-black text-amber-500">100%</p>
                            <p className="text-[8px] sm:text-[9px] md:text-xs text-slate-500 uppercase tracking-wider">Verified</p>
                        </div>
                    </div>
                </div>

                {/* Rating Filter - Horizontal Scroll on Mobile */}
                <div className="overflow-x-auto pb-3 mb-5 sm:mb-6 md:mb-10 scrollbar-hide">
                    <div className="flex flex-nowrap justify-center gap-1.5 sm:gap-2 min-w-max px-2">
                        <button
                            onClick={() => {
                                setSelectedRating(null);
                                setCurrentSlide(0);
                            }}
                            className={`px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full text-[10px] sm:text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                                !selectedRating
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
                                className={`px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full text-[10px] sm:text-xs md:text-sm font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                                    selectedRating === rating
                                        ? 'bg-amber-500 text-white shadow-lg'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300'
                                }`}
                            >
                                {rating} <Star size={10} className={selectedRating === rating ? 'text-white' : 'text-amber-400'} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Carousel Section */}
                {filteredReviews.length > 0 && (
                    <div className="relative px-2 sm:px-4 md:px-8">
                        {/* Carousel Container */}
                        <div className="overflow-hidden">
                            <div 
                                className="flex transition-transform duration-300 ease-in-out"
                                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                            >
                                {Array.from({ length: totalSlides }).map((_, slideIndex) => (
                                    <div key={slideIndex} className="w-full flex-shrink-0">
                                        <div className={`
                                            grid gap-3 sm:gap-4 md:gap-6
                                            ${itemsPerView === 1 ? 'grid-cols-1' : ''}
                                            ${itemsPerView === 2 ? 'grid-cols-1 sm:grid-cols-2' : ''}
                                            ${itemsPerView === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : ''}
                                        `}>
                                            {filteredReviews.slice(
                                                slideIndex * itemsPerView,
                                                (slideIndex + 1) * itemsPerView
                                            ).map((review) => {
                                                const isExpanded = expandedReviews[review._id];
                                                const shouldTruncate = needsTruncation(review.comment, isMobile, isTablet);
                                                const displayText = getDisplayText(review.comment, isExpanded, isMobile, isTablet);
                                                
                                                return (
                                                    <div
                                                        key={review._id}
                                                        className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all group h-full flex flex-col"
                                                    >
                                                        {/* Quote Icon */}
                                                        <div className="mb-2 sm:mb-3 md:mb-4">
                                                            <Quote size={20} className="text-amber-200 group-hover:text-amber-300 transition-colors" />
                                                        </div>

                                                        {/* Review Content with Read More/Show Less */}
                                                        <div className="mb-2 sm:mb-3">
                                                            <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed break-words">
                                                                "{displayText}"
                                                            </p>
                                                            {shouldTruncate && (
                                                                <button
                                                                    onClick={() => toggleExpand(review._id)}
                                                                    className="text-amber-500 text-[10px] sm:text-xs font-semibold mt-1 hover:text-amber-600 transition-colors"
                                                                >
                                                                    {isExpanded ? 'Show less' : 'Read more'}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Star Rating */}
                                                        <div className="mb-2 sm:mb-3">
                                                            <StarRating rating={review.rating} size={12} />
                                                        </div>

                                                        {/* Reviewer Info - Responsive */}
                                                        <div className="flex items-center gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-slate-100">
                                                            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                                                                {review.reviewer_name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-slate-800 text-[11px] sm:text-xs md:text-sm truncate">
                                                                    {review.reviewer_name}
                                                                </p>
                                                                <div className="flex items-center gap-1 text-[8px] sm:text-[9px] md:text-xs text-slate-400 flex-wrap">
                                                                    <span className="truncate max-w-[100px] sm:max-w-[120px]">{review.space_name}</span>
                                                                    {review.is_verified && (
                                                                        <>
                                                                            <span className="w-0.5 h-0.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                                                            <span className="text-emerald-600 font-bold text-[7px] sm:text-[8px] md:text-[10px] flex-shrink-0">Verified</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button
                                                                id={`like-btn-${review._id}`}
                                                                onClick={() => handleLike(review._id)}
                                                                className="flex items-center gap-1 text-[9px] sm:text-[10px] md:text-xs text-slate-400 hover:text-amber-500 cursor-pointer transition-all flex-shrink-0"
                                                            >
                                                                <ThumbsUp size={10} />
                                                                <span>{review.helpful_count || 0}</span>
                                                            </button>
                                                        </div>

                                                        {/* Reply Section with Read More */}
                                                        {review.reply && (
                                                            <div className="mt-2 sm:mt-3 md:mt-4 p-2 sm:p-2.5 md:p-3 bg-amber-50 rounded-lg border border-amber-100">
                                                                <p className="text-[7px] sm:text-[8px] md:text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5 sm:mb-1">
                                                                    Space Owner Response
                                                                </p>
                                                                <p className="text-[9px] sm:text-[10px] md:text-xs text-slate-600 italic break-words">
                                                                    "{review.reply.text}"
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        {totalSlides > 1 && (
                            <>
                                <button
                                    onClick={prevSlide}
                                    disabled={currentSlide === 0}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 sm:-ml-4 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-50 hover:border-amber-300 transition-all z-10"
                                >
                                    <ChevronLeft size={14} className="text-slate-600" />
                                </button>
                                <button
                                    onClick={nextSlide}
                                    disabled={currentSlide === totalSlides - 1}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 sm:-mr-4 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-50 hover:border-amber-300 transition-all z-10"
                                >
                                    <ChevronRight size={14} className="text-slate-600" />
                                </button>
                            </>
                        )}

                        {/* Dots Indicator */}
                        {totalSlides > 1 && (
                            <div className="flex justify-center gap-1 sm:gap-1.5 md:gap-2 mt-4 sm:mt-5 md:mt-8">
                                {Array.from({ length: totalSlides }).map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSlide(idx)}
                                        className={`transition-all rounded-full ${
                                            currentSlide === idx
                                                ? 'w-4 sm:w-5 md:w-6 h-1 sm:h-1.5 md:h-2 bg-amber-500'
                                                : 'w-1 sm:w-1.5 md:w-2 h-1 sm:h-1.5 md:h-2 bg-slate-300 hover:bg-amber-300'
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