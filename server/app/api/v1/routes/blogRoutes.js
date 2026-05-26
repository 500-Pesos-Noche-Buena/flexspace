const express = require('express');
const blogController = require('@/api/v1/controllers/blogController');
const protect = require('@/api/v1/middleware/protectionMiddleware');

class BlogRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        console.log('--- 📝 Initializing Blog Routes ---');

        // Public routes (no authentication required)
        this.router.get('/', (req, res, next) => 
            blogController.getBlogs(req, res, next)
        );

        this.router.get('/:slug', (req, res, next) => 
            blogController.getBlogBySlug(req, res, next)
        );

        // Protected route for cron jobs (add API key check or admin auth)
        this.router.post('/generate', (req, res, next) => 
            blogController.generateBlogs(req, res, next)
        );
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new BlogRoutes().getRouter();