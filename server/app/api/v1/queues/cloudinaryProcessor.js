const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const cloudinaryProcessor = async (job) => {
    const { action, data } = job.data;
    
    console.log(`☁️ Processing Cloudinary job ${job.id}: action=${action}`);
    
    try {
        if (action === 'upload') {
            const { fileBuffer, folder, originalname, fieldname, mimetype } = data;
            
            console.log(`☁️ Uploading ${fieldname}: ${originalname}`);
            console.log(`☁️ Buffer type: ${typeof fileBuffer}, is Buffer: ${Buffer.isBuffer(fileBuffer)}`);
            
            // Ensure fileBuffer is a Buffer
            let buffer;
            if (Buffer.isBuffer(fileBuffer)) {
                buffer = fileBuffer;
            } else if (fileBuffer && fileBuffer.data) {
                // Sometimes bull serializes buffers as objects with data property
                buffer = Buffer.from(fileBuffer.data);
            } else if (fileBuffer && typeof fileBuffer === 'object') {
                // Try to convert if it's an object
                buffer = Buffer.from(JSON.stringify(fileBuffer));
            } else {
                throw new Error('Invalid file buffer format');
            }
            
            const folderPath = folder || `coworking/${fieldname}`;
            
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: folderPath,
                        public_id: `${fieldname}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
                        resource_type: 'auto'
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(buffer);
            });
            
            console.log(`✅ Uploaded to Cloudinary: ${result.secure_url}`);
            return { 
                success: true, 
                url: result.secure_url, 
                publicId: result.public_id 
            };
        }
        
        if (action === 'delete') {
            const { publicId } = data;
            const result = await cloudinary.uploader.destroy(publicId);
            console.log(`✅ Deleted from Cloudinary: ${publicId}`);
            return { success: true };
        }
        
        throw new Error(`Unknown action: ${action}`);
        
    } catch (error) {
        console.error(`❌ Cloudinary job ${job.id} failed:`, error.message);
        throw error;
    }
};

module.exports = cloudinaryProcessor;