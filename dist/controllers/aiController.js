"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const aiService_1 = require("../services/aiService");
const apiResponse_1 = require("../utils/apiResponse");
class AIController {
    static async analyzeFinances(req, res, next) {
        try {
            const monthYear = req.body.monthYear;
            const result = await aiService_1.AIService.analyzeFinances(req.user.userId, monthYear);
            (0, apiResponse_1.sendSuccess)(res, result, 'Financial analysis generated successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async getInsights(req, res, next) {
        try {
            const monthYear = req.query.month;
            let insight = await aiService_1.AIService.getLatestInsights(req.user.userId, monthYear);
            // If no insights exist yet for this month, automatically generate initial insights
            if (!insight) {
                const generated = await aiService_1.AIService.analyzeFinances(req.user.userId, monthYear);
                insight = generated.insight;
            }
            (0, apiResponse_1.sendSuccess)(res, insight, 'AI Insights retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AIController = AIController;
