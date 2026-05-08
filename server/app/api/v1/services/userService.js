const { User, SpaceRequest } = require('@/api/v1/models');
const { comparePassword, hashPassword } = require('@/api/v1/utils/hash');

class UserService {
    async verifyUserCredentials(email, password) {
        const user = await User.findOne({ email });

        if (user) {
            // Check if user is a Google OAuth user (no password)
            if (user.authProvider === 'google' && !user.password) {
                return null; // Google users can't login with password
            }

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
            role: data.role || 'user',
            isActive: data.isActive !== undefined ? data.isActive : true,
            status: data.status || 'approved',
            authProvider: data.authProvider || 'local',
            business_payment_qr: data.business_payment_qr || null,
            payment_methods: data.payment_methods || ['cash']
        });

        console.log(`✅ User created in DB: ${user.email}, ID: ${user._id}`);

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
            business_payment_qr: data.business_payment_qr || null, 
            payment_methods: data.payment_methods || ['cash']
        });

        return spaceRequest;
    }

    async isEmailTaken(email) {
        // Use lean() + select() for minimum data transfer
        const [user, pending] = await Promise.all([
            User.findOne({ email }).select('_id').lean(),
            SpaceRequest.findOne({ email }).select('_id').lean()
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

    async findOrCreateGoogleUser(profile) {
        // Try to find by googleId first
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            return user;
        }

        // Try to find by email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.authProvider = 'google';
            user.avatar = profile.photos?.[0]?.value || user.avatar;
            user.isVerified = true;
            await user.save();
            return user;
        }

        // Create new user
        user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value || null,
            role: 'user',
            authProvider: 'google',
            isVerified: true,
            isActive: true,
            password: null  // No password for Google users
        });

        return user;
    }

    // Check if user has password (for Google users)
    async hasPassword(userId) {
        const user = await User.findById(userId);
        return user && user.password !== null && user.password !== undefined;
    }
}

module.exports = new UserService();