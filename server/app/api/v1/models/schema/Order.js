const mongoose = require('mongoose');
const { logsActivity } = require('@/api/v1/utils/logsActivity');

const orderItemSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
    order_number: { type: String, unique: true },
    space_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true, default: 0 },
    discount_type: { type: String, enum: ['percentage', 'fixed'], default: null },
    discount_value: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    payment_method: { 
        type: String, 
        enum: ['cash', 'qr', 'card', 'online', 'pay_later'],
        required: true 
    },
    
    is_pay_later: { type: Boolean, default: false },
    pay_later_status: { 
        type: String, 
        enum: ['pending', 'partially_paid', 'settled'], 
        default: 'pending' 
    },
    pay_later_total_accumulated: { type: Number, default: 0 },
    pay_later_payments: [{
        amount: { type: Number, required: true },
        payment_method: { type: String, enum: ['cash', 'qr', 'online'], default: 'cash' },
        paid_at: { type: Date, default: Date.now },
        processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    amount_received: { type: Number, required: true },
    change: { type: Number, default: 0 },
    customer_name: { type: String, required: true },
    voucher_code: { type: String, default: null },
    order_type: { 
        type: String, 
        enum: ['pos', 'online'],
        default: 'pos'
    },
    status: { 
        type: String, 
        enum: [
            'pending',           // Order placed, waiting for payment confirmation
            'pending_payment',   // Payment initiated but not confirmed (for online)
            'confirmed',         // Payment confirmed
            'preparing',         // Kitchen is preparing the food
            'ready',            // Food is ready for pickup
            'completed',        // Customer picked up / order finished
            'cancelled',        // Order cancelled
            'rejected'          // Order rejected
        ],
        default: 'pending' 
    },
    payment_status: { 
        type: String, 
        enum: ['unpaid', 'paid', 'refunded'], 
        default: 'unpaid' 
    },
    payment_intent_id: { type: String, default: null },
    processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Pre-save hook to generate order number if not present
orderSchema.pre('save', async function(next) {
    if (!this.order_number) {
        this.order_number = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    }
    if (this.payment_method === 'cash' && this.amount_received) {
        this.change = Math.max(0, this.amount_received - this.total);
    }
    next();
});

// ✅ NEW: pre('save') hook to create Earnings when order becomes completed
orderSchema.pre('save', async function(next) {
    // Check if status changed to 'completed' or 'confirmed'
    if (this.isModified('status') && (this.status === 'completed' || this.status === 'confirmed')) {
        try {
            const Earnings = require('./Earnings');
            const Settings = require('./Settings');
            const Space = require('./Space');
            
            // Check if earnings already exist for this order
            const existingEarnings = await Earnings.findOne({ 
                order_number: this.order_number 
            });
            
            if (existingEarnings) {
                console.log(`⚠️ Earnings already exist for order ${this.order_number}`);
                return next();
            }
            
            // Get the actual owner (user_id) from the Space
            const space = await Space.findById(this.space_id).select('user_id');
            if (!space) {
                console.error(`❌ Space not found for order ${this.order_number}`);
                return next();
            }
            
            const ownerId = space.user_id; // This is the USER ID, not Space ID
            
            // Get platform fee percentage from settings
            const feeSetting = await Settings.findOne({ key: 'platform_fee_percent' });
            const platformFeePercent = feeSetting?.value ?? 3;
            
            const totalAmount = this.total || 0;
            if (totalAmount <= 0) {
                console.log(`⚠️ Order ${this.order_number} has 0 total, skipping earnings`);
                return next();
            }
            
            const platformFee = (totalAmount * platformFeePercent) / 100;
            const ownerEarnings = totalAmount - platformFee;
            
            let orderDate = this.created_at || new Date();
            if (typeof orderDate === 'string') {
                orderDate = new Date(orderDate);
            }
            if (isNaN(orderDate.getTime())) {
                orderDate = new Date();
            }
            
            const month = orderDate.toISOString().slice(0, 7);
            
            // Create Earnings record for POS order
            await Earnings.create({
                owner_id: ownerId,
                space_id: this.space_id,
                order_number: this.order_number,
                booking_id: null, // POS orders don't have booking_id
                total_amount: totalAmount,
                platform_fee_percent: platformFeePercent,
                platform_fee: parseFloat(platformFee.toFixed(4)),
                owner_earnings: parseFloat(ownerEarnings.toFixed(4)),
                payment_method: this.payment_method || 'cash',
                payment_intent_id: this.payment_intent_id || null,
                auto_collected: false,
                fee_status: 'pending',
                collected_at: null,
                booking_date: orderDate,
                month: month,
                notes: `Auto-created when order became ${this.status}`
            });
            
            console.log(`✅ Earnings auto-created for order ${this.order_number}: ₱${totalAmount}`);
            
        } catch (error) {
            console.error('❌ Error auto-creating earnings for order:', error);
            // Don't block the save if earnings creation fails
        }
    }
    next();
});

// Also keep the original pre-save for order number generation
orderSchema.pre('save', async function(next) {
    if (!this.order_number) {
        this.order_number = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    }
    if (this.payment_method === 'cash' && this.amount_received) {
        this.change = Math.max(0, this.amount_received - this.total);
    }
    next();
});

// Add logsActivity plugin
orderSchema.plugin(logsActivity, { modelName: 'Order' });

module.exports = mongoose.model('Order', orderSchema);