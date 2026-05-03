const { User, SpaceRequest } = require('@/api/v1/models');
const { comparePassword, hashPassword } = require('@/api/v1/utils/hash');

class UserService {
    async verifyUserCredentials(email, password) {
        const user = await User.findOne({ email });
        if (user) {
            const isMatch = await comparePassword(password, user.password);
            return isMatch ? { user, type: 'authorized' } : null;
        }

        const pending = await SpaceRequest.findOne({ email }); 
        if (pending) {
            const isMatch = await comparePassword(password, pending.password);
            return isMatch ? { user: pending, type: 'pending' } : null;
        }

        return null;
    }

    async createUser(data) {
        if (!data.password) throw new Error("Password missing for hashing");
        
        const hashedPassword = await hashPassword(data.password);
        
        const user = await User.create({
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: 'user',
            isActive: true,
            business_payment_qr: data.business_payment_qr || null,  // ✅ Added
            payment_methods: data.payment_methods || ['cash']       // ✅ Added with default
        });
        
        console.log(`✅ User created in DB: ${user.email}, ID: ${user._id}`);
        
        // Return the full user object
        return user;
    }

    async createSpaceRequest(data) {
        if (!data.password) throw new Error("Password missing for hashing");
        
        const hashedPassword = await hashPassword(data.password);
        
        const spaceRequest = await SpaceRequest.create({
            name: data.name,
            email: data.email,
            password: hashedPassword,
            business_permit: data.business_permit,
            dti_sec_reg: data.dti_sec_reg,
            status: 'pending',
            business_payment_qr: data.business_payment_qr || null,  // ✅ Added for pending requests
            payment_methods: data.payment_methods || ['cash']       // ✅ Added for pending requests
        });

        return spaceRequest;
    }

    async isEmailTaken(email) {
        const [user, pending] = await Promise.all([
            User.findOne({ email }),
            SpaceRequest.findOne({ email })
        ]);
        return !!(user || pending);
    }

    async createStaff(data) {
        if (!data.password) throw new Error("Password missing for hashing");
        
        const hashedPassword = await hashPassword(data.password);
        
        return await User.create({
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: 'staff',
            parent_id: data.parent_id, 
            isActive: true,
            business_payment_qr: data.business_payment_qr || null,  // ✅ Added for staff
            payment_methods: data.payment_methods || ['cash']       // ✅ Added for staff
        });
    }

    // ✅ NEW: Method to update payment details for existing user
    async updatePaymentDetails(userId, paymentData) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (paymentData.business_payment_qr !== undefined) {
            user.business_payment_qr = paymentData.business_payment_qr;
        }
        
        if (paymentData.payment_methods !== undefined) {
            user.payment_methods = paymentData.payment_methods;
        }

        await user.save();
        return user;
    }

    // ✅ NEW: Method to get payment details for a user
    async getPaymentDetails(userId) {
        const user = await User.findById(userId).select('business_payment_qr payment_methods name email');
        if (!user) {
            throw new Error('User not found');
        }
        return {
            business_payment_qr: user.business_payment_qr,
            payment_methods: user.payment_methods,
            business_name: user.name,
            email: user.email
        };
    }
}

module.exports = new UserService();