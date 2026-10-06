"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisController = void 0;
const monthlyAnalysisService_1 = require("../services/monthlyAnalysisService");
const apiResponse_1 = require("../utils/apiResponse");
class AnalysisController {
    static async getMonthlyAnalysis(req, res, next) {
        try {
            const month = req.query.month;
            const data = await monthlyAnalysisService_1.MonthlyAnalysisService.getMonthlyAnalysis(req.user.userId, month, false);
            (0, apiResponse_1.sendSuccess)(res, data, 'Monthly financial analysis retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async refreshAiMonthlyAnalysis(req, res, next) {
        try {
            const month = req.body.month;
            const data = await monthlyAnalysisService_1.MonthlyAnalysisService.getMonthlyAnalysis(req.user.userId, month, true // trigger live Gemini AI invocation
            );
            (0, apiResponse_1.sendSuccess)(res, data, 'AI monthly financial analysis generated successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AnalysisController = AnalysisController;
