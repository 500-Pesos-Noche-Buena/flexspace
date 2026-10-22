const { Space, District, User, Booking, Review, Order } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const axios = require('axios');

const PAYBRIDGE_API_URL = process.env.PAYBRIDGE_API_URL || 'https://paybridge-ph.vercel.app/api/v1';
const PAYBRIDGE_MASTER_KEY = process.env.PAYBRIDGE_MASTER_KEY;

class LandingController {
    async getExplorerData(req, res) {
        try {
            const [spaces, districts] = await Promise.all([
                Space.find({ status: 'Open Now' })
                    .populate('district_id', 'name')
                    .select('name area lat lng rate_hour images image user_id status district_id rating review_count capacity amenities description hours_json')
                    .lean(),
                District.find({ active: true })
                    .sort({ name: 1 })
                    .lean()
            ]);

            return res.status(200).json({
                success: true,
                count: spaces.length,
                data: {
                    spaces,
                    districts
                }
            });
        } catch (error) {
            console.error(`[LandingController Error]: ${error.message}`);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    }

    async getSpaceDetails(req, res) {
        try {
            const space = await Space.findById(req.params.id)
                .populate('district_id')
                .lean();

            if (!space) {
                return res.status(404).json({ success: false, message: "Space not found" });
            }

            if (space.hours_json && typeof space.hours_json === 'string') {
                space.hours_json = JSON.parse(space.hours_json);
            }

            return res.status(200).json({
                success: true,
                data: space
            });
        } catch (error) {
            console.error('Get space details error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async getPublicStats(req, res) {
        try {
            console.log('📊 Fetching public stats...');

            const [totalSpaces, totalUsers, activeBookings] = await Promise.all([
                Space.countDocuments({ status: 'Open Now' }),
                User.countDocuments({
                    role: 'user',
                    isActive: { $ne: false }
                }),
                Booking.countDocuments({
                    status: 'active',
                    check_out_at: null
                })
            ]);

            console.log(`Stats: ${totalSpaces} spaces, ${totalUsers} users, ${activeBookings} active bookings`);

            return res.status(200).json({
                success: true,
                data: {
                    totalSpaces: totalSpaces || 0,
                    totalUsers: totalUsers || 0,
                    activeBookings: activeBookings || 0
                }
            });
        } catch (error) {
            console.error('Stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getCustomerReviews(req, res) {
        try {
            const { spaceId, limit = 6 } = req.query;

            let query = { status: 'approved' };

            if (spaceId) {
                query.space_id = spaceId;
            }

            const reviews = await Review.find(query)
                .populate('space_id', 'name')
                .populate('user_id', 'name avatar')
                .sort({ created_at: -1 })
                .limit(parseInt(limit))
                .lean();

            const totalReviews = await Review.countDocuments({ status: 'approved' });

            const avgResult = await Review.aggregate([
                { $match: { status: 'approved' } },
                { $group: { _id: null, avg: { $avg: '$rating' } } }
            ]);

            const averageRating = avgResult.length > 0 ? avgResult[0].avg : 0;

            const formattedReviews = reviews.map(review => ({
                _id: review._id,
                rating: review.rating,
                comment: review.comment,
                reviewer_name: review.user_id?.name || review.guest_name || 'Anonymous',
                reviewer_avatar: review.user_id?.avatar || null,
                space_name: review.space_id?.name,
                is_verified: review.is_verified_booking,
                helpful_count: review.helpful_count,
                created_at: review.created_at,
                reply: review.reply ? {
                    text: review.reply.text,
                    created_at: review.reply.created_at
                } : null
            }));

            return res.status(200).json({
                success: true,
                data: {
                    reviews: formattedReviews,
                    stats: {
                        total_reviews: totalReviews,
                        average_rating: parseFloat(averageRating.toFixed(1))
                    }
                }
            });
        } catch (error) {
            console.error('Get customer reviews error:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async publicLikeReview(req, res) {
        try {
            const { reviewId } = req.params;

            const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';

            const review = await Review.findById(reviewId);
            if (!review) {
                return res.status(404).json({ success: false, message: 'Review not found' });
            }

            if (review.liked_ips && review.liked_ips.includes(clientIp)) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already liked this review'
                });
            }

            if (!review.liked_ips) review.liked_ips = [];
            review.liked_ips.push(clientIp);
            review.helpful_count = (review.helpful_count || 0) + 1;
            await review.save();

            return res.status(200).json({
                success: true,
                message: 'Thanks for your feedback!',
                data: { helpful_count: review.helpful_count }
            });
        } catch (error) {
            console.error('Public like error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    getSpaceAvailability = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { date, start_time, end_time, is_open_time } = req.query;

            const space = await Space.findById(id);
            if (!space) {
                return res.status(404).json({
                    success: false,
                    message: 'Space not found'
                });
            }

            const selectedDate = new Date(date);
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const day = selectedDate.getDate();

            let startDateTime, endDateTime;

            if (is_open_time === 'true') {
                startDateTime = new Date(year, month, day, 0, 0, 0);
                endDateTime = new Date(year, month, day, 23, 59, 59);
            } else {
                const [startHour, startMinute] = (start_time || '00:00').split(':');
                const [endHour, endMinute] = (end_time || '23:59').split(':');
                
                startDateTime = new Date(year, month, day, parseInt(startHour), parseInt(startMinute), 0);
                endDateTime = new Date(year, month, day, parseInt(endHour), parseInt(endMinute), 0);
            }

            console.log('=== SPACE AVAILABILITY CHECK ===');
            console.log('Space ID:', id);
            console.log('Selected Date:', date);
            console.log('Start DateTime:', startDateTime);
            console.log('End DateTime:', endDateTime);
            console.log('Is Open Time:', is_open_time);

            const activeBookings = await Booking.find({
                space_id: id,
                bookable_type: 'space',
                status: { $in: ['pending', 'confirmed', 'active', 'pending_payment'] },
                $or: [
                    {
                        $and: [
                            { start_time: { $lte: endDateTime } },
                            { end_time: { $gte: startDateTime } }
                        ]
                    }
                ]
            }).lean();

            const bookingCount = activeBookings.length;
            const availableSeats = Math.max(0, (space.capacity || 0) - bookingCount);
            
            console.log(`Total capacity: ${space.capacity}`);
            console.log(`Active bookings found: ${bookingCount}`);
            console.log('Bookings details:');
            activeBookings.forEach(b => {
                console.log(`  - ${b.ticket_number}: ${b.status} from ${b.start_time} to ${b.end_time}`);
            });
            console.log(`Available seats: ${availableSeats}`);
            console.log('================================');

            return res.status(200).json({
                success: true,
                data: {
                    occupied_seats: bookingCount,
                    available_seats: availableSeats,
                    total_capacity: space.capacity || 0,
                    is_available: availableSeats > 0
                }
            });
        } catch (error) {
            console.error('Get space availability error:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    };

    // ============ PAYMENT METHODS ============

    // Create payment link for orders/bookings
    async createPaymentLink(req, res) {
        try {
            const { amount, order_number, customer_name, payment_method = 'gcash', space_id } = req.body;

            console.log('📢 Payment request received:', { amount, order_number, customer_name, payment_method, space_id });

            let targetSpace = null;

            let validatedAmount = parseFloat(amount);

            // Method 1: Use space_id if provided
            if (space_id) {
                targetSpace = await Space.findById(space_id).populate('user_id');
                console.log('✅ Found space by ID:', targetSpace?._id, targetSpace?.name);
            }

            // Method 2: Try to find from booking using order_number (ticket_number)
            if (order_number) {
                const booking = await Booking.findOne({ ticket_number: order_number }).populate('space_id');
                if (booking) {
                    if (!targetSpace && booking.space_id) {
                        targetSpace = await Space.findById(booking.space_id._id || booking.space_id).populate('user_id');
                        console.log('✅ Found space from booking:', targetSpace?._id, targetSpace?.name);
                    }
                    validatedAmount = booking.total_amount;
                } else {
                    // Method 3: Try to find from order (POS)
                    const order = await Order.findOne({ order_number: order_number }).populate('space_id');
                    if (order) {
                        if (!targetSpace && order.space_id) {
                            targetSpace = await Space.findById(order.space_id._id || order.space_id).populate('user_id');
                            console.log('✅ Found space from POS order:', targetSpace?._id, targetSpace?.name);
                        }
                        validatedAmount = order.total;
                    }
                }
            }

            if (!validatedAmount || isNaN(validatedAmount) || validatedAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid payment amount is required'
                });
            }

            if (!targetSpace) {
                console.error('❌ No space found for order:', order_number);
                return res.status(400).json({
                    success: false,
                    message: 'Unable to find space for this order'
                });
            }

            if (!targetSpace.user_id || !targetSpace.user_id.encrypted_paymongo_key) {
                console.error('❌ Space owner has no PayMongo key configured');
                return res.status(400).json({
                    success: false,
                    message: 'Payment gateway not configured. Please contact the space owner.'
                });
            }

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const successUrl = `${frontendUrl}/payment/success?order_id=${encodeURIComponent(order_number || '')}&amount=${validatedAmount}`;

            const response = await axios.post(`${PAYBRIDGE_API_URL}/paymongo`, {
                amount: validatedAmount,
                success_url: successUrl,
                payment_method: payment_method,
                metadata: {
                    order_number,
                    customer_name,
                    space_id: targetSpace._id.toString()
                }
            }, {
                headers: {
                    'X-Encrypted-Secret': targetSpace.user_id.encrypted_paymongo_key,
                    'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            console.log('✅ Payment link created successfully');

            return res.status(200).json({
                success: true,
                data: {
                    checkout_url: response.data.checkout_url,
                    payment_intent_id: response.data.payment_intent_id
                }
            });
        } catch (error) {
            console.error('❌ Payment link error:', error.response?.data || error.message);
            return res.status(500).json({
                success: false,
                message: error.response?.data?.message || 'Failed to create payment link'
            });
        }
    }

    // Verify payment status
    async verifyPayment(req, res) {
        try {
            const { paymentIntentId } = req.params;
            if (!paymentIntentId || typeof paymentIntentId !== 'string') {
                return res.status(200).json({ success: false, message: 'Valid payment intent ID is required', data: { is_paid: false } });
            }
            
            let space = null;
            if (req.query.space_id) {
                space = await Space.findById(req.query.space_id).populate('user_id');
            }
            if (!space) {
                const booking = await Booking.findOne({ payment_intent_id: paymentIntentId }).populate({
                    path: 'space_id',
                    populate: { path: 'user_id' }
                });
                if (booking?.space_id) space = booking.space_id;
            }
            if (!space) {
                const order = await Order.findOne({ payment_intent_id: paymentIntentId }).populate({
                    path: 'space_id',
                    populate: { path: 'user_id' }
                });
                if (order?.space_id) space = order.space_id;
            }
            if (!space) {
                space = await Space.findOne({ status: 'Open Now' }).populate('user_id');
            }
            
            if (!space || !space.user_id || !space.user_id.encrypted_paymongo_key) {
                return res.status(200).json({
                    success: true,
                    data: { is_paid: false, message: 'Payment gateway not configured' }
                });
            }
            
            const response = await axios.get(`${PAYBRIDGE_API_URL}/paymongo/verify/${encodeURIComponent(paymentIntentId)}`, {
                headers: {
                    'X-Encrypted-Secret': space.user_id.encrypted_paymongo_key,
                    'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY
                },
                timeout: 15000
            });
            
            return res.status(200).json({
                success: true,
                data: response.data
            });
        } catch (error) {
            console.error('Payment verification error:', error.response?.data || error.message);
            return res.status(200).json({
                success: false,
                message: error.response?.data?.message || 'Verification failed',
                data: { is_paid: false }
            });
        }
    }

    // Confirm order/booking payment
    async confirmOrderPayment(req, res) {
        try {
            const { orderId } = req.params;
            const { payment_intent_id } = req.body;
            
            if (!orderId || typeof orderId !== 'string') {
                return res.status(400).json({ success: false, message: 'Valid order ID is required' });
            }
            if (!payment_intent_id || typeof payment_intent_id !== 'string' || !payment_intent_id.trim()) {
                return res.status(400).json({ success: false, message: 'Valid payment_intent_id is required' });
            }
            
            // Check if it's a booking (FLX-xxxx or WK-xxxx)
            const isBooking = (orderId.startsWith('FLX') || orderId.startsWith('WK'));
            
            if (isBooking) {
                const booking = await Booking.findOne({ ticket_number: orderId });
                
                if (!booking) {
                    return res.status(404).json({ success: false, message: 'Booking not found' });
                }
                
                // Idempotency: if already paid
                if (booking.payment_status === 'paid' && booking.status === 'completed') {
                    return res.status(200).json({
                        success: true,
                        message: 'Payment already confirmed.',
                        data: {
                            ticket_number: booking.ticket_number,
                            status: booking.status,
                            payment_status: booking.payment_status,
                            total_amount: booking.total_amount
                        }
                    });
                }

                // Verify with PayBridge gateway
                const space = await Space.findById(booking.space_id).populate('user_id');
                if (space?.user_id?.encrypted_paymongo_key) {
                    try {
                        const verifyRes = await axios.get(`${PAYBRIDGE_API_URL}/paymongo/verify/${encodeURIComponent(payment_intent_id)}`, {
                            headers: {
                                'X-Encrypted-Secret': space.user_id.encrypted_paymongo_key,
                                'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY
                            },
                            timeout: 10000
                        });
                        const isPaid = verifyRes.data?.is_paid === true || verifyRes.data?.data?.attributes?.status === 'paid' || verifyRes.data?.status === 'paid';
                        if (!isPaid) {
                            return res.status(402).json({ success: false, message: 'Payment not verified by gateway' });
                        }
                    } catch (gwErr) {
                        return res.status(402).json({ success: false, message: 'Gateway payment verification failed' });
                    }
                }
                
                booking.status = 'completed';
                booking.payment_status = 'paid';
                booking.payment_intent_id = payment_intent_id;
                await booking.save();
                
                return res.status(200).json({
                    success: true,
                    message: 'Booking completed! Payment confirmed.',
                    data: {
                        ticket_number: booking.ticket_number,
                        status: booking.status,
                        payment_status: booking.payment_status,
                        total_amount: booking.total_amount
                    }
                });
            } else {
                const order = await Order.findOne({ order_number: orderId });
                
                if (!order) {
                    return res.status(404).json({ success: false, message: 'Order not found' });
                }
                
                if (order.payment_status === 'paid') {
                    return res.status(200).json({
                        success: true,
                        message: 'Payment already confirmed.',
                        data: {
                            order_number: order.order_number,
                            status: order.status,
                            payment_status: order.payment_status,
                            total: order.total
                        }
                    });
                }

                const space = await Space.findById(order.space_id).populate('user_id');
                if (space?.user_id?.encrypted_paymongo_key) {
                    try {
                        const verifyRes = await axios.get(`${PAYBRIDGE_API_URL}/paymongo/verify/${encodeURIComponent(payment_intent_id)}`, {
                            headers: {
                                'X-Encrypted-Secret': space.user_id.encrypted_paymongo_key,
                                'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY
                            },
                            timeout: 10000
                        });
                        const isPaid = verifyRes.data?.is_paid === true || verifyRes.data?.data?.attributes?.status === 'paid' || verifyRes.data?.status === 'paid';
                        if (!isPaid) {
                            return res.status(402).json({ success: false, message: 'Payment not verified by gateway' });
                        }
                    } catch (gwErr) {
                        return res.status(402).json({ success: false, message: 'Gateway payment verification failed' });
                    }
                }
                
                order.status = 'confirmed';
                order.payment_status = 'paid';
                order.payment_intent_id = payment_intent_id;
                await order.save();
                
                return res.status(200).json({
                    success: true,
                    message: 'Payment confirmed. Order is now being prepared.',
                    data: {
                        order_number: order.order_number,
                        status: order.status,
                        payment_status: order.payment_status,
                        total: order.total
                    }
                });
            }
        } catch (error) {
            console.error('Confirm payment error:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Check payment status
    async getPaymentStatus(req, res) {
        try {
            const { orderId } = req.params;
            
            // Check Orders first (POS)
            let order = await Order.findOne({ order_number: orderId });
            
            if (order) {
                return res.status(200).json({
                    success: true,
                    data: {
                        is_paid: order.status === 'confirmed' || order.status === 'completed' || order.payment_status === 'paid',
                        status: order.status,
                        payment_status: order.payment_status
                    }
                });
            }
            
            // Check Bookings (ticket_number)
            const booking = await Booking.findOne({ ticket_number: orderId });
            
            if (booking) {
                return res.status(200).json({
                    success: true,
                    data: {
                        is_paid: booking.status === 'confirmed' || booking.status === 'completed' || booking.payment_status === 'paid',
                        status: booking.status,
                        payment_status: booking.payment_status
                    }
                });
            }
            
            return res.status(404).json({
                success: false,
                message: 'Order not found',
                data: { is_paid: false }
            });
        } catch (error) {
            console.error('Payment status error:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new LandingController();