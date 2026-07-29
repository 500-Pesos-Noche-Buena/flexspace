const { GoogleGenAI } = require("@google/genai");
const config = require('@/config/config');
const { Space, Booking, Review } = require('@/api/v1/models');
const Blog = require('@/api/v1/models/schema/Blog');

const genAI = new GoogleGenAI({ apiKey: config.ai.geminiKey || process.env.GEMINI_API_KEY });

const PERIOD_LABELS = {
    week: 'Weekly',
    month: 'Monthly',
    quarter: 'Quarterly',
    year: 'Yearly'
};

const PERIOD_TIMEFRAME_NOUN = {
    week: 'Week',
    month: 'Month',
    quarter: 'Quarter',
    year: 'Year'
};

class AIBlogGeneratorService {

    async fetchAnalyticsData(period = 'month') {
        const startDate = new Date();
        if (period === 'week') startDate.setDate(startDate.getDate() - 7);
        else if (period === 'month') startDate.setDate(startDate.getDate() - 30);
        else if (period === 'quarter') startDate.setMonth(startDate.getMonth() - 3);
        else if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1);

        const topBooked = await Booking.aggregate([
            { $match: { created_at: { $gte: startDate }, status: 'completed' } },
            { $group: { _id: '$space_id', booking_count: { $sum: 1 } } },
            { $sort: { booking_count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'spaces', localField: '_id', foreignField: '_id', as: 'space' } },
            { $unwind: '$space' }
        ]);

        const topRated = await Space.find({ status: 'Open Now' })
            .sort({ rating: -1, review_count: -1 })
            .limit(5)
            .lean();

        const totalBookings = await Booking.countDocuments({ created_at: { $gte: startDate }, status: 'completed' });

