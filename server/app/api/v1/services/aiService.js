const { GoogleGenAI } = require("@google/genai");
const config = require('@/config/config');
const { AiSettings, AiUsageLog } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

const DEFAULT_PRIORITY_LIST = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-2.5-flash'
];

const AVAILABLE_MODELS = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Recommended)', tier: 'High Speed & Generous Quota', recommended: true },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', tier: 'Ultra Fast & Low Latency' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tier: 'Stable & High Capacity' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: 'Advanced Reasoning' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'Complex Context' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'Flagship Intelligence' }
];

class AiService {
    constructor() {
        this.genAI = null;
        this.settingsCache = null;
        this.cacheExpiry = 0;
        this.CACHE_TTL_MS = 60 * 1000; // 1 minute cache
    }

    getGenAIClient() {
        if (!this.genAI) {
            const apiKey = config.ai.geminiKey || process.env.GEMINI_API_KEY;
            this.genAI = new GoogleGenAI({ apiKey });
        }
        return this.genAI;
    }

    // Load or initialize AI settings
    async getSettings() {
        const now = Date.now();
        if (this.settingsCache && this.cacheExpiry > now) {
            return this.settingsCache;
        }

        let settings = await AiSettings.findOne().lean();
        if (!settings) {
            const created = await AiSettings.create({
                chatbotConfig: {
                    mode: 'auto',
                    selectedModel: 'gemini-2.0-flash',
                    fallbackEnabled: true,
                    temperature: 0.3
                },
                blogConfig: {
                    mode: 'auto',
                    selectedModel: 'gemini-2.0-flash',
                    fallbackEnabled: true,
                    temperature: 0.7
                },
                defaultPriorityList: DEFAULT_PRIORITY_LIST
            });
            settings = created.toObject();
        }

        this.settingsCache = settings;
        this.cacheExpiry = now + this.CACHE_TTL_MS;
        return settings;
    }

    // Update settings in database
    async updateSettings(updates) {
        let settings = await AiSettings.findOne();
        if (!settings) {
            settings = new AiSettings();
        }

        if (updates.chatbotConfig) {
            settings.chatbotConfig = {
                ...settings.chatbotConfig.toObject?.() || settings.chatbotConfig,
                ...updates.chatbotConfig
            };
        }

        if (updates.blogConfig) {
            settings.blogConfig = {
                ...settings.blogConfig.toObject?.() || settings.blogConfig,
                ...updates.blogConfig
            };
        }

        if (Array.isArray(updates.defaultPriorityList) && updates.defaultPriorityList.length > 0) {
            settings.defaultPriorityList = updates.defaultPriorityList;
        }

        await settings.save();
        this.settingsCache = settings.toObject();
        this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;

        return this.settingsCache;
    }

    // Build model fallback execution chain
    resolveModelChain(service, settings) {
        const config = service === 'blog' ? settings.blogConfig : settings.chatbotConfig;
        const priorityList = (settings.defaultPriorityList && settings.defaultPriorityList.length > 0)
            ? settings.defaultPriorityList
            : DEFAULT_PRIORITY_LIST;

        if (config.mode === 'manual' && config.selectedModel) {
            if (config.fallbackEnabled) {
                // Manual first, then fallback to other priority models
                const fallbackChain = [
                    config.selectedModel,
                    ...priorityList.filter(m => m !== config.selectedModel)
                ];
                return { chain: fallbackChain, temperature: config.temperature ?? 0.3 };
            }
            // Strict manual (no fallback)
            return { chain: [config.selectedModel], temperature: config.temperature ?? 0.3 };
        }

        // Automatic mode: start with primary low-latency / high-quota model, followed by fallback chain
        return { chain: [...priorityList], temperature: config.temperature ?? 0.3 };
    }

    // Helper to detect 429 / Rate Limit / Quota Exhaustion
    isRateLimitError(error) {
        if (!error) return false;
        const status = error.status || error.code || error.statusCode;
        if (status === 429) return true;

        const message = (error.message || '').toUpperCase();
        return (
            message.includes('429') ||
            message.includes('RESOURCE_EXHAUSTED') ||
            message.includes('QUOTA_EXCEEDED') ||
            message.includes('RATE_LIMIT') ||
            message.includes('RATE LIMIT') ||
            message.includes('TOO MANY REQUESTS')
        );
    }

