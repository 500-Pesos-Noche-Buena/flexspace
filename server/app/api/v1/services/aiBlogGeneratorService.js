const { GoogleGenAI } = require("@google/genai");
const config = require('@/config/config');
const { Space, Booking, Review } = require('@/api/v1/models');
const Blog = require('@/api/v1/models/schema/Blog');

const genAI = new GoogleGenAI({ apiKey: config.ai.geminiKey || process.env.GEMINI_API_KEY });

class AIBlogGeneratorService {

    async fetchAnalyticsData(period = 'month') {
        const startDate = new Date();
        if (period === 'week') startDate.setDate(startDate.getDate() - 7);
        else if (period === 'month') startDate.setDate(startDate.getDate() - 30);
        else if (period === 'quarter') startDate.setMonth(startDate.getMonth() - 3);

        const topBooked = await Booking.aggregate([
            { $match: { created_at: { $gte: startDate }, status: 'completed' } },
            { $group: { _id: '$space_id', booking_count: { $sum: 1 }, total_revenue: { $sum: '$total_amount' } } },
            { $sort: { booking_count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'spaces', localField: '_id', foreignField: '_id', as: 'space' } },
            { $unwind: '$space' }
        ]);

        const topRevenue = await Booking.aggregate([
            { $match: { created_at: { $gte: startDate }, status: 'completed' } },
            { $group: { _id: '$space_id', total_revenue: { $sum: '$total_amount' }, booking_count: { $sum: 1 } } },
            { $sort: { total_revenue: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'spaces', localField: '_id', foreignField: '_id', as: 'space' } },
            { $unwind: '$space' }
        ]);

        const topRated = await Space.find({ status: 'Open Now' })
            .sort({ rating: -1, review_count: -1 })
            .limit(5)
            .lean();

        const totalBookings = await Booking.countDocuments({ created_at: { $gte: startDate }, status: 'completed' });

        const totalRevenue = await Booking.aggregate([
            { $match: { created_at: { $gte: startDate }, status: { $in: ['completed', 'confirmed', 'pending_payment'] } } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);

        return {
            period,
            startDate,
            topBooked,
            topRevenue,
            topRated,
            totalBookings,
            totalRevenue: totalRevenue[0]?.total || 0,
            totalSpaces: await Space.countDocuments({ status: 'Open Now' })
        };
    }

    formatBlogContent(content, blogType) {
        let formatted = content;
        
        // Remove markdown headers and convert to HTML
        formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        
        // Convert markdown lists
        formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)(?!<\/ul>)/g, '<ul>\n$1\n</ul>\n');
        
        // Split into paragraphs (double line breaks)
        const paragraphs = formatted.split(/\n\n+/);
        let result = [];
        
        for (let para of paragraphs) {
            para = para.trim();
            if (!para) continue;
            
            // Skip if already has HTML tags
            if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<li') || para.startsWith('</ul>')) {
                result.push(para);
            } else {
                // Wrap plain text in <p> tags
                result.push(`<p>${para}</p>`);
            }
        }
        
        formatted = result.join('\n\n');
        
        // Ensure proper spacing after headings
        formatted = formatted.replace(/<\/h1>\n?<p>/g, '</h1>\n\n<p>');
        formatted = formatted.replace(/<\/h2>\n?<p>/g, '</h2>\n\n<p>');
        formatted = formatted.replace(/<\/h3>\n?<p>/g, '</h3>\n\n<p>');
        
        // Fix multiple line breaks
        formatted = formatted.replace(/\n{3,}/g, '\n\n');
        
        // Add article wrapper
        formatted = `<article class="blog-post">\n${formatted}\n</article>`;
        
