const { User } = require('@/api/v1/models');

class UserController {
    
    async index(req, res) {
        try {
            const { page = 1, search = '' } = req.query;
            const limit = 10;
            const skip = (page - 1) * limit;

            // ✅ Updated: role is now 'user' instead of 'space'
            const query = {
                role: 'user', 
                ...(search && {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                })
            };

            // ✅ Fetch filtered data
            const users = await User.find(query)
                .select('name email isActive createdAt') // Adjusted fields for standard users
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            // ✅ Total count for pagination
            const total = await User.countDocuments(query);

            return res.status(200).json({
                success: true,
                owners: users, // Keeping the key as 'owners' to avoid breaking your React frontend
                total
            });

        } catch (error) {
            console.error('[Admin-Controller] Fetch Users Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve user list.'
            });
        }
    }

    async toggleStatus(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findById(id);

            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'User account not found.' 
                });
            }

            user.isActive = !user.isActive; 
            await user.save();

            return res.status(200).json({
                success: true,
                message: `Account ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
                isActive: user.isActive 
            });
        } catch (error) {
            console.error('[Admin-Controller] Toggle Status Error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error during status update.' 
            });
        }
    }

    async destroy(req, res) {
        try {
            const { id } = req.params;
            
            const user = await User.findByIdAndDelete(id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found or already deleted.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Owner account permanently removed from the system.'
            });
        } catch (error) {
            console.error('[Admin-Controller] Delete Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete the account.'
            });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, email } = req.body;

            const user = await User.findById(id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found.'
                });
            }

            // Update fields
            user.name = name || user.name;
            user.email = email || user.email;

            await user.save();

            return res.status(200).json({
                success: true,
                message: 'User updated successfully.',
                data: user
            });

        } catch (error) {
            console.error('[Admin-Controller] Update Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update user.'
            });
        }
    }
}

module.exports = new UserController();