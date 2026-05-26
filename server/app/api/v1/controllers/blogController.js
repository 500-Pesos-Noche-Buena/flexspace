const aiBlogGeneratorService = require('@/api/v1/services/aiBlogGeneratorService');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class BlogController {
    // Get all published blogs
    getBlogs = async (req, res, next) => {
        try {
            const { page = 1, limit = 10, language = 'english' } = req.query;
            const result = await aiBlogGeneratorService.getPublishedBlogs(
                parseInt(limit), 
                parseInt(page), 
                language
            );
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };
    
    // Get single blog by slug
    getBlogBySlug = async (req, res, next) => {
        try {
            const { slug } = req.params;
            const blog = await aiBlogGeneratorService.getBlogBySlug(slug);
            
            if (!blog) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Blog not found'
                });
            }
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: blog
            });
        } catch (error) {
            next(error);
        }
    };
    
    // Trigger blog generation (protected endpoint for cron jobs)
    generateBlogs = async (req, res, next) => {
        try {
            // Optional: Add API key check for security
            const apiKey = req.headers['x-api-key'];
            const validKey = process.env.BLOG_API_KEY || 'flexspace-secret-key';
            
            if (apiKey !== validKey) {
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    message: 'Invalid API key'
                });
            }
            
            const result = await aiBlogGeneratorService.triggerGeneration();
            
            return res.status(HTTP_STATUS.OK).json({
                success: result.success,
                message: result.success ? `Generated ${result.count} blogs` : result.error,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new BlogController();