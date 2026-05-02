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
            isActive: true
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
            status: 'pending'
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
            isActive: true
        });
    }
}

module.exports = new UserService();