        return {
            period,
            startDate,
            topBooked,
            topRated,
            totalBookings,
            totalSpaces: await Space.countDocuments({ status: 'Open Now' })
        };
    }

    formatBlogContent(content, blogType) {
        let formatted = content;

        // Convert markdown bold to <strong> BEFORE anything else touches the text
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

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

        // Strip any stray emoji the model may have added despite instructions
        formatted = formatted.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, '');
        formatted = formatted.replace(/[ \t]{2,}/g, ' ');

        // Add article wrapper
        formatted = `<article class="blog-post">\n${formatted}\n</article>`;

        return formatted;
    }

    async generateBlogWithAI(analyticsData, blogType, language = 'english', period = 'week') {
        const periodLabel = PERIOD_LABELS[period] || 'Weekly';
        const timeframeNoun = PERIOD_TIMEFRAME_NOUN[period] || 'Week';

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
10. Do NOT use any emoji or emoji-style symbols anywhere in the post, including in headings, titles, or lists. Plain text headings only.
11. Do NOT include revenue, earnings, or peso amounts anywhere in this post. Only discuss booking counts and space quality.
12. Avoid vague, hedging filler language such as "might be", "likely", "perhaps", or "probably" when describing why a space is popular. If the data doesn't explain why, describe what customers can expect there instead, based only on the facts provided.
13. Do not repeat the same sentence structure across paragraphs. Vary sentence length and openings.
`;

        if (blogType === 'weekly_insights') {
            systemPrompt = `You are a professional blog writer for FlexSpace in Iloilo City.
Write a ${periodLabel.toLowerCase()} insights blog post covering the past ${timeframeNoun.toLowerCase()}.
${languageInstruction[language]}
${baseFormatting}

Required Sections (use these exact plain-text headings, no emoji):
- <h2>This ${timeframeNoun}'s Highlights</h2>
- <h2>Active Spaces Overview</h2>
- <h2>Top Performing Spaces</h2>
- <h2>What This Means for You</h2>
- <h2>Looking Ahead</h2>
- <h2>Final Thoughts</h2>

Style: Clear, professional, data-driven. No hype words like "buzzing" or "thrilled" more than once in the entire post.
Length: 500-700 words.`;

            userPrompt = `Create a blog post with title "<h1>FlexSpace ${periodLabel}: Coworking Trends in Iloilo City</h1>"

DATA (covering the past ${timeframeNoun.toLowerCase()}):
- Total Bookings: ${analyticsData.totalBookings}
- Active Spaces: ${analyticsData.totalSpaces}
- Most Booked: ${analyticsData.topBooked[0]?.space?.name || 'No data yet'}

${analyticsData.topBooked.length > 0 ? `TOP SPACES BY BOOKINGS:
${analyticsData.topBooked.map((s, i) => `${i + 1}. ${s.space.name} - ${s.booking_count} bookings`).join('\n')}` : ''}

FORMAT INSTRUCTIONS:
- Write SHORT paragraphs (2-3 sentences each)
- Put a BLANK LINE between every paragraph
- Use BULLET POINTS with <ul> and <li>
- Do not mention revenue or peso amounts anywhere
- Close with a grounded, practical note about what this booking activity means for Iloilo's coworking community, not generic cheerleading`;

        } else if (blogType === 'most_booked') {
            systemPrompt = `You are a professional blog writer for FlexSpace.
Write a blog post about the most booked coworking spaces over the past ${timeframeNoun.toLowerCase()}, based only on booking counts.
${languageInstruction[language]}
${baseFormatting}

Required Sections (plain-text headings, no emoji):
- <h2>The People's Choice</h2>
- <h2>Top Booked Spaces</h2>
- <h2>What Makes Them Stand Out</h2>
- <h2>Find Your Perfect Space</h2>

Style: Informative and engaging, but grounded in the actual numbers given. Do not invent details about amenities, atmosphere, or location that were not provided in the data.
Length: 500-700 words.`;

            userPrompt = `Create a blog post with title "<h1>Most Booked Coworking Spaces in Iloilo City</h1>"

TOP BOOKED SPACES (by booking count only, over the past ${timeframeNoun.toLowerCase()}, no revenue):
${analyticsData.topBooked.map((s, i) => `${i + 1}. ${s.space.name} - ${s.booking_count} bookings`).join('\n')}

Total Bookings: ${analyticsData.totalBookings}

Write a blog post highlighting these spaces based strictly on booking counts.
Do not mention revenue, earnings, or peso amounts anywhere.
Do not speculate about why a space is popular ("might be", "perhaps") — instead, frame it around booking numbers and general benefits of coworking that apply to any well-run space.
Use short paragraphs, bullet points, and proper spacing.`;

        } else if (blogType === 'top_rated') {
            systemPrompt = `You are a professional blog writer for FlexSpace.
Write a blog post about the highest-rated coworking spaces.
${languageInstruction[language]}
${baseFormatting}

Required Sections (plain-text headings, no emoji):
- <h2>Customer Favorites</h2>
- <h2>Top Rated Spaces</h2>
- <h2>What Customers Are Saying</h2>
- <h2>Why Reviews Matter</h2>

Style: Enthusiastic but factual, review-focused, helpful.
Length: 500-700 words.`;

            userPrompt = `Create a blog post with title "<h1>Highest Rated Coworking Spaces in Iloilo City</h1>"

TOP RATED SPACES:
${analyticsData.topRated.map((s, i) => `${i + 1}. ${s.name} - ${s.rating}/5 rating (${s.review_count} reviews) - Php${s.rate_hour}/hour`).join('\n\n')}

Write an engaging blog post highlighting customer favorites based on ratings and review counts.
Explain why customer reviews matter when choosing a coworking space.
Do not mention revenue or booking counts.
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
                console.log(`[AI Blog] Trying model: ${modelName}`);

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
                    console.log(`[AI Blog] Success using model: ${modelName}`);

                    // Format the content properly
                    const formattedContent = this.formatBlogContent(content, blogType);

                    // Extract title from content
                    const titleMatch = formattedContent.match(/<h1>(.+?)<\/h1>/);
                    const title = titleMatch ? titleMatch[1] : `${blogType.replace('_', ' ').toUpperCase()} Blog`;

                    // Generate excerpt (first 160 characters of plain text)
                    const plainText = formattedContent.replace(/<[^>]*>/g, '');
                    const excerpt = plainText.substring(0, 160) + '...';

                    // Include period in slug so weekly/monthly/quarterly/yearly runs on the
                    // same day don't collide and silently get skipped as "already exists"
                    const slug = `${blogType}-${period}-${new Date().toISOString().split('T')[0]}-${language}`;

                    return {
                        success: true,
                        title,
                        slug: slug.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        excerpt,
                        content: formattedContent,
                        category: blogType,
                        period,
                        language,
                        generated_from: 'ai'
                    };
                }
            } catch (error) {
                lastError = error;
                console.log(`[AI Blog] Failed: ${modelName} - ${error.message}`);

                if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
                    console.log(`[AI Blog] Quota exceeded, waiting 5 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                continue;
            }
        }

        const errorMessage = lastError?.message || 'Unknown error: no model returned content';
        console.error(`[AI Blog] All models failed for ${blogType} (${period}/${language}):`, errorMessage);
        return { success: false, error: errorMessage };
    }

    async generateMultilingualBlogs(analyticsData, blogType, period = 'week') {
        const languages = ['english', 'tagalog', 'hiligaynon'];
        const results = [];
        const failures = [];

        for (const lang of languages) {
            console.log(`Generating ${blogType} blog in ${lang} (${period})...`);
            const blog = await this.generateBlogWithAI(analyticsData, blogType, lang, period);

            if (blog.success) {
                const existing = await Blog.findOne({ slug: blog.slug, language: lang });
                if (!existing) {
                    const newBlog = await Blog.create({
                        ...blog,
                        status: 'published',
                        published_at: new Date(),
                        author: 'FlexSpace AI'
                    });
                    results.push(newBlog);
                    console.log(`${blogType} blog generated in ${lang} (${period})`);
                } else {
                    console.log(`${blogType} blog in ${lang} (${period}) already exists`);
                }
            } else {
                console.error(`${blogType} blog in ${lang} (${period}) FAILED: ${blog.error}`);
                failures.push({ blogType, language: lang, period, error: blog.error });
            }

            // Space out requests so we don't trip Gemini's per-minute rate limit
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        return { results, failures };
    }

    /**
     * Generic entry point — generates the full set of blog types (weekly_insights,
     * most_booked, top_rated) x all languages, for whichever period is passed in.
     * period: 'week' | 'month' | 'quarter' | 'year'
     */
    async generateBlogsForPeriod(period = 'week') {
        console.log(`Fetching analytics data (${period})...`);
        const analyticsData = await this.fetchAnalyticsData(period);
        const blogTypes = ['weekly_insights', 'most_booked', 'top_rated'];
        const allResults = [];
        const allFailures = [];

        for (const blogType of blogTypes) {
            console.log(`Generating ${blogType} blogs (${period})...`);
            const { results, failures } = await this.generateMultilingualBlogs(analyticsData, blogType, period);
            allResults.push(...results);
            allFailures.push(...failures);
        }

        console.log(`Generated ${allResults.length} new blogs for period=${period}!`);
        if (allFailures.length > 0) {
            console.warn(`${allFailures.length} generation(s) failed for period=${period}:`, allFailures);
        }
        return { results: allResults, failures: allFailures };
    }

    // Convenience wrappers — handy for cron jobs and for keeping old call sites working
    async generateWeeklyBlogs() {
        return this.generateBlogsForPeriod('week');
    }

    async generateMonthlyBlogs() {
        return this.generateBlogsForPeriod('month');
    }

    async generateQuarterlyBlogs() {
        return this.generateBlogsForPeriod('quarter');
    }

    async generateYearlyBlogs() {
        return this.generateBlogsForPeriod('year');
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

    /**
     * period: 'week' | 'month' | 'quarter' | 'year' (defaults to 'week' for
     * backward compatibility with existing callers/cron jobs)
     */
    async triggerGeneration(period = 'week') {
        try {
            const { results, failures } = await this.generateBlogsForPeriod(period);
            return {
                success: true,
                period,
                count: results.length,
                blogs: results,
                failedCount: failures.length,
                failed: failures
            };
        } catch (error) {
            console.error('Blog generation failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AIBlogGeneratorService();