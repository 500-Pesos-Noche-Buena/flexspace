const mongoose = require('mongoose');

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
        enum: ['cash', 'qr', 'card', 'online'],
        required: true 
    },
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

module.exports = mongoose.model('Order', orderSchema);