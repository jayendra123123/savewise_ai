"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetController = void 0;
const budgetService_1 = require("../services/budgetService");
const budgetValidators_1 = require("../validators/budgetValidators");
const apiResponse_1 = require("../utils/apiResponse");
class BudgetController {
    static async setBudget(req, res, next) {
        try {
            const validated = budgetValidators_1.setBudgetSchema.parse(req.body);
            const budget = await budgetService_1.BudgetService.setBudget(req.user.userId, validated);
            (0, apiResponse_1.sendSuccess)(res, budget, 'Budget set successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async getBudgets(req, res, next) {
        try {
            const validated = budgetValidators_1.getBudgetsQuerySchema.parse(req.query);
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const monthYear = validated.month || currentMonth;
            const overview = await budgetService_1.BudgetService.getBudgetsForMonth(req.user.userId, monthYear);
            (0, apiResponse_1.sendSuccess)(res, overview, 'Budgets retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async deleteBudget(req, res, next) {
        try {
            const { id } = req.params;
            await budgetService_1.BudgetService.deleteBudget(req.user.userId, id);
            (0, apiResponse_1.sendSuccess)(res, null, 'Budget deleted successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.BudgetController = BudgetController;
