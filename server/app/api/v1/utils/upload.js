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
        fileSize: 50 * 1024 * 1024,
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
        console.log('📸 req.files:', req.files);
        console.log('Type of req.files:', typeof req.files);
        console.log('Is array:', Array.isArray(req.files));
        
        // Check if files exist
        if (!req.files) {
            console.log('No files found');
            req.cloudinaryUrls = {};
            return next();
        }

        const cloudinaryUrls = {};

        // Handle array format (from upload.array)
        if (Array.isArray(req.files)) {
            console.log(`Processing ${req.files.length} files from array`);
            cloudinaryUrls.images = [];
            
            for (const file of req.files) {
                // Read file as Buffer
                const fileBuffer = fs.readFileSync(file.path);
                
                console.log(`📤 Uploading: ${file.originalname}, size: ${fileBuffer.length} bytes`);
                
                // Add to queue
                const job = await cloudinaryQueue.add('upload', {
                    action: 'upload',
                    data: {
                        fileBuffer: fileBuffer,
                        folder: `coworking/images`,
                        filename: file.filename,
                        originalname: file.originalname,
                        fieldname: 'images',
                        mimetype: file.mimetype
                    }
                });
                
                // Wait for job to complete
                const result = await job.finished();
                
                console.log(`✅ Uploaded: ${result.url}`);
                
                cloudinaryUrls.images.push(result.url);
                
                // Clean up temp file
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    console.error('Failed to delete temp file:', err);
                }
            }
        } 
        // Handle object format (from upload.fields)
        else if (typeof req.files === 'object' && req.files !== null) {
            console.log('Processing object with fields:', Object.keys(req.files));
            
            for (const [fieldName, files] of Object.entries(req.files)) {
                if (Array.isArray(files) && files.length > 0) {
                    cloudinaryUrls[fieldName] = [];
                    
                    for (const file of files) {
                        const fileBuffer = fs.readFileSync(file.path);
                        
                        console.log(`📤 Uploading ${fieldName}: ${file.originalname}, size: ${fileBuffer.length} bytes`);
                        
                        const job = await cloudinaryQueue.add('upload', {
                            action: 'upload',
                            data: {
                                fileBuffer: fileBuffer,
                                folder: `coworking/${fieldName}`,
                                filename: file.filename,
                                originalname: file.originalname,
                                fieldname: fieldName,
                                mimetype: file.mimetype
                            }
                        });
                        
                        const result = await job.finished();
                        
                        console.log(`✅ Uploaded ${fieldName}: ${result.url}`);
                        
                        cloudinaryUrls[fieldName].push(result.url);
                        
                        try {
                            fs.unlinkSync(file.path);
                        } catch (err) {
                            console.error('Failed to delete temp file:', err);
                        }
                    }
                }
            }
        } else {
            console.log('Unknown req.files format:', req.files);
            req.cloudinaryUrls = {};
            return next();
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