        return formatted;
    }

    async generateBlogWithAI(analyticsData, blogType, language = 'english') {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const currentMonth = monthNames[new Date().getMonth()];
        const currentYear = new Date().getFullYear();

        let systemPrompt = '';
        let userPrompt = '';

        const languageInstruction = {
            english: 'Write the blog post in English.',
            tagalog: 'Isulat ang blog post sa Tagalog/Filipino.',
            hiligaynon: 'Isulat ang blog post sa Hiligaynon/Ilonggo.'
        };

        const baseFormatting = `
CRITICAL FORMATTING RULES (MUST FOLLOW EXACTLY):
1. Use <h1> for the main title ONLY
2. Use <h2> for each major section
3. Use <p> for paragraphs - NEVER put more than 2-3 sentences in one paragraph
4. Put a blank line (\\n\\n) between every paragraph and heading
5. Use <ul> and <li> for bullet points
6. Use <strong> for important numbers and highlights
7. NEVER write a wall of text - break it into multiple short paragraphs
8. Each section should have 2-4 short paragraphs
9. End with a proper conclusion
`;

        if (blogType === 'weekly_insights') {
            systemPrompt = `You are a professional blog writer for FlexSpace in Iloilo City.
Write a weekly insights blog post.
${languageInstruction[language]}
${baseFormatting}

Required Sections (use these exact headings):
- <h2>📈 This Week's Highlights</h2>
- <h2>🏢 Active Spaces Overview</h2>
- <h2>⭐ Top Performing Spaces</h2>
- <h2>💡 What This Means for You</h2>
- <h2>🔮 Looking Ahead</h2>
- <h2>📝 Final Thoughts</h2>

Style: News-style, optimistic, data-driven.
Length: 500-700 words.`;

            userPrompt = `Create a blog post with title "<h1>📊 FlexSpace Weekly: Coworking Trends in Iloilo City</h1>"

DATA:
- Total Bookings: ${analyticsData.totalBookings}
- Total Revenue: ₱${analyticsData.totalRevenue.toLocaleString()}
- Active Spaces: ${analyticsData.totalSpaces}
- Most Booked: ${analyticsData.topBooked[0]?.space?.name || 'No data yet'}
- Top Earner: ${analyticsData.topRevenue[0]?.space?.name || 'No data yet'}

${analyticsData.topBooked.length > 0 ? `TOP SPACES:
${analyticsData.topBooked.map((s, i) => `${i+1}. ${s.space.name} - ${s.booking_count} bookings`).join('\n')}` : ''}

FORMAT INSTRUCTIONS:
- Write SHORT paragraphs (2-3 sentences each)
- Put a BLANK LINE between every paragraph
- Use BULLET POINTS with <ul> and <li>
- End with an encouraging message about Iloilo's coworking scene
- Keep the tone positive and informative`;

        } else if (blogType === 'most_booked') {
            systemPrompt = `You are a professional blog writer for FlexSpace.
Write a blog post about the most booked coworking spaces.
${languageInstruction[language]}
${baseFormatting}

Required Sections:
- <h2>🏆 The People's Choice</h2>
- <h2>📊 Top 5 Most Booked Spaces</h2>
- <h2>✨ What Makes Them Special</h2>
- <h2>🎯 Find Your Perfect Space</h2>

Style: Exciting, celebratory, encouraging.
Length: 500-700 words.`;

            userPrompt = `Create a blog post with title "<h1>🔥 Most Booked Coworking Spaces in Iloilo City</h1>"

TOP BOOKED SPACES:
${analyticsData.topBooked.map((s, i) => `${i+1}. ${s.space.name} - ${s.booking_count} bookings (₱${s.total_revenue.toLocaleString()} revenue)`).join('\n\n')}

Total Bookings: ${analyticsData.totalBookings}
Total Revenue: ₱${analyticsData.totalRevenue.toLocaleString()}

Write a celebratory blog post highlighting these popular spaces.
Use short paragraphs, bullet points, and proper spacing.`;

        } else if (blogType === 'top_revenue') {
            systemPrompt = `You are a professional blog writer for FlexSpace.
Write a blog post about the highest-earning coworking spaces.
${languageInstruction[language]}
${baseFormatting}

Required Sections:
- <h2>💰 Revenue Leaders</h2>
- <h2>📊 Top 5 Earners</h2>
- <h2>🔑 Keys to Success</h2>
- <h2>💡 Lessons for Space Owners</h2>

Style: Professional, analytical, inspiring.
Length: 500-700 words.`;

            userPrompt = `Create a blog post with title "<h1>💰 Top Earning Coworking Spaces in Iloilo City</h1>"

TOP REVENUE SPACES:
${analyticsData.topRevenue.map((s, i) => `${i+1}. ${s.space.name} - ₱${s.total_revenue.toLocaleString()} (${s.booking_count} bookings)`).join('\n\n')}

Total Revenue: ₱${analyticsData.totalRevenue.toLocaleString()}

Write an insightful blog post about what makes these spaces successful.
Use short paragraphs and bullet points.`;

        } else if (blogType === 'top_rated') {
            systemPrompt = `You are a professional blog writer for FlexSpace.
Write a blog post about the highest-rated coworking spaces.
${languageInstruction[language]}
${baseFormatting}

Required Sections:
- <h2>⭐ Customer Favorites</h2>
- <h2>📊 Top Rated Spaces</h2>
- <h2>💬 What Customers Are Saying</h2>
- <h2>🎯 Why Reviews Matter</h2>

Style: Enthusiastic, review-focused, helpful.
Length: 500-700 words.`;

            userPrompt = `Create a blog post with title "<h1>⭐ Highest Rated Coworking Spaces in Iloilo City</h1>"

TOP RATED SPACES:
${analyticsData.topRated.map((s, i) => `${i+1}. ${s.name} - ⭐ ${s.rating}/5 (${s.review_count} reviews) - ₱${s.rate_hour}/hour`).join('\n\n')}

Write an engaging blog post highlighting customer favorites.
Explain why customer reviews matter.
Use short paragraphs and proper spacing.`;
        }

        const modelsToTry = [
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.0-flash-lite',
        ];

        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`[AI Blog] 🔄 Trying model: ${modelName}`);

                const response = await genAI.models.generateContent({
                    model: modelName,
                    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                    config: {
                        systemInstruction: systemPrompt,
                        maxOutputTokens: 2000,
                        temperature: 0.7
                    }
                });

                let content = response.text?.trim();
                if (content) {
                    console.log(`[AI Blog] ✅ Success! Using model: ${modelName}`);
                    
                    // Format the content properly
                    const formattedContent = this.formatBlogContent(content, blogType);
                    
                    // Extract title from content
                    const titleMatch = formattedContent.match(/<h1>(.+?)<\/h1>/);
                    const title = titleMatch ? titleMatch[1] : `${blogType.replace('_', ' ').toUpperCase()} Blog`;
                    
                    // Generate excerpt (first 160 characters of plain text)
                    const plainText = formattedContent.replace(/<[^>]*>/g, '');
                    const excerpt = plainText.substring(0, 160) + '...';
                    
                    const slug = `${blogType}-${new Date().toISOString().split('T')[0]}-${language}`;

                    return {
                        title,
                        slug: slug.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        excerpt,
                        content: formattedContent,
                        category: blogType,
                        language,
                        generated_from: 'ai'
                    };
                }
            } catch (error) {
                lastError = error;
                console.log(`[AI Blog] ❌ Failed: ${modelName} - ${error.message}`);
                
                if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
                    console.log(`[AI Blog] Quota exceeded, waiting 5 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                continue;
            }
        }

        console.error(`[AI Blog] All models failed for ${blogType}:`, lastError?.message);
        return null;
    }

    async generateMultilingualBlogs(analyticsData, blogType) {
        const languages = ['english', 'tagalog', 'hiligaynon'];
        const results = [];

        for (const lang of languages) {
            console.log(`Generating ${blogType} blog in ${lang}...`);
            const blog = await this.generateBlogWithAI(analyticsData, blogType, lang);
            if (blog) {
                const existing = await Blog.findOne({ slug: blog.slug, language: lang });
                if (!existing) {
                    const newBlog = await Blog.create({
                        ...blog,
                        status: 'published',
                        published_at: new Date(),
                        author: 'FlexSpace AI'
                    });
                    results.push(newBlog);
                    console.log(`✅ ${blogType} blog generated in ${lang}`);
                } else {
                    console.log(`⏭️ ${blogType} blog in ${lang} already exists`);
                }
            }
        }
        return results;
    }

    async generateWeeklyBlogs() {
        console.log('🔄 Fetching analytics data...');
        const analyticsData = await this.fetchAnalyticsData('week');
        const blogTypes = ['weekly_insights', 'most_booked', 'top_revenue', 'top_rated'];
        const allResults = [];

        for (const blogType of blogTypes) {
            console.log(`\n📝 Generating ${blogType} blogs...`);
            const results = await this.generateMultilingualBlogs(analyticsData, blogType);
            allResults.push(...results);
        }

        console.log(`\n✅ Generated ${allResults.length} new blogs!`);
        return allResults;
    }

    async getPublishedBlogs(limit = 10, page = 1, language = 'english') {
        const skip = (page - 1) * limit;
        const blogs = await Blog.find({ status: 'published', language: language })
            .sort({ published_at: -1 }).skip(skip).limit(limit).lean();
        const total = await Blog.countDocuments({ status: 'published', language: language });
        return { blogs, total, page, totalPages: Math.ceil(total / limit) };
    }

    async getBlogBySlug(slug) {
        const blog = await Blog.findOne({ slug, status: 'published' });
        if (blog) {
            await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });
        }
        return blog;
    }

    async triggerGeneration() {
        try {
            const results = await this.generateWeeklyBlogs();
            return { success: true, count: results.length, blogs: results };
        } catch (error) {
            console.error('Blog generation failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AIBlogGeneratorService();