"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const FinancialProfile_1 = require("../models/FinancialProfile");
const Expense_1 = require("../models/Expense");
const AIInsight_1 = require("../models/AIInsight");
const budgetService_1 = require("./budgetService");
const goalService_1 = require("./goalService");
const financialEngine_1 = require("../calculations/financialEngine");
class DashboardService {
    static async getDashboard(userId, targetMonthYear) {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const now = new Date();
        const currentMonth = targetMonthYear ||
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        // 1. Get financial profile
        const profile = await FinancialProfile_1.FinancialProfile.findOne({ userId: userObjectId });
        const monthlyIncome = profile?.monthlyIncome || 0;
        const savingsTarget = profile?.monthlySavingsTarget || 0;
        const currency = profile?.currency || '₹';
        const availableSpendingBudget = (0, financialEngine_1.calculateAvailableSpendingBudget)(monthlyIncome, savingsTarget);
        // 2. Date bounds for target month
        const [yearStr, monthStr] = currentMonth.split('-');
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;
        const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
        // 3. Query expenses, category totals, and recent 5 txns in parallel
        const [expenseCategoryAgg, recentTransactions, budgetOverview, goals, latestAi] = await Promise.all([
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
            Expense_1.Expense.find({ userId: userObjectId })
                .sort({ date: -1, createdAt: -1 })
                .limit(5),
            budgetService_1.BudgetService.getBudgetsForMonth(userId, currentMonth),
            goalService_1.GoalService.getGoals(userId),
            AIInsight_1.AIInsight.findOne({ userId: userObjectId, monthYear: currentMonth }).sort({
                generatedAt: -1
            })
        ]);
        const totalExpenses = expenseCategoryAgg.reduce((sum, item) => sum + item.total, 0);
        const remainingBudget = (0, financialEngine_1.calculateRemainingBudget)(availableSpendingBudget, totalExpenses);
        const actualSavings = (0, financialEngine_1.calculateActualSavings)(monthlyIncome, totalExpenses);
        const savingsRate = (0, financialEngine_1.calculateSavingsRate)(actualSavings, monthlyIncome);
        const targetSavingsRate = (0, financialEngine_1.calculateTargetSavingsRate)(savingsTarget, monthlyIncome);
        const categoryBreakdown = expenseCategoryAgg.map((item) => ({
            category: item._id,
            amount: Math.round(item.total * 100) / 100,
            percentage: (0, financialEngine_1.calculateCategoryPercentage)(item.total, totalExpenses)
        }));
        const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;
        // 4. Generate Smart Alerts
        const alerts = [];
        if (remainingBudget < 0) {
            alerts.push(`Monthly spending budget exceeded by ${currency}${Math.abs(remainingBudget).toLocaleString()}!`);
        }
        else if (availableSpendingBudget > 0 &&
            remainingBudget <= availableSpendingBudget * 0.15) {
            alerts.push(`Caution: Only ${currency}${remainingBudget.toLocaleString()} left in your spending budget.`);
        }
        if (budgetOverview.warnings.length > 0) {
            alerts.push(...budgetOverview.warnings.slice(0, 2));
        }
        if (savingsTarget > 0) {
            if (actualSavings >= savingsTarget) {
                alerts.push(`Great job! You have achieved your monthly savings target.`);
            }
            else if (remainingBudget < 0) {
                alerts.push(`Savings target at risk due to current overspending.`);
            }
        }
        // Check goals for near completion
        goals.forEach((g) => {
            if (g.metrics.isCompleted) {
                alerts.push(`Goal '${g.title}' is 100% completed! 🎉`);
            }
            else if (g.metrics.progressPercentage >= 80) {
                alerts.push(`Goal '${g.title}' is at ${g.metrics.progressPercentage}% progress—almost there!`);
            }
        });
        return {
            currency,
            monthYear: currentMonth,
            monthlyIncome,
            savingsTarget,
            availableSpendingBudget,
            totalExpenses,
            remainingBudget,
            savingsRate,
            targetSavingsRate,
            topCategory,
            recentTransactions,
            categoryBreakdown,
            alerts,
            aiSummary: latestAi
                ? { summary: latestAi.summary, generatedAt: latestAi.generatedAt }
                : null,
            budgetHealth: {
                totalBudgeted: budgetOverview.totalBudgeted,
                totalSpent: budgetOverview.totalSpent,
                overallStatus: budgetOverview.overallStatus
            },
            goalCount: {
                total: goals.length,
                completed: goals.filter((g) => g.metrics.isCompleted).length
            }
        };
    }
}
exports.DashboardService = DashboardService;
