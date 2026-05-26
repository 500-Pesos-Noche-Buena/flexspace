const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, required: true },
    content: { type: String, required: true },
    featured_image: { type: String, default: null },
    author: { type: String, default: 'FlexSpace AI' },
    category: { 
        type: String, 
        enum: ['trending', 'most_booked', 'top_revenue', 'new_space', 'community', 'insights', 'weekly_insights', 'top_rated'],
        default: 'insights'
    },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    published_at: { type: Date, default: null },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    language: { type: String, enum: ['english', 'tagalog', 'hiligaynon'], default: 'english' },
    generated_from: { type: String, enum: ['auto', 'manual', 'ai'], default: 'ai' },
    source_data: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

blogSchema.index({ status: 1, published_at: -1 });
blogSchema.index({ slug: 1 });
blogSchema.index({ category: 1 });

module.exports = mongoose.model('Blog', blogSchema);