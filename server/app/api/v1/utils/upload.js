// upload.js - FIXED for Vercel compatibility
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinaryQueue } = require('@/config/queue');

// Use memory storage for Vercel compatibility
const storage = multer.memoryStorage();

const upload = multer({ 
    storage,
    limits: { 
        fileSize: 25 * 1024 * 1024, // 25MB limit for high-res panoramas & images
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

const isValidMagicBytes = (buffer) => {
    if (!buffer || buffer.length < 4) return false;
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
    // GIF: 47 49 46 38
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
    // PDF: 25 50 44 46 (%PDF)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return true;
    // WebP: RIFF....WEBP
    if (buffer.length >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return true;
    }
    return false;
};

const getTargetFolder = (fieldName) => {
    if (fieldName === 'panoramas' || fieldName === 'panorama_images') {
        return 'coworking/panoramas';
    }
    if (fieldName === 'room_images') {
        return 'coworking/room_images';
    }
    return 'coworking/images';
};

const processUploadedFiles = async (req, res, next) => {
    try {
        if (!req.files) {
            req.cloudinaryUrls = {};
            return next();
        }

        const cloudinaryUrls = {};

        // Helper function to upload with timeout - using buffer directly
        const uploadWithTimeout = async (file, folder) => {
            // Get buffer from memory storage
            const fileBuffer = file.buffer;
            
            if (!fileBuffer || fileBuffer.length === 0) {
                throw new Error('Empty file buffer');
            }

            if (!isValidMagicBytes(fileBuffer)) {
                throw new Error('Invalid file content: signature does not match allowed image or PDF format');
            }
            
            console.log(`📤 Uploading: ${file.originalname}, size: ${fileBuffer.length} bytes`);
            
            // Add to queue with timeout
            const job = await cloudinaryQueue.add('upload', {
                action: 'upload',
                data: {
                    fileBuffer: fileBuffer.toString('base64'), // Convert to base64 for queue
                    folder: folder,
                    filename: file.filename || file.originalname,
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
            
            return result.url;
        };

        // Handle array format
        if (Array.isArray(req.files)) {
            const fieldName = req.files[0]?.fieldname || 'images';
            cloudinaryUrls[fieldName] = [];
            const folder = getTargetFolder(fieldName);
            
            // Upload one by one with error handling
            for (const file of req.files) {
                try {
                    const url = await uploadWithTimeout(file, folder);
                    cloudinaryUrls[fieldName].push(url);
                    console.log(`✅ Uploaded ${fieldName}: ${url}`);
                } catch (error) {
                    console.error(`❌ Failed to upload ${file.originalname}:`, error.message);
                    // Continue with other files
                    cloudinaryUrls[fieldName].push(null);
                }
            }
            
            // Filter out failed uploads
            cloudinaryUrls[fieldName] = cloudinaryUrls[fieldName].filter(url => url !== null);
            // Backward compatibility
            if (fieldName === 'images') {
                cloudinaryUrls.images = cloudinaryUrls[fieldName];
            }
        } 
        // Handle object format
        else if (typeof req.files === 'object' && req.files !== null) {
            for (const [fieldName, files] of Object.entries(req.files)) {
                if (Array.isArray(files) && files.length > 0) {
                    cloudinaryUrls[fieldName] = [];
                    const folder = getTargetFolder(fieldName);
                    
                    for (const file of files) {
                        try {
                            const url = await uploadWithTimeout(file, folder);
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

module.exports = { upload, processUploadedFiles, isValidMagicBytes };