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
        const email = req.body?.email || 'unknown';
        const emailFolder = email.replace(/[^a-zA-Z0-9]/g, '_');
        return `coworking/uploads/requirements/${emailFolder}`;
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
 * Extract public ID from Cloudinary URL
 */
const extractPublicId = (url) => {
    if (!url || !url.includes('cloudinary')) return null;
    
    try {
        // Find '/upload/' in the URL
        const uploadIndex = url.indexOf('/upload/');
        if (uploadIndex === -1) return null;
        
        let publicId = url.substring(uploadIndex + 8); // +8 for '/upload/'
        
        // Remove version number if present (v1234567890/)
        const versionMatch = publicId.match(/^v\d+\//);
        if (versionMatch) {
            publicId = publicId.substring(versionMatch[0].length);
        }
        
        // Remove file extension
        const lastDotIndex = publicId.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            publicId = publicId.substring(0, lastDotIndex);
        }
        
        return publicId;
    } catch (error) {
        console.error('Error extracting public ID:', error);
        return null;
    }
};

/**
 * Delete file by URL
 */
const deleteFileByUrl = async (url) => {
    if (!url || !url.includes('cloudinary')) {
        console.log('⚠️ Not a Cloudinary URL, skipping delete');
        return false;
    }
    
    const publicId = extractPublicId(url);
    if (!publicId) {
        console.log('⚠️ Could not extract public ID from URL');
        return false;
    }
    
    try {
        console.log(`🗑️ Deleting: ${publicId}`);
        const result = await cloudinary.uploader.destroy(publicId);
        
        if (result.result === 'ok') {
            console.log(`✅ Deleted successfully: ${publicId}`);
            return true;
        } else {
            console.log(`⚠️ Delete result: ${result.result}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Delete error:', error);
        return false;
    }
};

/**
 * Upload single file to Cloudinary
 */
const uploadToCloudinary = async (filePath, req, file, options = {}) => {
    try {
        const cloudinaryFolder = getCloudinaryFolderPath(req, file);
        
        // Get extension correctly
        const originalName = file.originalname;
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `${file.fieldname}_${uniqueSuffix}${extension}`;
        
        console.log(`📤 Uploading: ${filename} to folder: ${cloudinaryFolder}`);
        
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
 * Move Cloudinary file from folder to user folder
 */
const moveToUserFolder = async (oldUrl, userId, fieldname) => {
    if (!oldUrl) return null;
    
    try {
        const oldPublicId = extractPublicId(oldUrl);
        if (!oldPublicId) {
            console.log(`⚠️ Could not extract public ID from: ${oldUrl}`);
            return oldUrl;
        }
        
        console.log(`📦 Moving ${fieldname}: ${oldPublicId} → user/${userId}`);
        
        // Extract file extension from URL
        const extensionMatch = oldUrl.match(/\.(png|jpg|jpeg|gif|webp)/i);
        const extension = extensionMatch ? extensionMatch[0] : '.png';
        const timestamp = Date.now();
        
        // New public ID in user folder
        const newPublicId = `coworking/uploads/requirements/${userId}/${fieldname}_${timestamp}${extension}`;
        
        // Re-upload to new location
        const result = await cloudinary.uploader.upload(oldUrl, {
            public_id: newPublicId,
            overwrite: true
        });
        
        // Delete old file
        await cloudinary.uploader.destroy(oldPublicId);
        
        console.log(`✅ Moved to: ${result.secure_url}`);
        return result.secure_url;
    } catch (error) {
        console.error(`❌ Error moving ${fieldname}:`, error);
        return oldUrl;
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
        if (req.file) {
            console.log(`📤 Processing single file: ${req.file.fieldname}`);
            const result = await uploadToCloudinary(req.file.path, req, req.file);
            req.cloudinaryUrl = result.secure_url;
            req.cloudinaryResult = result;
            console.log(`✅ Uploaded to Cloudinary: ${result.secure_url}`);
        }
        
        if (req.files) {
            req.cloudinaryUrls = {};
            
            if (Array.isArray(req.files)) {
                const urls = [];
                for (const file of req.files) {
                    const result = await uploadToCloudinary(file.path, req, file);
                    urls.push(result.secure_url);
                }
                req.cloudinaryUrls = urls;
                console.log(`✅ Uploaded ${urls.length} files to Cloudinary`);
            } 
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
 * Delete image from Cloudinary by public ID
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
    return imagePath;
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    deleteFileByUrl,
    extractPublicId,
    getImageUrl,
    processUploadedFiles,
    moveToUserFolder,
    getTransformationForField,
    cloudinary
};