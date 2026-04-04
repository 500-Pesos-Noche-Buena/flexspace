const express = require('express');
const authRoutes = require('./authRoutes'); 
const adminRoutes = require('./adminRoutes'); 
const spaceRoutes = require('./spaceRoutes'); 
const landingRoutes = require('./landingRoutes');
const userRoutes = require('./userRoutes');

class ApiRouter {
    constructor() {
        this.router = express.Router();
        this.mountRoutes();
    }

    mountRoutes() {
        console.log('--- 🚀 Mounting API v1 Routes ---');
        this.router.use('/auth', authRoutes);
        this.router.use('/landing', landingRoutes);
        this.router.use('/admin', adminRoutes);
        this.router.use('/space', spaceRoutes);
        this.router.use('/user', userRoutes);
    }
    
    getRouter() {
        return this.router;
    }
}

module.exports = new ApiRouter().getRouter();