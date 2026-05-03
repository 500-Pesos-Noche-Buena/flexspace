const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const config = require('@/config/config');

cloudinary.config({
    cloud_name: config.cloudinary.cloud_name,
    api_key: config.cloudinary.api_key,
    api_secret: config.cloudinary.api_secret
});

/**
 * Get folder path structure for Cloudinary
 */
const getCloudinaryFolderPath = (req, file) => {
    const userId = req.user?.id || req.user?._id || req.user?.sub;
    
    if (file.fieldname === 'business_permit' || file.fieldname === 'dti_sec_reg') {
        if (userId) {
            return `coworking/uploads/requirements/${userId}`;
        }
        // For registration - use consistent pending folder
        return `coworking/uploads/requirements/pending`;
    } 
    else if (file.fieldname === 'images' || file.fieldname === 'image') {
        if (userId) {
            return `coworking/uploads/spaces/${userId}/images`;
        }
        return `coworking/uploads/spaces/temp`;
    }
    else if (file.fieldname === 'qr_code' || file.fieldname === 'payment_qr') {
        if (userId) {
            return `coworking/uploads/spaces/${userId}/payment`;
        }
        return `coworking/uploads/spaces/payment`;
    }
    
    return `coworking/uploads`;
};

/**
 * Get transformation based on file fieldname
 */
const getTransformationForField = (fieldname) => {
    const transformations = {
        'qr_code': [
            { width: 500, height: 500, crop: "limit" },
            { quality: "auto:good", fetch_format: "auto" }
        ],
        'payment_qr': [
            { width: 500, height: 500, crop: "limit" },
            { quality: "auto:good", fetch_format: "auto" }
        ],
        'images': [
            { width: 1200, crop: "limit" },
            { quality: "auto:good", fetch_format: "auto" }
        ],
        'image': [
            { width: 1200, crop: "limit" },
            { quality: "auto:good", fetch_format: "auto" }
        ],
        'business_permit': [
            { quality: "auto:good" }
        ],
        'dti_sec_reg': [
            { quality: "auto:good" }
        ]
    };
    
    return transformations[fieldname] || [{ quality: "auto:good", fetch_format: "auto" }];
};

/**
 * Upload single file to Cloudinary (always)
 */
const uploadToCloudinary = async (filePath, req, file, options = {}) => {
    try {
        const cloudinaryFolder = getCloudinaryFolderPath(req, file);
        
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `${file.fieldname}_${uniqueSuffix}${path.extname(file.originalname)}`;
        
        const result = await cloudinary.uploader.upload(filePath, {
            folder: cloudinaryFolder,
            public_id: filename,
            transformation: options.transformation || getTransformationForField(file.fieldname),
            ...options
        });
        
        // Delete local temp file after upload
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.log('Could not delete local file:', err.message);
        }
        
        return {
            url: result.secure_url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};

/**
 * Move Cloudinary file from pending/old folder to permanent user folder
 * @param {string} oldUrl - Current Cloudinary URL
 * @param {string} userId - User ID for new folder
 * @param {string} fieldname - Field name (business_permit, dti_sec_reg, etc.)
 * @returns {Promise<string>} - New Cloudinary URL
 */
const moveToUserFolder = async (oldUrl, userId, fieldname) => {
    if (!oldUrl) return null;
    
    try {
        // Extract public ID from old URL
        const urlParts = oldUrl.split('/upload/');
        const oldPublicId = urlParts[1].split('.')[0];
        
        console.log(`📦 Moving ${fieldname}: ${oldPublicId} → user/${userId}`);
        
        // Extract file extension
        const extension = oldUrl.split('.').pop();
        const timestamp = Date.now();
        
        // New public ID in user folder
        const newPublicId = `coworking/uploads/requirements/${userId}/${fieldname}_${timestamp}.${extension}`;
        
        // Re-upload to new location
        const result = await cloudinary.uploader.upload(oldUrl, {
            public_id: newPublicId,
            overwrite: true
        });
        
        // Delete old file
        await cloudinary.uploader.destroy(oldPublicId);
        
        return result.secure_url;
    } catch (error) {
        console.error(`❌ Error moving ${fieldname}:`, error);
        return oldUrl; // Keep old URL if move fails
    }
};

/**
 * Process uploaded files (always upload to Cloudinary)
 */
const processUploadedFiles = async (req, res, next) => {
    if (!req.files && !req.file) {
        return next();
    }
    
    try {
        // Handle single file upload
        if (req.file) {
            console.log(`📤 Processing single file: ${req.file.fieldname}`);
            const result = await uploadToCloudinary(req.file.path, req, req.file);
            req.cloudinaryUrl = result.secure_url;
            req.cloudinaryResult = result;
            console.log(`✅ Uploaded to Cloudinary: ${result.secure_url}`);
        }
        
        // Handle multiple files
        if (req.files) {
            req.cloudinaryUrls = {};
            
            // Handle array of files (upload.array)
            if (Array.isArray(req.files)) {
                const urls = [];
                for (const file of req.files) {
                    const result = await uploadToCloudinary(file.path, req, file);
                    urls.push(result.secure_url);
                }
                req.cloudinaryUrls = urls;
                console.log(`✅ Uploaded ${urls.length} files to Cloudinary`);
            } 
            // Handle object with fieldnames (upload.fields)
            else {
                for (const fieldname in req.files) {
                    const files = req.files[fieldname];
                    const urls = [];
                    
                    console.log(`📤 Processing ${files.length} file(s) for field: ${fieldname}`);
                    
                    for (const file of files) {
                        const result = await uploadToCloudinary(file.path, req, file);
                        urls.push(result.secure_url);
                    }
                    
                    req.cloudinaryUrls[fieldname] = urls;
                    console.log(`✅ Uploaded ${urls.length} files for field: ${fieldname}`);
                }
            }
        }
        
        next();
    } catch (error) {
        console.error('File processing error:', error);
        next(error);
    }
};

/**
 * Delete image from Cloudinary
 */
const deleteFromCloudinary = async (publicId) => {
    if (!publicId) return true;
    
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return false;
    }
};

/**
 * Get URL for stored image
 */
const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    return imagePath; // Cloudinary URLs are already full URLs
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    getImageUrl,
    processUploadedFiles,
    moveToUserFolder,  // Export the new function
    getTransformationForField,
    cloudinary
};