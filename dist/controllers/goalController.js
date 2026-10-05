"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalController = void 0;
const goalService_1 = require("../services/goalService");
const goalValidators_1 = require("../validators/goalValidators");
const apiResponse_1 = require("../utils/apiResponse");
class GoalController {
    static async createGoal(req, res, next) {
        try {
            const validated = goalValidators_1.createGoalSchema.parse(req.body);
            const goal = await goalService_1.GoalService.createGoal(req.user.userId, validated);
            (0, apiResponse_1.sendSuccess)(res, goal, 'Financial goal created successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    static async getGoals(req, res, next) {
        try {
            const goals = await goalService_1.GoalService.getGoals(req.user.userId);
            (0, apiResponse_1.sendSuccess)(res, goals, 'Financial goals retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async updateGoal(req, res, next) {
        try {
            const { id } = req.params;
            const validated = goalValidators_1.updateGoalSchema.parse(req.body);
            const updated = await goalService_1.GoalService.updateGoal(req.user.userId, id, validated);
            (0, apiResponse_1.sendSuccess)(res, updated, 'Financial goal updated successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async deleteGoal(req, res, next) {
        try {
            const { id } = req.params;
            await goalService_1.GoalService.deleteGoal(req.user.userId, id);
            (0, apiResponse_1.sendSuccess)(res, null, 'Financial goal deleted successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.GoalController = GoalController;
