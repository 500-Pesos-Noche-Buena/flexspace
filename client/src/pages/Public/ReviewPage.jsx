import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/Api';
import { Star, Loader2, CheckCircle, ArrowLeft, MapPin, Calendar, Clock } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

const ReviewPage = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [booking, setBooking] = useState(null);
    const [space, setSpace] = useState(null);
    
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [guestName, setGuestName] = useState('');
    
    useEffect(() => {
        fetchBookingDetails();
    }, [bookingId]);
    
    const fetchBookingDetails = async () => {
        try {
            setLoading(true);
            const res = await apiGet(`/space/booking/${bookingId}/review`);
            if (res.success) {
                setBooking(res.data.booking);
                setSpace(res.data.space);
                setGuestName(res.data.booking.guest_name || '');
            }
        } catch (err) {
            console.error('Fetch booking error:', err);
            if (err.message?.includes('already reviewed')) {
                setSubmitted(true);
            } else {
                showToast({ icon: 'error', title: err.message || 'Failed to load booking' });
                setTimeout(() => navigate('/'), 2000);
            }
        } finally {
            setLoading(false);
        }
    };
    
    const handleSubmit = async () => {
        if (rating === 0) {
            showToast({ icon: 'error', title: 'Please select a rating' });
            return;
        }
        
        if (comment.trim().length < 10) {
            showToast({ icon: 'error', title: 'Review must be at least 10 characters' });
            return;
        }
        
        setSubmitting(true);
        try {
            const res = await apiPost(`/space/booking/${bookingId}/review`, {
                rating,
                title,
                comment,
                guest_name: guestName
            });
            
            if (res.success) {
                setSubmitted(true);
                showToast({ icon: 'success', title: 'Thank you for your review!' });
            }
        } catch (err) {
            console.error('Submit review error:', err);
            showToast({ icon: 'error', title: err.message || 'Failed to submit review' });
        } finally {
            setSubmitting(false);
        }
    };
    
    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }
    
    if (submitted) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center px-4">
                <Card className="bg-[#111114] border-white/5 max-w-md w-full text-center p-8">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-black text-white mb-2">Review Submitted!</h2>
                    <p className="text-slate-400 text-sm mb-4">
                        Thank you for sharing your experience at {space?.name}
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={() => navigate('/')} className="flex-1 bg-indigo-600 hover:bg-indigo-500">
                            Return Home
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }
    
    if (!booking || !space) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center px-4">
                <Card className="bg-[#111114] border-white/5 max-w-md w-full text-center p-8">
                    <h2 className="text-xl font-black text-white mb-2">Booking Not Found</h2>
                    <p className="text-slate-400 text-sm mb-6">The booking you're looking for doesn't exist or has already been reviewed.</p>
                    <Button onClick={() => navigate('/')} className="w-full bg-indigo-600 hover:bg-indigo-500">
                        Return to Home
                    </Button>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-black py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button 
                        onClick={() => navigate(-1)}
                        className="text-slate-500 hover:text-white transition-colors flex items-center gap-2 mb-4"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h1 className="text-2xl font-black text-white uppercase italic">Share Your Experience</h1>
                    <p className="text-slate-500 text-sm mt-1">Your feedback helps us improve</p>
                </div>
                
                {/* Space Info Card */}
                <Card className="bg-[#111114] border-white/5 mb-6">
                    <CardContent className="p-6">
                        <div className="flex gap-4">
                            {space?.images?.[0] && (
                                <img 
                                    src={space.images[0]} 
                                    alt={space.name}
                                    className="w-20 h-20 rounded-xl object-cover"
                                />
                            )}
                            <div className="flex-1">
                                <h3 className="text-lg font-black text-white">{space?.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <MapPin size={12} className="text-slate-500" />
                                    <p className="text-xs text-slate-500">{space?.address || 'Iloilo City'}</p>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-0.5">
                                        {[1,2,3,4,5].map(s => (
                                            <Star key={s} size={12} className={s <= (space?.rating || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-slate-600'} />
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-slate-500">({space?.review_count || 0} reviews)</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-1.5">
                                <Calendar size={12} className="text-slate-500" />
                                <span className="text-xs text-slate-400">
                                    {booking?.check_in_at ? new Date(booking.check_in_at).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock size={12} className="text-slate-500" />
                                <span className="text-xs text-slate-400">
                                    Booking #{booking?.ticket_number?.slice(-6)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Review Form */}
                <Card className="bg-[#111114] border-white/5">
                    <CardContent className="p-6">
                        {/* Rating Stars */}
                        <div className="mb-6">
                            <label className="text-sm font-black text-white uppercase tracking-wider mb-3 block">
                                Your Rating <span className="text-red-400">*</span>
                            </label>
                            <div className="flex gap-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        className="focus:outline-none transition-transform hover:scale-110"
                                    >
                                        <Star
                                            size={32}
                                            className={cn(
                                                "transition-colors",
                                                (hoverRating || rating) >= star
                                                    ? "fill-yellow-500 text-yellow-500"
                                                    : "text-slate-600"
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                {rating === 5 ? '⭐ Excellent! Loved it' : 
                                 rating === 4 ? '😊 Very Good' :
                                 rating === 3 ? '🙂 Average' :
                                 rating === 2 ? '😐 Poor' :
                                 rating === 1 ? '😞 Terrible' : 'Tap a star to rate'}
                            </p>
                        </div>
                        
                        {/* Review Title */}
                        <div className="mb-4">
                            <label className="text-sm font-black text-white uppercase tracking-wider mb-2 block">
                                Review Title <span className="text-slate-500 text-xs">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Great workspace, will come back!"
                                maxLength="100"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">{title.length}/100</p>
                        </div>
                        
                        {/* Review Comment */}
                        <div className="mb-6">
                            <label className="text-sm font-black text-white uppercase tracking-wider mb-2 block">
                                Your Review <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Tell us about your experience..."
                                rows="5"
                                maxLength="1000"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none resize-none"
                            />
                            <p className="text-[10px] text-slate-500 mt-1 text-right">{comment.length}/1000 characters</p>
                        </div>
                        
                        {/* Your Name */}
                        <div className="mb-8">
                            <label className="text-sm font-black text-white uppercase tracking-wider mb-2 block">
                                Your Name <span className="text-slate-500 text-xs"></span>
                            </label>
                            <input
                                type="text"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                placeholder="How should we address you?"
                                disabled
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                            />
                        </div>
                        
                        {/* Submit Button */}
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || rating === 0 || comment.trim().length < 10}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                            ) : (
                                'Submit Review'
                            )}
                        </Button>
                        
                        <p className="text-[10px] text-slate-500 text-center mt-4">
                            Your review helps other customers make informed decisions
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ReviewPage;