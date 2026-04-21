const express = require('express');
const landingController = require('@/api/v1/controllers/landingController');
const protect = require('@/api/v1/middleware/protectionMiddleware');

class LandingRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        console.log('--- 🛡️ Initializing Landing Routes ---');

        this.router.get('/explorer', protect, (req, res, next) => 
            landingController.getExplorerData(req, res, next)
        );
        
        this.router.get('/space/:id', protect, (req, res, next) => 
            landingController.getSpaceDetails(req, res, next)
        );
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new LandingRoutes().getRouter();