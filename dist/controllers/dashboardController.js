"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboardService_1 = require("../services/dashboardService");
const apiResponse_1 = require("../utils/apiResponse");
class DashboardController {
    static async getDashboard(req, res, next) {
        try {
            const month = req.query.month;
            const data = await dashboardService_1.DashboardService.getDashboard(req.user.userId, month);
            (0, apiResponse_1.sendSuccess)(res, data, 'Dashboard data retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.DashboardController = DashboardController;
