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
    }
});

// Process uploaded files - QUEUE VERSION
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
                
                // Add to queue - make sure buffer is passed correctly
                const job = await cloudinaryQueue.add('upload', {
                    action: 'upload',
                    data: {
                        fileBuffer: fileBuffer, // This should be a Buffer
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
                    status: 'queued'
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