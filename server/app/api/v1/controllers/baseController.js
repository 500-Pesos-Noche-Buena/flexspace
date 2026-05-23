// server/app/api/v1/controllers/BaseController.js

class BaseController {
    constructor(model) {
        this.model = model;
    }

    // ==================== USER ID HELPERS ====================
    
    /**
     * Get user ID from request (works with all auth setups)
     */
    getUserId(req) {
        return req.user?.sub || req.user?._id || req.user?.id;
    }

    /**
     * Get the actual "Boss" ID (handles staff → owner mapping)
     */
    async getOwnerId(req) {
        const userId = this.getUserId(req);
        
        // If staff, find their parent (the owner)
        if (req.user?.role === 'staff') {
            const User = require('../models/User'); // Adjust path as needed
            const staffRecord = await User.findById(userId).select('parent_id');
            if (staffRecord?.parent_id) {
                return staffRecord.parent_id.toString();
            }
        }
        
        return userId?.toString();
    }

    /**
     * Check if current user is staff
     */
    isStaff(req) {
        return req.user?.role === 'staff';
    }

    /**
     * Check if current user is admin
     */
    isAdmin(req) {
        return req.user?.role === 'admin';
    }

    /**
     * Check if current user is owner
     */
    isOwner(req) {
        return req.user?.role === 'owner';
    }

    /**
     * Get user role
     */
    getUserRole(req) {
        return req.user?.role;
    }

    // ==================== CRUD OPERATIONS ====================

