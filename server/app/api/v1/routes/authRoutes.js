const express = require('express');
const multer = require('multer');
const authController = require('@/api/v1/controllers/authController');

const upload = multer({ 
    dest: 'uploads/temp/', 
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB file size limit
});

class AuthRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        console.log('--- 🛡️ Initializing Auth Routes ---');
        
        this.router.post('/login', (req, res, next) => authController.login(req, res, next));
        this.router.post('/logout', (req, res, next) => authController.logout(req, res, next));

        this.router.post('/register', 
            upload.any(), 
            (req, res, next) => authController.register(req, res, next)
        );
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new AuthRoutes().getRouter();