"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const reportService_1 = require("../services/reportService");
const apiResponse_1 = require("../utils/apiResponse");
class ReportController {
    static async getReport(req, res, next) {
        try {
            const period = req.query.period || 'current_month';
            const month = req.query.month;
            const report = await reportService_1.ReportService.getReport(req.user.userId, period, month);
            (0, apiResponse_1.sendSuccess)(res, report, 'Financial report retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ReportController = ReportController;
