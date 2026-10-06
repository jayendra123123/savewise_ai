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
const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];
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
        // 2. Date ranges for current month and previous month
        const [yearStr, monthStr] = monthYear.split('-');
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;
        const monthLabel = `${MONTH_NAMES[monthIndex]} ${year}`;
        const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
        const prevYear = monthIndex === 0 ? year - 1 : year;
        const prevMonthNum = monthIndex === 0 ? 12 : monthIndex;
        const previousMonth = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;
        const previousMonthLabel = `${MONTH_NAMES[prevMonthNum - 1]} ${prevYear}`;
        const startOfPrevMonth = new Date(Date.UTC(prevYear, prevMonthNum - 1, 1, 0, 0, 0));
        const endOfPrevMonth = new Date(Date.UTC(prevYear, prevMonthNum, 0, 23, 59, 59, 999));
        // 3. Parallel fetch of current & previous month data, budgets, and goals
        const [categoryAgg, currentExpensesList, prevCategoryAgg, budgetOverview, goals] = await Promise.all([
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
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { total: -1 } }
            ]),
            Expense_1.Expense.find({
                userId: userObjectId,
                date: { $gte: startOfMonth, $lte: endOfMonth }
            })
                .sort({ amount: -1 })
                .limit(10)
                .lean(),
            Expense_1.Expense.aggregate([
                {
                    $match: {
                        userId: userObjectId,
                        date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
                    }
                },
                {
                    $group: {
                        _id: '$category',
                        total: { $sum: '$amount' }
                    }
                }
            ]),
            budgetService_1.BudgetService.getBudgetsForMonth(userId, monthYear),
            goalService_1.GoalService.getGoals(userId)
        ]);
        // 4. Current month metrics
        const totalExpenses = categoryAgg.reduce((sum, item) => sum + item.total, 0);
        const hasTransactions = totalExpenses > 0 || currentExpensesList.length > 0;
        const transactionCount = currentExpensesList.length;
        const remainingBudget = (0, financialEngine_1.calculateRemainingBudget)(spendingBudget, totalExpenses);
        const actualSavings = (0, financialEngine_1.calculateActualSavings)(monthlyIncome, totalExpenses);
        const savingsRate = (0, financialEngine_1.calculateSavingsRate)(actualSavings, monthlyIncome);
        const targetSavingsRate = (0, financialEngine_1.calculateTargetSavingsRate)(monthlySavingsTarget, monthlyIncome);
        const isOnTrackForTarget = actualSavings >= monthlySavingsTarget && monthlySavingsTarget > 0;
        const savingsDifference = actualSavings - monthlySavingsTarget;
        // 5. Previous month metrics & comparison
        const previousExpenses = prevCategoryAgg.reduce((sum, item) => sum + item.total, 0);
        const previousSavings = (0, financialEngine_1.calculateActualSavings)(monthlyIncome, previousExpenses);
        const hasPreviousMonthData = previousExpenses > 0;
        const expensesDiff = totalExpenses - previousExpenses;
        const expensesPctChange = previousExpenses > 0
            ? Math.round(((totalExpenses - previousExpenses) / previousExpenses) * 100 * 10) /
                10
            : 0;
        const trend = expensesDiff > 0
            ? 'INCREASED'
            : expensesDiff < 0
                ? 'DECREASED'
                : 'UNCHANGED';
        // 6. Category Breakdown & MoM comparison map
        const prevCatMap = new Map();
        prevCategoryAgg.forEach((item) => prevCatMap.set(item._id, item.total));
        const categories = categoryAgg.map((item) => {
            const budgetItem = budgetOverview.categories.find((b) => b.category === item._id);
            const prevAmt = prevCatMap.get(item._id) || 0;
            const changeAmount = Math.round((item.total - prevAmt) * 100) / 100;
            const changePercentage = prevAmt > 0
                ? Math.round(((item.total - prevAmt) / prevAmt) * 100 * 10) / 10
                : 0;
            const catTrend = changeAmount > 0
                ? 'INCREASED'
                : changeAmount < 0
                    ? 'DECREASED'
                    : 'UNCHANGED';
            return {
                name: item._id,
                amount: Math.round(item.total * 100) / 100,
                percentage: (0, financialEngine_1.calculateCategoryPercentage)(item.total, totalExpenses),
                previousAmount: prevAmt,
                changeAmount,
                changePercentage,
                trend: catTrend,
                budget: budgetItem?.budgetAmount,
                status: budgetItem?.status
            };
        });
        const topCategory = categories.length > 0
            ? {
                name: categories[0].name,
                amount: categories[0].amount,
                percentage: categories[0].percentage
            }
            : null;
        const topExpenses = currentExpensesList.slice(0, 5).map((e) => ({
            description: e.description,
            amount: e.amount,
            category: e.category,
            date: new Date(e.date).toISOString().split('T')[0]
        }));
        // 7. Calculate concrete Save More Money opportunities (grounded in real data)
        const savingsOpportunities = [];
        // Check categories with MoM increase
        categories.forEach((c) => {
            if (c.changeAmount > 0 && c.previousAmount > 0) {
                // e.g. "Food spending increased by ₹800" -> suggest cutting by ₹500 or the increase
                const cut = Math.max(100, Math.round(c.changeAmount * 0.6 / 50) * 50);
                savingsOpportunities.push({
                    category: c.name,
                    reason: `increased by ${currency}${c.changeAmount.toLocaleString()} compared with last month`,
                    currentAmount: c.amount,
                    suggestedReduction: cut,
                    potentialSavingsIncrease: cut,
                    currentActualSavings: actualSavings,
                    newProjectedSavings: actualSavings + cut
                });
            }
            else if (c.status === 'OVER_BUDGET' && c.budget) {
                const overage = Math.round(c.amount - c.budget);
                savingsOpportunities.push({
                    category: c.name,
                    reason: `exceeded its budget limit by ${currency}${overage.toLocaleString()}`,
                    currentAmount: c.amount,
                    suggestedReduction: overage,
                    potentialSavingsIncrease: overage,
                    currentActualSavings: actualSavings,
                    newProjectedSavings: actualSavings + overage
                });
            }
        });
        // Check high discretionary category if not already in opportunities
        const discretionary = ['Shopping', 'Entertainment', 'Food', 'Other'];
        categories.forEach((c) => {
            if (discretionary.includes(c.name) &&
                c.percentage >= 20 &&
                !savingsOpportunities.some((o) => o.category === c.name)) {
                const cut = Math.max(100, Math.round(c.amount * 0.15 / 50) * 50);
                savingsOpportunities.push({
                    category: c.name,
                    reason: `represents ${c.percentage}% of your monthly expenses`,
                    currentAmount: c.amount,
                    suggestedReduction: cut,
                    potentialSavingsIncrease: cut,
                    currentActualSavings: actualSavings,
                    newProjectedSavings: actualSavings + cut
                });
            }
        });
        // 8. Assemble Full Financial Context Snapshot
        const snapshot = {
            currency,
            monthYear,
            monthLabel,
            hasTransactions,
            financialSummary: {
                income: monthlyIncome,
                savingsTarget: monthlySavingsTarget,
                spendingBudget,
                totalExpenses,
                actualSavings,
                savingsRate,
                targetSavingsRate,
                remainingBudget,
                transactionCount,
                isOnTrackForTarget,
                savingsDifference
            },
            previousMonthComparison: {
                hasData: hasPreviousMonthData,
                previousMonth,
                previousMonthLabel,
                previousExpenses,
                previousSavings,
                expensesDiff,
                expensesPctChange,
                trend
            },
            spendingAnalysis: {
                topCategory,
                categories,
                topExpenses
            },
            savingsOpportunities,
            budgetWarnings: budgetOverview.warnings,
            goals: goals.map((g) => ({
                title: g.title,
                targetAmount: g.targetAmount,
                currentAmount: g.currentAmount,
                remainingAmount: Math.max(0, g.targetAmount - g.currentAmount),
                progressPercentage: g.metrics.progressPercentage,
                estimatedMonths: g.metrics.estimatedMonths,
                isCompleted: g.metrics.isCompleted
            })),
            // Backward compatibility fields
            monthlyIncome,
            monthlySavingsTarget,
            spendingBudget,
            totalExpenses,
            remainingBudget,
            actualSavings,
            savingsRate,
            targetSavingsRate,
            budgetStatus: budgetOverview.overallStatus,
            categories
        };
        // 9. Generate structured coaching insights
        const aiResponse = await geminiClient_1.GeminiFinancialCoach.generateCoaching(snapshot);
        // 10. Save to database
        const insight = await AIInsight_1.AIInsight.create({
            userId: userObjectId,
            monthYear,
            summary: aiResponse.summary,
            financialSummary: aiResponse.financialSummary,
            spendingAnalysis: aiResponse.spendingAnalysis,
            warnings: aiResponse.warnings,
            saveMoreOpportunities: aiResponse.saveMoreOpportunities,
            goalProgress: aiResponse.goalProgress,
            actionPlan: aiResponse.actionPlan,
            insights: aiResponse.insights,
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
