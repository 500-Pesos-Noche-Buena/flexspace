const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create base directories
const uploadDir = path.join(process.cwd(), 'server/public/uploads/');
const spacesBaseDir = path.join(process.cwd(), 'server/public/uploads/spaces');
const requirementsDir = path.join(process.cwd(), 'server/public/uploads/requirements');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(spacesBaseDir)) fs.mkdirSync(spacesBaseDir, { recursive: true });
if (!fs.existsSync(requirementsDir)) fs.mkdirSync(requirementsDir, { recursive: true });

// Helper to get user ID from request
const getUserIdFromRequest = (req) => {
    return req.user?.id || req.user?._id || req.user?.sub;
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'business_permit' || file.fieldname === 'dti_sec_reg') {
            cb(null, requirementsDir);
        } else if (file.fieldname === 'images' || file.fieldname === 'image') {
            // Create user-specific folder for space images
            const userId = getUserIdFromRequest(req);
            const userSpacesDir = path.join(spacesBaseDir, userId);
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(userSpacesDir)) {
                fs.mkdirSync(userSpacesDir, { recursive: true });
            }
            cb(null, userSpacesDir);
        } else {
            cb(null, uploadDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { 
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 10 // Max 10 files
    }
});

module.exports = upload;