const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    space_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    price: { type: Number, required: true },
    category: { 
        type: String, 
        enum: ['food', 'beverage', 'snacks', 'merch'], 
        required: true 
    },
    stock: { type: Number, default: 0 },
    image: { type: String, default: null },
    is_available: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);