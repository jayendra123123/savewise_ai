"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavingsController = void 0;
const savingsService_1 = require("../services/savingsService");
const apiResponse_1 = require("../utils/apiResponse");
class SavingsController {
    static async getSavingsSummary(req, res, next) {
        try {
            const month = req.query.month;
            const summary = await savingsService_1.SavingsService.getSavingsSummary(req.user.userId, month);
            (0, apiResponse_1.sendSuccess)(res, summary, 'Savings summary retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.SavingsController = SavingsController;
