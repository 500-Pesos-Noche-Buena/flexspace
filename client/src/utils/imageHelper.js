// utils/imageHelper.js
/**
 * Get space image URL - Cloudinary ONLY
 * @param {object} space - Space object with image property
 * @returns {string} - Cloudinary URL or placeholder
 */
export const getSpaceImage = (space) => {
    if (!space) return '/placeholders/space.jpg';
    
    const image = space.image;
    
    // If no image, return placeholder
    if (!image) return '/placeholders/space.jpg';
    
    // If it's a Cloudinary URL, use it
    if (image.startsWith('http://') || image.startsWith('https://')) {
        return image;
    }
    
    // If it's NOT a Cloudinary URL (local path), return placeholder
    // This forces local images to show placeholder instead of broken links
    console.warn('Local image path found - not a Cloudinary URL:', image);
    return '/placeholders/space.jpg';
};

/**
 * Get QR code image - Cloudinary ONLY
 * @param {string} qrUrl - QR code URL
 * @returns {string} - Cloudinary URL or QR placeholder
 */
export const getQrImage = (qrUrl) => {
    if (!qrUrl) return '/placeholders/qr.png';
    
    if (qrUrl.startsWith('http://') || qrUrl.startsWith('https://')) {
        return qrUrl;
    }
    
    console.warn('Local QR path found - not a Cloudinary URL:', qrUrl);
    return '/placeholders/qr.png';
};

/**
 * Generic image URL helper - Cloudinary ONLY
 * @param {string} imageUrl - Cloudinary URL
 * @param {string} placeholderType - Type of placeholder
 * @returns {string} - Cloudinary URL or local placeholder
 */
export const getImageUrl = (imageUrl, placeholderType = 'default') => {
    if (!imageUrl) return `/placeholders/${placeholderType}.jpg`;
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }
    
    return `/placeholders/${placeholderType}.jpg`;
};