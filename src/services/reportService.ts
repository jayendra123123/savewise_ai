import mongoose from 'mongoose';
import { FinancialProfile } from '../models/FinancialProfile';
import { Expense } from '../models/Expense';
import { BudgetService } from './budgetService';
import { GoalService } from './goalService';
import {
  calculateActualSavings,
  calculateSavingsRate,
  calculateCategoryPercentage
} from '../calculations/financialEngine';

export type ReportPeriod = 'current_month' | 'prev_month' | 'last_6_months' | 'year';

export interface MonthlyTrendItem {
  monthYear: string;
  totalExpenses: number;
  income: number;
  savings: number;
}

export interface ReportsSummary {
  period: ReportPeriod;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  averageSavingsRate: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrends: MonthlyTrendItem[];
  budgetPerformance: {
    totalBudgeted: number;
    totalSpent: number;
    overallStatus: string;
  };
  goalsProgress: {
    totalGoals: number;
    completedGoals: number;
    averageProgress: number;
  };
}

export class ReportService {
  static async getReport(
    userId: string,
    period: ReportPeriod = 'current_month',
    targetMonthYear?: string
  ): Promise<ReportsSummary> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const profile = await FinancialProfile.findOne({ userId: userObjectId });
    const monthlyIncome = profile?.monthlyIncome || 0;

    const now = new Date();
    let baseYear = now.getFullYear();
    let baseMonth = now.getMonth(); // 0-indexed

    if (targetMonthYear && /^\d{4}-(0[1-9]|1[0-2])$/.test(targetMonthYear.trim())) {
      const [y, m] = targetMonthYear.trim().split('-').map(Number);
      baseYear = y;
      baseMonth = m - 1;
    }

    let startDate: Date;
    let endDate: Date;
    let monthsToInclude = 1;

    if (period === 'current_month') {
      startDate = new Date(Date.UTC(baseYear, baseMonth, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(baseYear, baseMonth + 1, 0, 23, 59, 59, 999));
      monthsToInclude = 1;
    } else if (period === 'prev_month') {
      startDate = new Date(Date.UTC(baseYear, baseMonth - 1, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(baseYear, baseMonth, 0, 23, 59, 59, 999));
      monthsToInclude = 1;
    } else if (period === 'last_6_months') {
      startDate = new Date(Date.UTC(baseYear, baseMonth - 5, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(baseYear, baseMonth + 1, 0, 23, 59, 59, 999));
      monthsToInclude = 6;
    } else {
      // year
      startDate = new Date(Date.UTC(baseYear, 0, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(baseYear, 11, 31, 23, 59, 59, 999));
      monthsToInclude = baseMonth + 1;
    }

    // 1. Expenses in range
    const [categoryAgg, trendAgg, goals] = await Promise.all([
      Expense.aggregate([
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
      Expense.aggregate([
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
      GoalService.getGoals(userId)
    ]);

    const totalExpenses = categoryAgg.reduce((sum, item) => sum + item.total, 0);
    const totalIncome = monthlyIncome * monthsToInclude;
    const totalSavings = calculateActualSavings(totalIncome, totalExpenses);
    const averageSavingsRate = calculateSavingsRate(totalSavings, totalIncome);

    const categoryBreakdown = categoryAgg.map((item) => ({
      category: item._id,
      amount: Math.round(item.total * 100) / 100,
      percentage: calculateCategoryPercentage(item.total, totalExpenses)
    }));

    const monthlyTrends: MonthlyTrendItem[] = trendAgg.map((t) => {
      const expenses = Math.round(t.total * 100) / 100;
      const savings = calculateActualSavings(monthlyIncome, expenses);
      return {
        monthYear: t._id,
        totalExpenses: expenses,
        income: monthlyIncome,
        savings
      };
    });

    const selectedMonthKey = `${baseYear}-${String(baseMonth + 1).padStart(2, '0')}`;
    const budgetOverview = await BudgetService.getBudgetsForMonth(userId, selectedMonthKey);

    const completedGoals = goals.filter((g) => g.metrics.isCompleted).length;
    const averageProgress =
      goals.length > 0
        ? Math.round(
            (goals.reduce((acc, g) => acc + g.metrics.progressPercentage, 0) /
              goals.length) *
              10
          ) / 10
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
