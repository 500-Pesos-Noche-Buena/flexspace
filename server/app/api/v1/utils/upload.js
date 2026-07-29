// upload.js - FIXED with better error handling
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinaryQueue } = require('@/config/queue');

// Create temp directory
const tempDir = path.join(process.cwd(), 'server/temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

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
        fileSize: 10 * 1024 * 1024, // Reduced to 10MB for better performance
        files: 10
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'image/webp', 
            'application/pdf'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            const error = new Error('Invalid file type. Only images and PDFs are allowed.');
            error.code = 'LIMIT_FILE_TYPES';
            cb(error, false);
        }
    }
});

const processUploadedFiles = async (req, res, next) => {
    try {
        if (!req.files) {
            req.cloudinaryUrls = {};
            return next();
        }

        const cloudinaryUrls = {};

        // Helper function to upload with timeout
        const uploadWithTimeout = async (file, folder) => {
            const fileBuffer = fs.readFileSync(file.path);
            
            console.log(`📤 Uploading: ${file.originalname}, size: ${fileBuffer.length} bytes`);
            
            // Add to queue with timeout
            const job = await cloudinaryQueue.add('upload', {
                action: 'upload',
                data: {
                    fileBuffer: fileBuffer,
                    folder: folder,
                    filename: file.filename,
                    originalname: file.originalname,
                    fieldname: file.fieldname || 'images',
                    mimetype: file.mimetype
                }
            });
            
            // Wait for job with timeout
            const result = await Promise.race([
                job.finished(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Upload timeout after 2 minutes')), 120000)
                )
            ]);
            
            // Clean up temp file
            try {
                fs.unlinkSync(file.path);
            } catch (err) {
                console.warn('Could not delete temp file:', err.message);
            }
            
            return result.url;
        };

        // Handle array format
        if (Array.isArray(req.files)) {
            cloudinaryUrls.images = [];
            
            // Upload one by one with error handling
            for (const file of req.files) {
                try {
                    const url = await uploadWithTimeout(file, 'coworking/images');
                    cloudinaryUrls.images.push(url);
                    console.log(`✅ Uploaded: ${url}`);
                } catch (error) {
                    console.error(`❌ Failed to upload ${file.originalname}:`, error.message);
                    // Continue with other files
                    cloudinaryUrls.images.push(null);
                }
            }
            
            // Filter out failed uploads
            cloudinaryUrls.images = cloudinaryUrls.images.filter(url => url !== null);
        } 
        // Handle object format
        else if (typeof req.files === 'object' && req.files !== null) {
            for (const [fieldName, files] of Object.entries(req.files)) {
                if (Array.isArray(files) && files.length > 0) {
                    cloudinaryUrls[fieldName] = [];
                    
                    for (const file of files) {
                        try {
                            const url = await uploadWithTimeout(file, `coworking/${fieldName}`);
                            cloudinaryUrls[fieldName].push(url);
                            console.log(`✅ Uploaded ${fieldName}: ${url}`);
                        } catch (error) {
                            console.error(`❌ Failed to upload ${fieldName}:`, error.message);
                            cloudinaryUrls[fieldName].push(null);
                        }
                    }
                    
                    cloudinaryUrls[fieldName] = cloudinaryUrls[fieldName].filter(url => url !== null);
                }
            }
        }
        
        console.log('✅ All files uploaded successfully:', cloudinaryUrls);
        req.cloudinaryUrls = cloudinaryUrls;
        next();
        
    } catch (error) {
        console.error('Process upload error:', error);
        next(error);
    }
};

module.exports = { upload, processUploadedFiles };