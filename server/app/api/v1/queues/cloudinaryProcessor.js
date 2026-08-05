// queues/cloudinaryProcessor.js - FIXED for buffer handling
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    timeout: 120000, // 2 minutes
});

const cloudinaryProcessor = async (job) => {
    const { action, data } = job.data;
    
    console.log(`☁️ Processing Cloudinary job ${job.id}: action=${action}`);
    
    try {
        if (action === 'upload') {
            const { fileBuffer, folder, originalname, fieldname, mimetype } = data;
            
            console.log(`☁️ Uploading ${fieldname}: ${originalname} (${fileBuffer?.length || 0} chars)`);
            
            // Convert base64 back to buffer
            let buffer;
            if (typeof fileBuffer === 'string') {
                // Check if it's base64
                if (fileBuffer.startsWith('data:image')) {
                    // Extract base64 part
                    const base64Data = fileBuffer.split(',')[1] || fileBuffer;
                    buffer = Buffer.from(base64Data, 'base64');
                } else {
                    buffer = Buffer.from(fileBuffer, 'base64');
                }
            } else if (Buffer.isBuffer(fileBuffer)) {
                buffer = fileBuffer;
            } else {
                throw new Error(`Invalid buffer format: ${typeof fileBuffer}`);
            }
            
            if (!buffer || buffer.length === 0) {
                throw new Error('Empty file buffer');
            }
            
            const folderPath = folder || `coworking/${fieldname}`;
            const publicId = `${fieldname}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
            
            console.log(`☁️ Uploading to folder: ${folderPath}, public_id: ${publicId}, size: ${buffer.length} bytes`);
            
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: folderPath,
                        public_id: publicId,
                        resource_type: 'auto',
                        timeout: 120000,
                        eager: [
                            { width: 1200, crop: "limit", quality: "auto" }
                        ]
                    },
                    (error, result) => {
                        if (error) {
                            console.error(`❌ Cloudinary upload error:`, error.message);
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );
                
                // Set timeout for the stream
                const timeoutId = setTimeout(() => {
                    uploadStream.destroy();
                    reject(new Error('Cloudinary upload timeout after 120 seconds'));
                }, 120000);
                
                uploadStream.on('end', () => {
                    clearTimeout(timeoutId);
                });
                
                uploadStream.on('error', (err) => {
                    clearTimeout(timeoutId);
                    reject(err);
                });
                
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
            if (!publicId) {
                throw new Error('No publicId provided for delete');
            }
            
            const result = await cloudinary.uploader.destroy(publicId);
            console.log(`✅ Deleted from Cloudinary: ${publicId}`);
            return { success: true };
        }
        
        throw new Error(`Unknown action: ${action}`);
        
    } catch (error) {
        console.error(`❌ Cloudinary job ${job.id} failed:`, error.message);
        // Throw to trigger retry
        throw error;
    }
};

module.exports = cloudinaryProcessor;