const { User, SpaceRequest } = require('@/api/v1/models');
const { comparePassword, hashPassword } = require('@/utils/hash');

class UserService {
    /**
     * Verifies credentials across both primary Users and Pending Space Requests.
     */
    async verifyUserCredentials(email, password) {
        console.log(`[User-Service] Verifying credentials for: ${email}`);

        // 1. Check main Users collection
        const user = await User.findOne({ email });
        if (user) {
            const isMatch = await comparePassword(password, user.password);
            return isMatch ? { user, type: 'authorized' } : null;
        }

        // 2. Check Pending SpaceRequest collection
        const pending = await SpaceRequest.findOne({ email });
        if (pending) {
            const isMatch = await comparePassword(password, pending.password);
            return isMatch ? { user: pending, type: 'pending' } : null;
        }

        return null;
    }

    /**
     * Creates a standard user in the main collection
     */
    async createUser(data) {
        const hashedPassword = await hashPassword(data.password);
        return await User.create({
            ...data,
            password: hashedPassword,
            isActive: true
        });
    }

    /**
     * Creates a pending application in the SpaceRequest collection
     */
    async createSpaceRequest(data) {
        const hashedPassword = await hashPassword(data.password);
        return await SpaceRequest.create({
            ...data,
            password: hashedPassword,
            status: 'pending'
        });
    }

    /**
     * Check if email exists in ANY collection to prevent duplicates.
     * Uses Promise.all for better performance on Linux systems.
     */
    async isEmailTaken(email) {
        const [user, pending] = await Promise.all([
            User.findOne({ email }),
            SpaceRequest.findOne({ email })
        ]);
        return !!(user || pending);
    }
}

// Export a singleton instance of the class
module.exports = new UserService();