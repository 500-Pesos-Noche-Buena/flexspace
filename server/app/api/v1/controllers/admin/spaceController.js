const { User } = require('@/api/v1/models');

class SpaceController {
    
    async index(req, res) {
        try {
            const { page = 1, search = '' } = req.query;
            const limit = 10;
            const skip = (page - 1) * limit;

            const query = {
                role: 'space',
                status: 'approved',
                ...(search && {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                })
            };

            const owners = await User.find(query)
                .select('name email isActive business_permit dti_sec_reg createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await User.countDocuments(query);

            return res.status(200).json({ success: true, owners, total });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error fetching owners.' });
        }
    }

    async requests(req, res) {
        try {
            const { page = 1, search = '', status = 'pending' } = req.query;
            const limit = 10;
            const skip = (page - 1) * limit;

            const query = {
                role: 'space',
                status: status,
                ...(search && {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                })
            };

            const requests = await User.find(query)
                .select('name email business_permit dti_sec_reg status createdAt')
                .sort({ createdAt: status === 'pending' ? 1 : -1 })
                .skip(skip)
                .limit(limit);

            const total = await User.countDocuments(query);
            return res.status(200).json({ success: true, requests, total });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error fetching requests.' });
        }
    }

    // ✅ POST /admin/space/requests/:id/approve
    async approve(req, res) {
        try {
            const user = await User.findById(req.params.id);
            if (!user) return res.status(404).json({ success: false, message: 'Not found' });

            user.status = 'approved';
            user.isActive = true; // Grant access immediately
            await user.save();

            return res.status(200).json({ success: true, message: 'Application approved.' });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Approval failed.' });
        }
    }

    // ✅ POST /admin/space/requests/:id/reject
    async reject(req, res) {
        try {
            const user = await User.findById(req.params.id);
            if (!user) return res.status(404).json({ success: false, message: 'Not found' });

            user.status = 'rejected';
            user.isActive = false;
            await user.save();

            return res.status(200).json({ success: true, message: 'Application rejected.' });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Rejection failed.' });
        }
    }

    // ✅ POST /admin/space/management/:id/toggle (Active/Deactivate)
    async toggleStatus(req, res) {
        try {
            const user = await User.findById(req.params.id);
            user.isActive = !user.isActive;
            await user.save();
            return res.status(200).json({ success: true, message: 'Status updated.' });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Toggle failed.' });
        }
    }
}

module.exports = new SpaceController();