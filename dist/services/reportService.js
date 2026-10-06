"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const FinancialProfile_1 = require("../models/FinancialProfile");
const Expense_1 = require("../models/Expense");
const budgetService_1 = require("./budgetService");
const goalService_1 = require("./goalService");
const financialEngine_1 = require("../calculations/financialEngine");
class ReportService {
    static async getReport(userId, period = 'current_month', targetMonthYear) {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const profile = await FinancialProfile_1.FinancialProfile.findOne({ userId: userObjectId });
        const monthlyIncome = profile?.monthlyIncome || 0;
        const now = new Date();
        let baseYear = now.getFullYear();
        let baseMonth = now.getMonth(); // 0-indexed
        if (targetMonthYear && /^\d{4}-(0[1-9]|1[0-2])$/.test(targetMonthYear.trim())) {
            const [y, m] = targetMonthYear.trim().split('-').map(Number);
            baseYear = y;
            baseMonth = m - 1;
        }
        let startDate;
        let endDate;
        let monthsToInclude = 1;
        if (period === 'current_month') {
            startDate = new Date(Date.UTC(baseYear, baseMonth, 1, 0, 0, 0));
            endDate = new Date(Date.UTC(baseYear, baseMonth + 1, 0, 23, 59, 59, 999));
            monthsToInclude = 1;
        }
        else if (period === 'prev_month') {
            startDate = new Date(Date.UTC(baseYear, baseMonth - 1, 1, 0, 0, 0));
            endDate = new Date(Date.UTC(baseYear, baseMonth, 0, 23, 59, 59, 999));
            monthsToInclude = 1;
        }
        else if (period === 'last_6_months') {
            startDate = new Date(Date.UTC(baseYear, baseMonth - 5, 1, 0, 0, 0));
            endDate = new Date(Date.UTC(baseYear, baseMonth + 1, 0, 23, 59, 59, 999));
            monthsToInclude = 6;
        }
        else {
            // year
            startDate = new Date(Date.UTC(baseYear, 0, 1, 0, 0, 0));
            endDate = new Date(Date.UTC(baseYear, 11, 31, 23, 59, 59, 999));
            monthsToInclude = baseMonth + 1;
        }
        // 1. Expenses in range
        const [categoryAgg, trendAgg, goals] = await Promise.all([
            Expense_1.Expense.aggregate([
                {
                    $match: {
                        userId: userObjectId,
                        date: { $gte: startDate, $lte: endDate }
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
            Expense_1.Expense.aggregate([
                {
                    $match: {
                        userId: userObjectId,
                        date: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
                        total: { $sum: '$amount' }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            goalService_1.GoalService.getGoals(userId)
        ]);
        const totalExpenses = categoryAgg.reduce((sum, item) => sum + item.total, 0);
        const totalIncome = monthlyIncome * monthsToInclude;
        const totalSavings = (0, financialEngine_1.calculateActualSavings)(totalIncome, totalExpenses);
        const averageSavingsRate = (0, financialEngine_1.calculateSavingsRate)(totalSavings, totalIncome);
        const categoryBreakdown = categoryAgg.map((item) => ({
            category: item._id,
            amount: Math.round(item.total * 100) / 100,
            percentage: (0, financialEngine_1.calculateCategoryPercentage)(item.total, totalExpenses)
        }));
        const monthlyTrends = trendAgg.map((t) => {
            const expenses = Math.round(t.total * 100) / 100;
            const savings = (0, financialEngine_1.calculateActualSavings)(monthlyIncome, expenses);
            return {
                monthYear: t._id,
                totalExpenses: expenses,
                income: monthlyIncome,
                savings
            };
        });
        const selectedMonthKey = `${baseYear}-${String(baseMonth + 1).padStart(2, '0')}`;
        const budgetOverview = await budgetService_1.BudgetService.getBudgetsForMonth(userId, selectedMonthKey);
        const completedGoals = goals.filter((g) => g.metrics.isCompleted).length;
        const averageProgress = goals.length > 0
            ? Math.round((goals.reduce((acc, g) => acc + g.metrics.progressPercentage, 0) /
                goals.length) *
                10) / 10
            : 0;
        return {
            period,
            dateRange: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            },
            totalIncome,
            totalExpenses,
            totalSavings,
            averageSavingsRate,
            categoryBreakdown,
            monthlyTrends,
            budgetPerformance: {
                totalBudgeted: budgetOverview.totalBudgeted,
                totalSpent: budgetOverview.totalSpent,
                overallStatus: budgetOverview.overallStatus
            },
            goalsProgress: {
                totalGoals: goals.length,
                completedGoals,
                averageProgress
            }
        };
    }
}
exports.ReportService = ReportService;
