const express = require('express');
const authRoutes = require('./authRoutes'); 
const adminRoutes = require('./adminRoutes'); 
const spaceRoutes = require('./spaceRoutes'); 

class ApiRouter {
    constructor() {
        this.router = express.Router();
        this.mountRoutes();
    }

    mountRoutes() {
        this.router.use('/auth', authRoutes);
        this.router.use('/admin', adminRoutes);
        this.router.use('/space', spaceRoutes);
    }
    
    getRouter() {
        return this.router;
    }
}

module.exports = new ApiRouter().getRouter();