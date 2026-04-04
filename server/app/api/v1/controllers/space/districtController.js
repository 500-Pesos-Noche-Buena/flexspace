const { District } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/utils/constants');

class DistrictController {
    
    getActive = async (req, res) => {
        try {
            const districts = await District.find({ active: true }).sort({ name: 1 });
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: districts
            });
        } catch (error) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: error.message 
            });
        }
    };
}

module.exports = new DistrictController();