    // Unified executor for all Gemini calls
    async generateContent({
        service = 'chatbot',
        contents,
        systemInstruction,
        maxOutputTokens = 1000,
        temperature: overrideTemp = null
    }) {
        const settings = await this.getSettings();
        const { chain, temperature: defaultTemp } = this.resolveModelChain(service, settings);
        const temperature = overrideTemp !== null ? overrideTemp : defaultTemp;

        const client = this.getGenAIClient();
        let lastError = null;
        let fallbackFrom = null;

        for (let i = 0; i < chain.length; i++) {
            const modelName = chain[i];
            const isFallback = i > 0;
            const startTime = Date.now();

            try {
                if (isFallback) {
                    console.warn(`[AiService] 🔄 Fallback attempt ${i + 1}/${chain.length} using model: ${modelName} for ${service}`);
                } else {
                    console.log(`[AiService] 🚀 Executing ${service} request using model: ${modelName}`);
                }

                const response = await client.models.generateContent({
                    model: modelName,
                    contents: contents,
                    config: {
                        ...(systemInstruction ? { systemInstruction } : {}),
                        maxOutputTokens,
                        temperature
                    }
                });

                const durationMs = Date.now() - startTime;
                const text = response.text?.trim() || '';

                // Extract token telemetry
                const inputTokens = response.usageMetadata?.promptTokenCount || 0;
                const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
                const totalTokens = response.usageMetadata?.totalTokenCount || (inputTokens + outputTokens);

                const status = isFallback ? 'fallback' : 'success';

                // Log asynchronously to prevent latency
                AiUsageLog.create({
                    service,
                    modelUsed: modelName,
                    inputTokens,
                    outputTokens,
                    totalTokens,
                    status,
                    fallbackFrom: isFallback ? fallbackFrom : null,
                    durationMs
                }).catch(err => console.error('[AiService] Failed to record usage log:', err.message));

                return {
                    text,
                    modelUsed: modelName,
                    tokens: { inputTokens, outputTokens, totalTokens },
                    status,
                    isFallback,
                    fallbackFrom
                };

            } catch (error) {
                const durationMs = Date.now() - startTime;
                lastError = error;

                const is429 = this.isRateLimitError(error);
                console.warn(`[AiService] ⚠️ ${modelName} failed (${is429 ? '429 Rate Limit' : error.message}) for ${service}`);

                // Record rate_limited or failed event in log
                AiUsageLog.create({
                    service,
                    modelUsed: modelName,
                    inputTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0,
                    status: is429 ? 'rate_limited' : 'failed',
                    errorMessage: error.message,
                    durationMs
                }).catch(err => console.error('[AiService] Failed to record error log:', err.message));

                fallbackFrom = modelName;

                // Continue to the next model in the fallback chain
                continue;
            }
        }

        // All models exhausted
        console.error(`[AiService] ❌ All models exhausted for ${service}:`, lastError?.message);
        throw new ApiError(
            HTTP_STATUS.SERVICE_UNAVAILABLE || 503,
            lastError?.message || 'AI service is currently experiencing high load across all model tiers. Please try again shortly.'
        );
    }

    // Aggregated telemetry and analytics
    async getAnalytics(timeframe = 'week') {
        const now = new Date();
        let startDate = new Date(0); // 'all' default

        if (timeframe === 'day') {
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else if (timeframe === 'week') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeframe === 'month') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const match = { timestamp: { $gte: startDate } };

        // Overall totals & tokens
        const [overallTotals] = await AiUsageLog.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalRequests: { $sum: 1 },
                    inputTokens: { $sum: '$inputTokens' },
                    outputTokens: { $sum: '$outputTokens' },
                    totalTokens: { $sum: '$totalTokens' },
                    successCount: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['success', 'fallback']] }, 1, 0]
                        }
                    },
                    rateLimitCount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'rate_limited'] }, 1, 0]
                        }
                    },
                    fallbackCount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'fallback'] }, 1, 0]
                        }
                    },
                    failedCount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
                        }
                    }
                }
            }
        ]) || [];

        // Breakdown by service
        const byService = await AiUsageLog.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$service',
                    requests: { $sum: 1 },
                    inputTokens: { $sum: '$inputTokens' },
                    outputTokens: { $sum: '$outputTokens' },
                    totalTokens: { $sum: '$totalTokens' },
                    successCount: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['success', 'fallback']] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        // Breakdown by model
        const byModel = await AiUsageLog.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$modelUsed',
                    requests: { $sum: 1 },
                    inputTokens: { $sum: '$inputTokens' },
                    outputTokens: { $sum: '$outputTokens' },
                    totalTokens: { $sum: '$totalTokens' },
                    rateLimitHits: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'rate_limited'] }, 1, 0]
                        }
                    },
                    fallbackRecoveries: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'fallback'] }, 1, 0]
                        }
                    },
                    successCount: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['success', 'fallback']] }, 1, 0]
                        }
                    }
                }
            },
            { $sort: { requests: -1 } }
        ]);

        const serviceBreakdown = {
            chatbot: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            blog: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
        };

        byService.forEach(s => {
            if (serviceBreakdown[s._id]) {
                serviceBreakdown[s._id] = {
                    requests: s.requests,
                    inputTokens: s.inputTokens,
                    outputTokens: s.outputTokens,
                    totalTokens: s.totalTokens
                };
            }
        });

        const totalReqs = overallTotals?.totalRequests || 0;
        const successCount = overallTotals?.successCount || 0;

        return {
            timeframe,
            totalRequests: totalReqs,
            totalTokens: overallTotals?.totalTokens || 0,
            inputTokens: overallTotals?.inputTokens || 0,
            outputTokens: overallTotals?.outputTokens || 0,
            successRate: totalReqs > 0 ? Math.round((successCount / totalReqs) * 100) : 100,
            rateLimitHitsTotal: overallTotals?.rateLimitCount || 0,
            fallbackRecoveriesTotal: overallTotals?.fallbackCount || 0,
            failedRequestsTotal: overallTotals?.failedCount || 0,
            byService: serviceBreakdown,
            byModel: byModel.map(m => ({
                model: m._id,
                requests: m.requests,
                inputTokens: m.inputTokens,
                outputTokens: m.outputTokens,
                totalTokens: m.totalTokens,
                rateLimitHits: m.rateLimitHits,
                fallbackRecoveries: m.fallbackRecoveries,
                successRate: m.requests > 0 ? Math.round((m.successCount / m.requests) * 100) : 100
            })),
            availableModels: AVAILABLE_MODELS
        };
    }

    // Paginated usage logs
    async getLogs({ page = 1, limit = 20, service = null, status = null }) {
        const query = {};
        if (service && service !== 'all') query.service = service;
        if (status && status !== 'all') query.status = status;

        const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
        const [logs, total] = await Promise.all([
            AiUsageLog.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            AiUsageLog.countDocuments(query)
        ]);

        return {
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)) || 1
            }
        };
    }
}

module.exports = new AiService();
