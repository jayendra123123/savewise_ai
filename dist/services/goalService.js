"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const FinancialGoal_1 = require("../models/FinancialGoal");
const financialEngine_1 = require("../calculations/financialEngine");
class GoalService {
    static async createGoal(userId, data) {
        const goal = await FinancialGoal_1.FinancialGoal.create({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            title: data.title,
            category: data.category,
            targetAmount: data.targetAmount,
            currentAmount: data.currentAmount || 0,
            monthlyContribution: data.monthlyContribution || 0,
            targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
            status: (data.currentAmount || 0) >= data.targetAmount ? 'COMPLETED' : 'IN_PROGRESS'
        });
        return this.formatGoalWithMetrics(goal);
    }
    static async getGoals(userId) {
        const goals = await FinancialGoal_1.FinancialGoal.find({
            userId: new mongoose_1.default.Types.ObjectId(userId)
        }).sort({ createdAt: -1 });
        return goals.map((g) => this.formatGoalWithMetrics(g));
    }
    static async updateGoal(userId, goalId, data) {
        const goal = await FinancialGoal_1.FinancialGoal.findOne({
            _id: goalId,
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!goal) {
            throw new Error('Goal not found or unauthorized.');
        }
        if (data.title !== undefined)
            goal.title = data.title;
        if (data.category !== undefined)
            goal.category = data.category;
        if (data.targetAmount !== undefined)
            goal.targetAmount = data.targetAmount;
        if (data.monthlyContribution !== undefined)
            goal.monthlyContribution = data.monthlyContribution;
        if (data.targetDate !== undefined)
            goal.targetDate = data.targetDate ? new Date(data.targetDate) : undefined;
        if (data.addContribution !== undefined) {
            goal.currentAmount += data.addContribution;
        }
        else if (data.currentAmount !== undefined) {
            goal.currentAmount = data.currentAmount;
        }
        if (data.status !== undefined) {
            goal.status = data.status;
        }
        else if (goal.currentAmount >= goal.targetAmount) {
            goal.status = 'COMPLETED';
        }
        await goal.save();
        return this.formatGoalWithMetrics(goal);
    }
    static async deleteGoal(userId, goalId) {
        const result = await FinancialGoal_1.FinancialGoal.findOneAndDelete({
            _id: goalId,
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!result) {
            throw new Error('Goal not found or unauthorized to delete.');
        }
    }
    static formatGoalWithMetrics(goal) {
        const metrics = (0, financialEngine_1.calculateGoalMetrics)(goal.targetAmount, goal.currentAmount, goal.monthlyContribution);
        return {
            id: goal._id.toString(),
            title: goal.title,
            category: goal.category,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount,
            monthlyContribution: goal.monthlyContribution,
            status: goal.status,
            targetDate: goal.targetDate,
            metrics,
            createdAt: goal.createdAt,
            updatedAt: goal.updatedAt
        };
    }
}
exports.GoalService = GoalService;
