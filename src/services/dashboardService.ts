import mongoose from 'mongoose';
import { FinancialProfile } from '../models/FinancialProfile';
import { Expense, IExpense } from '../models/Expense';
import { AIInsight } from '../models/AIInsight';
import { BudgetService } from './budgetService';
import { GoalService } from './goalService';
import {
  calculateAvailableSpendingBudget,
  calculateRemainingBudget,
  calculateActualSavings,
  calculateSavingsRate,
  calculateTargetSavingsRate,
  calculateCategoryPercentage
} from '../calculations/financialEngine';

export interface DashboardData {
  currency: string;
  monthYear: string;
  monthlyIncome: number;
  savingsTarget: number;
  availableSpendingBudget: number;
  totalExpenses: number;
  remainingBudget: number;
  savingsRate: number;
  targetSavingsRate: number;
  topCategory: {
    category: string;
    amount: number;
    percentage: number;
  } | null;
  recentTransactions: IExpense[];
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  alerts: string[];
  aiSummary: {
    summary: string;
    generatedAt: Date;
  } | null;
  budgetHealth: {
    totalBudgeted: number;
    totalSpent: number;
    overallStatus: 'SAFE' | 'NEAR_LIMIT' | 'OVER_BUDGET';
  };
  goalCount: {
    total: number;
    completed: number;
  };
}

export class DashboardService {
  static async getDashboard(
    userId: string,
    targetMonthYear?: string
  ): Promise<DashboardData> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    const currentMonth =
      targetMonthYear && /^\d{4}-(0[1-9]|1[0-2])$/.test(targetMonthYear.trim())
        ? targetMonthYear.trim()
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Get financial profile
    const profile = await FinancialProfile.findOne({ userId: userObjectId });
    const monthlyIncome = profile?.monthlyIncome || 0;
    const savingsTarget = profile?.monthlySavingsTarget || 0;
    const currency = profile?.currency || '₹';

    const availableSpendingBudget = calculateAvailableSpendingBudget(
      monthlyIncome,
      savingsTarget
    );

    // 2. Date bounds for target month
    const [yearStr, monthStr] = currentMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

    // 3. Query expenses, category totals, and recent txns for the active month in parallel
    const [expenseCategoryAgg, recentTransactions, budgetOverview, goals, latestAi] =
      await Promise.all([
        Expense.aggregate([
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
        Expense.find({
          userId: userObjectId,
          date: { $gte: startOfMonth, $lte: endOfMonth }
        })
          .sort({ date: -1, createdAt: -1 })
          .limit(10),
        BudgetService.getBudgetsForMonth(userId, currentMonth),
        GoalService.getGoals(userId),
        AIInsight.findOne({ userId: userObjectId, monthYear: currentMonth }).sort({
          generatedAt: -1
        })
      ]);

    const totalExpenses = expenseCategoryAgg.reduce(
      (sum, item) => sum + item.total,
      0
    );

    const remainingBudget = calculateRemainingBudget(
      availableSpendingBudget,
      totalExpenses
    );

    const actualSavings = calculateActualSavings(monthlyIncome, totalExpenses);
    const savingsRate = calculateSavingsRate(actualSavings, monthlyIncome);
    const targetSavingsRate = calculateTargetSavingsRate(
      savingsTarget,
      monthlyIncome
    );

    const categoryBreakdown = expenseCategoryAgg.map((item) => ({
      category: item._id,
      amount: Math.round(item.total * 100) / 100,
      percentage: calculateCategoryPercentage(item.total, totalExpenses)
    }));

    const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

    // 4. Generate Smart Alerts
    const alerts: string[] = [];

    if (remainingBudget < 0) {
      alerts.push(
        `Monthly spending budget exceeded by ${currency}${Math.abs(
          remainingBudget
        ).toLocaleString()}!`
      );
    } else if (
      availableSpendingBudget > 0 &&
      remainingBudget <= availableSpendingBudget * 0.15
    ) {
      alerts.push(
        `Caution: Only ${currency}${remainingBudget.toLocaleString()} left in your spending budget.`
      );
    }

    if (budgetOverview.warnings.length > 0) {
      alerts.push(...budgetOverview.warnings.slice(0, 2));
    }

    if (savingsTarget > 0) {
      if (actualSavings >= savingsTarget) {
        alerts.push(`Great job! You have achieved your monthly savings target.`);
      } else if (remainingBudget < 0) {
        alerts.push(`Savings target at risk due to current overspending.`);
      }
    }

    // Check goals for near completion
    goals.forEach((g) => {
      if (g.metrics.isCompleted) {
        alerts.push(`Goal '${g.title}' is 100% completed! 🎉`);
      } else if (g.metrics.progressPercentage >= 80) {
        alerts.push(
          `Goal '${g.title}' is at ${g.metrics.progressPercentage}% progress—almost there!`
        );
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