    /**
     * Get all records
     */
    async getAll(req, res, next) {
        try {
            const items = await this.model.find();
            return this.sendSuccess(res, items);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get record by ID
     */
    async getById(req, res, next) {
        try {
            const item = await this.model.findById(req.params.id);
            if (!item) {
                return this.sendNotFound(res, `${this.model.modelName} not found`);
            }
            return this.sendSuccess(res, item);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create new record
     */
    async create(req, res, next) {
        try {
            const item = await this.model.create(req.body);
            return this.sendCreated(res, item);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update record
     */
    async update(req, res, next) {
        try {
            const item = await this.model.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );
            if (!item) {
                return this.sendNotFound(res, `${this.model.modelName} not found`);
            }
            return this.sendSuccess(res, item);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete record
     */
    async delete(req, res, next) {
        try {
            const item = await this.model.findByIdAndDelete(req.params.id);
            if (!item) {
                return this.sendNotFound(res, `${this.model.modelName} not found`);
            }
            return this.sendSuccess(res, null, `${this.model.modelName} deleted successfully`);
        } catch (error) {
            next(error);
        }
    }

    // ==================== RESPONSE HELPERS ====================

    /**
     * Send success response
     */
    sendSuccess(res, data, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data
        });
    }

    /**
     * Send created response (201)
     */
    sendCreated(res, data, message = 'Created successfully') {
        return this.sendSuccess(res, data, message, 201);
    }

    /**
     * Send error response
     */
    sendError(res, error, message = 'Error', statusCode = 500) {
        return res.status(statusCode).json({
            success: false,
            message,
            error: error.message
        });
    }

    /**
     * Send not found response
     */
    sendNotFound(res, message = 'Resource not found') {
        return this.sendError(res, new Error(message), message, 404);
    }

    /**
     * Send unauthorized response
     */
    sendUnauthorized(res, message = 'Unauthorized') {
        return this.sendError(res, new Error(message), message, 401);
    }

    /**
     * Send forbidden response
     */
    sendForbidden(res, message = 'Forbidden') {
        return this.sendError(res, new Error(message), message, 403);
    }

    /**
     * Send validation error response
     */
    sendValidationError(res, errors, message = 'Validation error') {
        return res.status(422).json({
            success: false,
            message,
            errors
        });
    }

    // ==================== PAGINATION ====================

    /**
     * Paginate results
     */
    async paginate(req, res, next, query = {}, populate = null) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const sort = req.query.sort || '-createdAt';

            let queryBuilder = this.model.find(query).sort(sort).skip(skip).limit(limit);
            
            if (populate) {
                queryBuilder = queryBuilder.populate(populate);
            }

            const [data, total] = await Promise.all([
                queryBuilder,
                this.model.countDocuments(query)
            ]);

            return res.status(200).json({
                success: true,
                data,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // ==================== OWNER/SCOPE HELPERS ====================

    /**
     * Add owner filter to query (for multi-tenant apps)
     */
    addOwnerFilter(req, query = {}) {
        const userId = this.getUserId(req);
        if (req.user?.role === 'staff') {
            // Staff can only see their owner's data
            return { ...query, owner_id: this.getOwnerId(req) };
        } else if (req.user?.role === 'owner') {
            // Owner can see their own data
            return { ...query, owner_id: userId };
        }
        return query;
    }

    /**
     * Get records owned by current user
     */
    async getOwned(req, res, next, additionalQuery = {}) {
        try {
            const ownerId = await this.getOwnerId(req);
            const query = { ...additionalQuery, owner_id: ownerId };
            const items = await this.model.find(query);
            return this.sendSuccess(res, items);
        } catch (error) {
            next(error);
        }
    }

    // ==================== BULK OPERATIONS ====================

    /**
     * Bulk create records
     */
    async bulkCreate(req, res, next) {
        try {
            const items = req.body.items || req.body;
            if (!Array.isArray(items)) {
                return this.sendValidationError(res, { message: 'Expected array of items' });
            }
            
            const created = await this.model.insertMany(items);
            return this.sendCreated(res, created, `${created.length} items created`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Bulk delete records
     */
    async bulkDelete(req, res, next) {
        try {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids)) {
                return this.sendValidationError(res, { message: 'Expected array of IDs' });
            }
            
            const result = await this.model.deleteMany({ _id: { $in: ids } });
            return this.sendSuccess(res, result, `${result.deletedCount} items deleted`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Bulk update records
     */
    async bulkUpdate(req, res, next) {
        try {
            const { updates } = req.body;
            if (!Array.isArray(updates)) {
                return this.sendValidationError(res, { message: 'Expected array of updates' });
            }
            
            const operations = updates.map(update => ({
                updateOne: {
                    filter: { _id: update.id },
                    update: { $set: update.data }
                }
            }));
            
            const result = await this.model.bulkWrite(operations);
            return this.sendSuccess(res, result, 'Bulk update completed');
        } catch (error) {
            next(error);
        }
    }

    // ==================== SEARCH & FILTER ====================

    /**
     * Search records with text search
     */
    async search(req, res, next, searchFields = ['name']) {
        try {
            const { q } = req.query;
            if (!q) {
                return this.paginate(req, res, next);
            }
            
            const searchQuery = {
                $or: searchFields.map(field => ({
                    [field]: { $regex: q, $options: 'i' }
                }))
            };
            
            return this.paginate(req, res, next, searchQuery);
        } catch (error) {
            next(error);
        }
    }

    // ==================== SOFT DELETE ====================

    /**
     * Soft delete (if model has deletedAt field)
     */
    async softDelete(req, res, next) {
        try {
            const item = await this.model.findByIdAndUpdate(
                req.params.id,
                { deletedAt: new Date(), isDeleted: true },
                { new: true }
            );
            if (!item) {
                return this.sendNotFound(res);
            }
            return this.sendSuccess(res, item, 'Item soft deleted');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Restore soft deleted
     */
    async restore(req, res, next) {
        try {
            const item = await this.model.findByIdAndUpdate(
                req.params.id,
                { deletedAt: null, isDeleted: false },
                { new: true }
            );
            if (!item) {
                return this.sendNotFound(res);
            }
            return this.sendSuccess(res, item, 'Item restored');
        } catch (error) {
            next(error);
        }
    }

    // ==================== STATISTICS ====================

    /**
     * Get count of records
     */
    async getCount(req, res, next, query = {}) {
        try {
            const count = await this.model.countDocuments(query);
            return this.sendSuccess(res, { count });
        } catch (error) {
            next(error);
        }
    }
}

// Make global (optional)
global.BaseController = BaseController;

module.exports = BaseController;