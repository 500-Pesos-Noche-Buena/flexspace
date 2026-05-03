const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processUploadedFiles } = require('./cloudinary');

// Create temp directory for multer (temporary storage only)
const tempDir = path.join(process.cwd(), 'server/temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Simple disk storage (temporary)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
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

// Export both upload middleware and processor
module.exports = { upload, processUploadedFiles };