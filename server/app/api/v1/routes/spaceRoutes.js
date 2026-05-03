const express = require('express');
const auth = require('@/api/v1/middleware/authMiddleware');
const { upload, processUploadedFiles } = require('@/api/v1/utils/upload');

// Controllers
const DashboardController = require('@/api/v1/controllers/space/dashboardController');
const DistrictController = require('@/api/v1/controllers/space/districtController');
const SpaceController = require('@/api/v1/controllers/space/spaceController');
const BookingController = require('@/api/v1/controllers/space/bookingController');
const WalkinController = require('@/api/v1/controllers/space/walkinController');
const EarningsController = require('@/api/v1/controllers/space/earningController');
const StaffController = require('@/api/v1/controllers/space/staffController');
const VoucherController = require('@/api/v1/controllers/space/voucherController'); 

class SpaceRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        console.log('--- 🛡️ Initializing Space Routes ---');

        const uploadArray = upload.array('images', 10);
        const uploadSingle = upload.single('image');

        this.router.get('/dashboard', auth, (req, res, next) => DashboardController.index(req, res, next));

        this.router.get('/districts/active', auth, (req, res, next) => DistrictController.getActive(req, res, next));

        this.router.get('/spaces', auth, (req, res, next) => SpaceController.index(req, res, next));
        
        // ✅ FIX: Added processUploadedFiles to upload to Cloudinary
        this.router.post('/spaces', 
            auth, 
            uploadArray, 
            processUploadedFiles,  // This uploads to Cloudinary
            (req, res, next) => SpaceController.store(req, res, next)
        );
        
        // ✅ FIX: Added processUploadedFiles for update
        this.router.post('/spaces/:id/update', 
            auth, 
            uploadArray, 
            processUploadedFiles,  // This uploads to Cloudinary
            (req, res, next) => SpaceController.update(req, res, next)
        );
        
        this.router.post('/spaces/:id/delete', auth, (req, res, next) => SpaceController.delete(req, res, next));
        
        // ✅ FIX: Added processUploadedFiles for adding images
        this.router.post('/spaces/:id/add-images', 
            auth, 
            uploadArray, 
            processUploadedFiles,  // This uploads to Cloudinary
            (req, res, next) => SpaceController.addImages(req, res, next)
        );
        
        this.router.post('/spaces/:id/remove-image', auth, (req, res, next) => SpaceController.removeImage(req, res, next));
        this.router.post('/spaces/:id/set-primary', auth, (req, res, next) => SpaceController.setPrimaryImage(req, res, next));

        this.router.get('/bookings', auth, (req, res, next) => BookingController.index(req, res, next));
        this.router.get('/bookings/:id/present', auth, (req, res, next) => BookingController.presentQr(req, res, next));
        
        // Checkout flow
        this.router.post('/bookings/:id/calculate', auth, (req, res, next) => BookingController.calculateBill(req, res, next));
        this.router.post('/bookings/:id/checkout', auth, (req, res, next) => BookingController.checkout(req, res, next));
        this.router.post('/bookings/:id/apply-voucher', auth, (req, res, next) => BookingController.applyVoucher(req, res, next));
        
        // Generic status actions (MUST be last)
        this.router.post('/bookings/:id/:action', auth, (req, res, next) => BookingController.updateStatus(req, res, next));

        this.router.get('/walkins', auth, (req, res, next) => WalkinController.index(req, res, next));
        this.router.post('/walkins/store', auth, (req, res, next) => WalkinController.store(req, res, next));
        this.router.get('/walkins/guests', auth, (req, res, next) => WalkinController.guests(req, res, next));
        this.router.post('/walkins/:id/calculate', auth, (req, res, next) => WalkinController.calculateBill(req, res, next));
        this.router.post('/walkins/:id/checkout', auth, (req, res, next) => WalkinController.checkout(req, res, next));
        
        this.router.get('/earnings', auth, (req, res, next) => EarningsController.index(req, res, next));

        // Staff Management
        this.router.get('/staff', auth, (req, res, next) => StaffController.index(req, res, next));
        this.router.post('/staff', auth, (req, res, next) => StaffController.store(req, res, next));
        this.router.put('/staff/:id', auth, (req, res, next) => StaffController.update(req, res, next));
        this.router.post('/staff/:id/toggle', auth, (req, res, next) => StaffController.toggleStatus(req, res, next));
        this.router.delete('/staff/:id', auth, (req, res, next) => StaffController.destroy(req, res, next));

        // Voucher Management
        this.router.get('/vouchers', auth, (req, res, next) => VoucherController.index(req, res, next));
        this.router.post('/vouchers', auth, (req, res, next) => VoucherController.create(req, res, next));
        this.router.post('/vouchers/:id/delete', auth, (req, res, next) => VoucherController.delete(req, res, next));
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new SpaceRoutes().getRouter();