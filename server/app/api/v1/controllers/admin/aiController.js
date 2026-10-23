const aiService = require('@/api/v1/services/aiService');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class AiController {
    getSettings = async (req, res, next) => {
        try {
            const settings = await aiService.getSettings();
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: settings,
                availableModels: [
                    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Recommended)', tier: 'High Speed & Free Tier' },
                    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', tier: 'Ultra Fast & Low Latency' },
                    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tier: 'High Stability' },
                    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: 'Advanced Reasoning' },
                    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'High Context' },
                    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'Flagship Performance' }
                ]
            });
        } catch (error) {
            console.error('[AiController] getSettings error:', error);
            next(error);
        }
    };

    updateSettings = async (req, res, next) => {
        try {
            const updates = req.body;
            const updated = await aiService.updateSettings(updates);
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'AI routing and model configurations saved successfully',
                data: updated
            });
        } catch (error) {
            console.error('[AiController] updateSettings error:', error);
            next(error);
        }
    };

    getAnalytics = async (req, res, next) => {
        try {
            const { timeframe = 'week' } = req.query;
            const analytics = await aiService.getAnalytics(timeframe);
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: analytics
            });
        } catch (error) {
            console.error('[AiController] getAnalytics error:', error);
            next(error);
        }
    };

    getLogs = async (req, res, next) => {
        try {
            const { page = 1, limit = 20, service, status } = req.query;
            const result = await aiService.getLogs({ page, limit, service, status });
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: result.logs,
                pagination: result.pagination
            });
        } catch (error) {
            console.error('[AiController] getLogs error:', error);
            next(error);
        }
    };
}

module.exports = new AiController();
