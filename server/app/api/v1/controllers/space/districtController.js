const { District } = require('@/api/v1/models');

class DistrictController {
    async getActive(req, res) {
        try {
            const districts = await District.find({ active: true }).sort({ name: 1 });
            return res.status(200).json({
                success: true,
                data: districts
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new DistrictController();