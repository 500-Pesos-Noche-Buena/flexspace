const { HTTP_STATUS } = require('@/api/v1/utils/constants');

// Helper to generate slug from name
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

class LocationController {
    constructor(model, modelName) {
        this.model = model;
        this.modelName = modelName;
    }

    // Get all locations
    index = async (req, res, next) => {
        try {
            const { search = '', limit = 1000, parentId } = req.query;
            
            let query = {};
            if (search) {
                query.name = { $regex: search, $options: 'i' };
            }
            if (parentId) {
                query.parent_id = parentId;
            }
            
            const locations = await this.model.find(query)
                .sort({ name: 1 })
                .limit(parseInt(limit));
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: locations
            });
        } catch (error) {
            next(error);
        }
    };
    
    // Create location
    store = async (req, res, next) => {
        try {
            const { name, code, parent_id, slug } = req.body;
            
            // Validate name
            if (!name || !name.trim()) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: `${this.modelName} name is required`
                });
            }
            
            // Check if location already exists
            const existing = await this.model.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
            });
            if (existing) {
                return res.status(HTTP_STATUS.CONFLICT).json({
                    success: false,
                    message: `${this.modelName} with this name already exists`
                });
            }
            
            // Generate slug if not provided
            const finalSlug = slug || generateSlug(name);
            
            // Check if slug already exists
            const existingSlug = await this.model.findOne({ slug: finalSlug });
            if (existingSlug) {
                return res.status(HTTP_STATUS.CONFLICT).json({
                    success: false,
                    message: `Slug "${finalSlug}" already exists`
                });
            }
            
            const location = await this.model.create({ 
                name: name.trim(), 
                code: code || null, 
                parent_id: parent_id || null,
                slug: finalSlug
            });
            
            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: `${this.modelName} created successfully`,
                data: location
            });
        } catch (error) {
            next(error);
        }
    };
    
    // Update location
    update = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { name, code, parent_id, slug, active } = req.body;
            
            const location = await this.model.findById(id);
            if (!location) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: `${this.modelName} not found`
                });
            }
            
            // Build update object
            const updateData = {};
            
            if (name && name !== location.name) {
                // Check for duplicate name
                const existing = await this.model.findOne({ 
                    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                    _id: { $ne: id }
                });
                if (existing) {
                    return res.status(HTTP_STATUS.CONFLICT).json({
                        success: false,
                        message: `${this.modelName} with this name already exists`
                    });
                }
                updateData.name = name.trim();
                
                // Auto-update slug if name changed and no new slug provided
                if (!slug) {
                    updateData.slug = generateSlug(name);
                }
            }
            
            if (slug && slug !== location.slug) {
                // Check if slug already exists
                const existingSlug = await this.model.findOne({ 
                    slug: slug,
                    _id: { $ne: id }
                });
                if (existingSlug) {
                    return res.status(HTTP_STATUS.CONFLICT).json({
                        success: false,
                        message: `Slug "${slug}" already exists`
                    });
                }
                updateData.slug = slug;
            }
            
            if (code !== undefined) updateData.code = code || null;
            if (parent_id !== undefined) updateData.parent_id = parent_id || null;
            if (active !== undefined) updateData.active = active;
            
            const updated = await this.model.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `${this.modelName} updated successfully`,
                data: updated
            });
        } catch (error) {
            next(error);
        }
    };
    
    // Delete location
    destroy = async (req, res, next) => {
        try {
            const { id } = req.params;
            
            const location = await this.model.findById(id);
            if (!location) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: `${this.modelName} not found`
                });
            }
            
            // Check if location has associated records (for districts with spaces)
            if (this.modelName === 'District') {
                const Space = require('@/api/v1/models/Space');
                const spaces = await Space.find({ district_id: id });
                if (spaces.length > 0) {
                    return res.status(HTTP_STATUS.BAD_REQUEST).json({
                        success: false,
                        message: `Cannot delete district with ${spaces.length} associated space(s)`
                    });
                }
            }
            
            await this.model.findByIdAndDelete(id);
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `${this.modelName} deleted successfully`
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = LocationController;