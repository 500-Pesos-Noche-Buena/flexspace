const express = require('express');
const authRoutes = require('./authRoutes'); 
const adminRoutes = require('./adminRoutes'); 

class ApiRouter {
    constructor() {
        this.router = express.Router();
        this.mountRoutes();
    }

    mountRoutes() {
        this.router.use('/auth', authRoutes);
        this.router.use('/admin', adminRoutes);
    }
    
    getRouter() {
        return this.router;
    }
}

module.exports = new ApiRouter().getRouter();