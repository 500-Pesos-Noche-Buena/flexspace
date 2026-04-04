const { Space, District } = require('@/api/v1/models');

class LandingController {
    async getExplorerData(req, res) {
        try {
            const [spaces, districts] = await Promise.all([
                Space.find({ status: 'Open Now' })
                    .populate('district_id', 'name')
                    .lean(),
                District.find({ active: true })
                    .sort({ name: 1 })
                    .lean()
            ]);

            return res.status(200).json({
                success: true,
                count: spaces.length,
                data: {
                    spaces,
                    districts
                }
            });
        } catch (error) {
            console.error(`[LandingController Error]: ${error.message}`);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    }

    async getSpaceDetails(req, res) {
        try {
            const space = await Space.findById(req.params.id).populate('district_id');
            if (!space) {
                return res.status(404).json({ success: false, message: "Space not found" });
            }
            return res.status(200).json({ success: true, data: space });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new LandingController();