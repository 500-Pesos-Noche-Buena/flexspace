const { HTTP_STATUS } = require('@/api/v1/utils/constants');

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
            const { name, code, parent_id } = req.body;
            
            const existing = await this.model.findOne({ name });
            if (existing) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: `${this.modelName} already exists`
                });
            }
            
            const location = await this.model.create({ name, code, parent_id });
            
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
            const { name, code, parent_id } = req.body;
            
            const location = await this.model.findByIdAndUpdate(
                id,
                { name, code, parent_id },
                { new: true, runValidators: true }
            );
            
            if (!location) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: `${this.modelName} not found`
                });
            }
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `${this.modelName} updated successfully`,
                data: location
            });
        } catch (error) {
            next(error);
        }
    };
    
    // Delete location
    destroy = async (req, res, next) => {
        try {
            const { id } = req.params;
            
            const location = await this.model.findByIdAndDelete(id);
            
            if (!location) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: `${this.modelName} not found`
                });
            }
            
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