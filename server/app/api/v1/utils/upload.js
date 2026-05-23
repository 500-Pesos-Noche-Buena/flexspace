const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinaryQueue } = require('@/config/queue');

// Create temp directory
const tempDir = path.join(process.cwd(), 'server/temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Use disk storage (temporary files)
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
        fileSize: 5 * 1024 * 1024,
        files: 10
    },
    fileFilter: (req, file, cb) => {
        // Define allowed mimetypes
        const allowedTypes = [
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'image/webp', 
            'application/pdf'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true); // Accept the file
        } else {
            // Reject the file
            const error = new Error('Invalid file type. Only images and PDFs are allowed.');
            error.code = 'LIMIT_FILE_TYPES';
            cb(error, false);
        }
    }
});

const processUploadedFiles = async (req, res, next) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            req.cloudinaryUrls = {};
            return next();
        }

        const cloudinaryUrls = {};

        for (const [fieldName, files] of Object.entries(req.files)) {
            cloudinaryUrls[fieldName] = [];
            
            for (const file of files) {
                // Read file as Buffer
                const fileBuffer = fs.readFileSync(file.path);
                
                console.log(`📤 Queueing ${fieldName}: ${file.originalname}, buffer size: ${fileBuffer.length}`);
                
                // ✅ FIXED: Match the structure expected by cloudinaryProcessor
                const job = await cloudinaryQueue.add('upload', {
                    action: 'upload',
                    data: {  // <-- ADD THIS NESTED DATA OBJECT
                        fileBuffer: fileBuffer,
                        folder: `coworking/${fieldName}`,
                        filename: file.filename,
                        originalname: file.originalname,
                        fieldname: fieldName,
                        mimetype: file.mimetype
                    }
                });
                
                console.log(`📤 Queued ${fieldName} upload, job ID: ${job.id}`);
                
                cloudinaryUrls[fieldName].push({
                    jobId: job.id,
                    status: 'queued',
                    filename: file.originalname
                });
                
                // Clean up temp file
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    // Ignore cleanup errors
                }
            }
        }

        req.cloudinaryUrls = cloudinaryUrls;
        next();
    } catch (error) {
        console.error('Process upload error:', error);
        next(error);
    }
};

module.exports = { upload, processUploadedFiles };