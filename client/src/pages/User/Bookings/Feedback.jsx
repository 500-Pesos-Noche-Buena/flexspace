import React, { useState, useEffect } from 'react';
import { apiPost, apiPut } from '@/utils/Api';
import { Star, XCircle, Loader2, StarOff, Camera, Trash2 } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { cn } from '@/lib/utils';

const FeedbackModal = ({ booking, review, onClose, onSuccess }) => {
    const isEditMode = !!review;
    
    const [rating, setRating] = useState(isEditMode ? review.rating : 0);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState(isEditMode ? (review.title || '') : '');
    const [comment, setComment] = useState(isEditMode ? review.comment : '');
    const [images, setImages] = useState(isEditMode ? (review.images || []) : []);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (!isEditMode) {
            setRating(0);
            setTitle('');
            setComment('');
            setImages([]);
        }
    }, [isEditMode, booking?._id]);

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (images.length + files.length > 5) {
            showToast({ icon: 'warning', title: 'Maximum 5 images only' });
            return;
        }

        setUploading(true);
        const uploadedUrls = [];

        for (const file of files) {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('type', 'review');

            try {
                const response = await apiPost('/upload/review-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (response.success && response.data.url) {
                    uploadedUrls.push(response.data.url);
                }
            } catch (error) {
                console.error('Upload failed:', error);
                showToast({ icon: 'error', title: `Failed to upload ${file.name}` });
            }
        }

        setImages([...images, ...uploadedUrls]);
        setUploading(false);
    };

    const removeImage = (indexToRemove) => {
        setImages(images.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = async () => {
        // Validation
        if (rating === 0) {
            showToast({ icon: 'warning', title: 'Please select a rating' });
            return;
        }
        if (!comment.trim()) {
            showToast({ icon: 'warning', title: 'Please write a review' });
            return;
        }
        if (comment.length < 10) {
            showToast({ icon: 'warning', title: 'Review must be at least 10 characters' });
            return;
        }

        setSubmitting(true);
        
        try {
            let response;
            
            if (isEditMode) {
                // UPDATE existing review
                response = await apiPut(`/user/reviews/${review._id}`, {
                    rating,
                    title: title.trim() || null,
                    comment: comment.trim(),
                    images: images
                });
            } else {
                // CREATE new review
                // Validate booking data
                if (!booking || !booking._id) {
                    showToast({ icon: 'error', title: 'Invalid booking data', text: 'Please try again' });
                    setSubmitting(false);
                    return;
                }

                const spaceId = booking.space_id?._id || booking.space_id;
                if (!spaceId) {
                    showToast({ icon: 'error', title: 'Invalid space data', text: 'Please try again' });
                    setSubmitting(false);
                    return;
                }

                response = await apiPost('/user/reviews', {
                    space_id: spaceId,
                    booking_id: booking._id,
                    rating,
                    title: title.trim() || undefined,
                    comment: comment.trim(),
                    images: images
                });
            }

            if (response.success) {
                showToast({ 
                    icon: 'success', 
                    title: isEditMode ? 'Review updated successfully!' : 'Thank you for your feedback!', 
                    text: isEditMode ? 'Your changes have been saved.' : 'Your review helps other users make better choices.'
                });
                
                if (onSuccess && typeof onSuccess === 'function') {
                    onSuccess(response.data);
                }
                
                onClose();
            } else {
                showToast({ 
                    icon: 'error', 
                    title: isEditMode ? 'Failed to update review' : 'Failed to submit review', 
                    text: response.message || 'Please try again later' 
                });
            }
        } catch (error) {
            console.error(isEditMode ? 'Update review error:' : 'Submit review error:', error);
            
            let errorMessage = 'Please try again later';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            showToast({ 
                icon: 'error', 
                title: isEditMode ? 'Failed to update review' : 'Failed to submit review', 
                text: errorMessage
            });
        } finally {
            setSubmitting(false);
        }
    };

    const StarRating = () => (
        <div className="flex items-center gap-1 sm:gap-2 justify-center flex-wrap">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-all hover:scale-110 active:scale-95 focus:outline-none"
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                >
                    {(hoverRating || rating) >= star ? (
                        <Star 
                            size={36} 
                            className="fill-amber-400 text-amber-400 drop-shadow-sm" 
                        />
                    ) : (
                        <StarOff 
                            size={36} 
                            className="text-slate-300 hover:text-amber-200 transition-colors" 
                        />
                    )}
                </button>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4" style={{ overflowY: 'auto' }}>
            <div className="bg-white rounded-2xl sm:rounded-4xl w-full max-w-lg sm:max-w-2xl relative shadow-2xl my-4 sm:my-8">
                {/* Sticky Header with Close Button */}
                <div className="sticky top-0 bg-white rounded-t-2xl sm:rounded-t-4xl z-10 border-b border-slate-100">
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-300 hover:text-slate-900 transition-colors z-20"
                        aria-label="Close modal"
                    >
                        <XCircle size={24} className="sm:w-6 sm:h-6" />
                    </button>

                    <div className="text-center pt-8 sm:pt-10 pb-4 sm:pb-6 px-4">
                        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-br from-amber-500 to-orange-500 mb-3 sm:mb-4">
                            <Star size={28} className="text-white" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-[1000] italic uppercase tracking-tight">
                            {isEditMode ? 'Edit Your Review' : 'Share Your Experience'}
                        </h2>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                            {isEditMode 
                                ? `Editing your review for ${booking?.space_id?.name || 'Space'}`
                                : `${booking?.space_id?.name || 'Space'} · ${booking?.ticket_number || 'Booking'}`
                            }
                        </p>
                        {isEditMode && review?.is_edited && (
                            <p className="text-[8px] text-amber-600 mt-1">Previously edited</p>
                        )}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-4 sm:p-6 max-h-[calc(90vh-180px)] sm:max-h-[calc(85vh-200px)]">
                    <div className="space-y-5 sm:space-y-6">
                        {/* Rating Stars */}
                        <div className="text-center">
                            <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                Your Rating
                            </label>
                            <StarRating />
                            <p className="text-[8px] sm:text-[9px] text-slate-400 mt-3">
                                {rating === 0 && 'Tap a star to rate'}
                                {rating === 1 && 'Poor - Needs improvement'}
                                {rating === 2 && 'Fair - Just okay'}
                                {rating === 3 && 'Good - Satisfied'}
                                {rating === 4 && 'Very Good - Impressed'}
                                {rating === 5 && 'Excellent - Love it!'}
                            </p>
                        </div>

                        {/* Title (Optional) */}
                        <div>
                            <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                Review Title <span className="text-slate-300">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Amazing workspace, Great ambiance..."
                                maxLength="100"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl sm:rounded-2xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                            />
                            <div className="text-right text-[8px] text-slate-400 mt-1">
                                {title.length}/100
                            </div>
                        </div>

                        {/* Comment */}
                        <div>
                            <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                Your Review <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Share your experience... What did you like? What could be improved?"
                                rows="4"
                                maxLength="1000"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl sm:rounded-2xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none"
                            />
                            <div className="text-right text-[8px] text-slate-400 mt-1">
                                {comment.length}/1000 {comment.length < 10 && comment.length > 0 && ' (Minimum 10 characters)'}
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                Add Photos <span className="text-slate-300">(Optional, Max 5)</span>
                            </label>
                            
                            {/* Image Preview Grid */}
                            {images.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {images.map((img, idx) => (
                                        <div key={idx} className="relative group aspect-square">
                                            <img 
                                                src={img} 
                                                alt={`Review ${idx + 1}`}
                                                className="w-full h-full object-cover rounded-lg border border-slate-200"
                                            />
                                            <button
                                                onClick={() => removeImage(idx)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                aria-label="Remove image"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Upload Button */}
                            <label className={cn(
                                "flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                                images.length >= 5 
                                    ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-50"
                                    : "border-amber-200 hover:border-amber-400 hover:bg-amber-50"
                            )}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    disabled={uploading || images.length >= 5}
                                    className="hidden"
                                />
                                {uploading ? (
                                    <Loader2 size={16} className="animate-spin text-amber-600" />
                                ) : (
                                    <Camera size={16} className="text-amber-600" />
                                )}
                                <span className="text-[10px] font-black uppercase text-amber-600">
                                    {uploading ? 'Uploading...' : images.length >= 5 ? 'Max photos reached' : 'Add Photos'}
                                </span>
                            </label>
                            <p className="text-[7px] text-slate-400 mt-2 text-center">
                                Share photos of your experience (JPG, PNG, max 5MB each)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sticky Footer with Buttons */}
                <div className="sticky bottom-0 bg-white rounded-b-2xl sm:rounded-b-4xl border-t border-slate-100 p-4 sm:p-6">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-200 active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || rating === 0 || comment.length < 10}
                            className="flex-1 py-3 bg-linear-to-r from-amber-500 to-orange-500 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <Loader2 size={14} className="animate-spin mx-auto" />
                            ) : (
                                isEditMode ? 'Update Review' : 'Submit Review'
                            )}
                        </button>
                    </div>
                    <p className="text-[7px] text-slate-400 text-center mt-3">
                        Your review helps fellow remote workers find the perfect space.
                        Reviews are public and may be featured on the space's profile.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;