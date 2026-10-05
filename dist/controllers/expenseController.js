"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseController = void 0;
const expenseService_1 = require("../services/expenseService");
const expenseValidators_1 = require("../validators/expenseValidators");
const apiResponse_1 = require("../utils/apiResponse");
class ExpenseController {
    static async createExpense(req, res, next) {
        try {
            const validated = expenseValidators_1.createExpenseSchema.parse(req.body);
            const expense = await expenseService_1.ExpenseService.createExpense(req.user.userId, validated);
            (0, apiResponse_1.sendSuccess)(res, expense, 'Expense added successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    static async updateExpense(req, res, next) {
        try {
            const { id } = req.params;
            const validated = expenseValidators_1.updateExpenseSchema.parse(req.body);
            const updated = await expenseService_1.ExpenseService.updateExpense(req.user.userId, id, validated);
            (0, apiResponse_1.sendSuccess)(res, updated, 'Expense updated successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async deleteExpense(req, res, next) {
        try {
            const { id } = req.params;
            await expenseService_1.ExpenseService.deleteExpense(req.user.userId, id);
            (0, apiResponse_1.sendSuccess)(res, null, 'Expense deleted successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async getExpenses(req, res, next) {
        try {
            const validatedQuery = expenseValidators_1.expenseQuerySchema.parse(req.query);
            const result = await expenseService_1.ExpenseService.getExpenses(req.user.userId, {
                category: validatedQuery.category,
                month: validatedQuery.month,
                startDate: validatedQuery.startDate,
                endDate: validatedQuery.endDate,
                search: validatedQuery.search,
                page: parseInt(validatedQuery.page, 10),
                limit: parseInt(validatedQuery.limit, 10)
            });
            (0, apiResponse_1.sendSuccess)(res, result, 'Expenses retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ExpenseController = ExpenseController;
