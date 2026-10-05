"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const FinancialProfile_1 = require("../models/FinancialProfile");
const Expense_1 = require("../models/Expense");
const AIInsight_1 = require("../models/AIInsight");
const budgetService_1 = require("./budgetService");
const goalService_1 = require("./goalService");
const financialEngine_1 = require("../calculations/financialEngine");
const geminiClient_1 = require("../ai/geminiClient");
class AIService {
    static async analyzeFinances(userId, targetMonthYear) {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const now = new Date();
        const monthYear = targetMonthYear ||
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        // 1. Fetch user financial profile
        const profile = await FinancialProfile_1.FinancialProfile.findOne({ userId: userObjectId });
        const monthlyIncome = profile?.monthlyIncome || 0;
        const monthlySavingsTarget = profile?.monthlySavingsTarget || 0;
        const currency = profile?.currency || '₹';
        const spendingBudget = (0, financialEngine_1.calculateAvailableSpendingBudget)(monthlyIncome, monthlySavingsTarget);
        // 2. Fetch expenses in this month
        const [yearStr, monthStr] = monthYear.split('-');
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;
        const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
        const [categoryAgg, budgetOverview, goals] = await Promise.all([
            Expense_1.Expense.aggregate([
                {
                    $match: {
                        userId: userObjectId,
                        date: { $gte: startOfMonth, $lte: endOfMonth }
                    }
                },
                {
                    $group: {
                        _id: '$category',
                        total: { $sum: '$amount' }
                    }
                },
                { $sort: { total: -1 } }
            ]),
            budgetService_1.BudgetService.getBudgetsForMonth(userId, monthYear),
            goalService_1.GoalService.getGoals(userId)
        ]);
        const totalExpenses = categoryAgg.reduce((sum, item) => sum + item.total, 0);
        const remainingBudget = (0, financialEngine_1.calculateRemainingBudget)(spendingBudget, totalExpenses);
        const actualSavings = (0, financialEngine_1.calculateActualSavings)(monthlyIncome, totalExpenses);
        const savingsRate = (0, financialEngine_1.calculateSavingsRate)(actualSavings, monthlyIncome);
        const targetSavingsRate = (0, financialEngine_1.calculateTargetSavingsRate)(monthlySavingsTarget, monthlyIncome);
        const categories = categoryAgg.map((item) => {
            const budgetItem = budgetOverview.categories.find((b) => b.category === item._id);
            return {
                name: item._id,
                amount: Math.round(item.total * 100) / 100,
                percentage: (0, financialEngine_1.calculateCategoryPercentage)(item.total, totalExpenses),
                budget: budgetItem?.budgetAmount,
                status: budgetItem?.status
            };
        });
        const snapshot = {
            currency,
            monthYear,
            monthlyIncome,
            monthlySavingsTarget,
            spendingBudget,
            totalExpenses,
            remainingBudget,
            actualSavings,
            savingsRate,
            targetSavingsRate,
            budgetStatus: budgetOverview.overallStatus,
            categories,
            budgetWarnings: budgetOverview.warnings,
            goals: goals.map((g) => ({
                title: g.title,
                targetAmount: g.targetAmount,
                currentAmount: g.currentAmount,
                progressPercentage: g.metrics.progressPercentage,
                estimatedMonths: g.metrics.estimatedMonths,
                isCompleted: g.metrics.isCompleted
            }))
        };
        // 3. Generate structured coaching insights
        const aiResponse = await geminiClient_1.GeminiFinancialCoach.generateCoaching(snapshot);
        // 4. Save to database
        const insight = await AIInsight_1.AIInsight.create({
            userId: userObjectId,
            monthYear,
            summary: aiResponse.summary,
            insights: aiResponse.insights,
            warnings: aiResponse.warnings,
            recommendations: aiResponse.recommendations,
            goalAdvice: aiResponse.goalAdvice,
            disclaimer: aiResponse.disclaimer,
            rawMetricsSnapshot: snapshot
        });
        return { insight, snapshot };
    }
    static async getLatestInsights(userId, monthYear) {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const now = new Date();
        const queryMonth = monthYear ||
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return await AIInsight_1.AIInsight.findOne({
            userId: userObjectId,
            monthYear: queryMonth
        }).sort({ generatedAt: -1 });
    }
}
exports.AIService = AIService;
