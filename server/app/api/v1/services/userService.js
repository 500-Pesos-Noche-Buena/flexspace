const { User, SpaceRequest } = require('@/api/v1/models');
const { comparePassword, hashPassword } = require('@/utils/hash');

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
        
        return await User.create({
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: 'user',
            isActive: true
        });
    }

    async createSpaceRequest(data) {
        if (!data.password) throw new Error("Password missing for hashing");
        
        const hashedPassword = await hashPassword(data.password);
        
        return await SpaceRequest.create({
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: 'space',
            businessPermit: data.businessPermit,
            dtiSecReg: data.dtiSecReg,
            status: 'pending'
        });
    }

    /**
     * Prevent duplicate registrations across both tables.
     */
    async isEmailTaken(email) {
        const [user, pending] = await Promise.all([
            User.findOne({ email }),
            SpaceRequest.findOne({ email })
        ]);
        return !!(user || pending);
    }

    // Add this to your UserService class
    async createStaff(data) {
        if (!data.password) throw new Error("Password missing for hashing");
        
        const hashedPassword = await hashPassword(data.password);
        
        return await User.create({
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: 'staff',      // Hardcoded for security
            parent_id: data.parent_id, 
            isActive: true
        });
    }
}

module.exports = new UserService();