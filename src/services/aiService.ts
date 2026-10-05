import mongoose from 'mongoose';
import { FinancialProfile } from '../models/FinancialProfile';
import { Expense } from '../models/Expense';
import { AIInsight, IAIInsight } from '../models/AIInsight';
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
import { GeminiFinancialCoach } from '../ai/geminiClient';
import { FinancialContextSnapshot, AiCoachResponse } from '../ai/aiTypes';

export class AIService {
  static async analyzeFinances(
    userId: string,
    targetMonthYear?: string
  ): Promise<{ insight: IAIInsight; snapshot: FinancialContextSnapshot }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    const monthYear =
      targetMonthYear ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Fetch user financial profile
    const profile = await FinancialProfile.findOne({ userId: userObjectId });
    const monthlyIncome = profile?.monthlyIncome || 0;
    const monthlySavingsTarget = profile?.monthlySavingsTarget || 0;
    const currency = profile?.currency || '₹';

    const spendingBudget = calculateAvailableSpendingBudget(
      monthlyIncome,
      monthlySavingsTarget
    );

    // 2. Fetch expenses in this month
    const [yearStr, monthStr] = monthYear.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

    const [categoryAgg, budgetOverview, goals] = await Promise.all([
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
      BudgetService.getBudgetsForMonth(userId, monthYear),
      GoalService.getGoals(userId)
    ]);

    const totalExpenses = categoryAgg.reduce((sum, item) => sum + item.total, 0);
    const remainingBudget = calculateRemainingBudget(spendingBudget, totalExpenses);
    const actualSavings = calculateActualSavings(monthlyIncome, totalExpenses);
    const savingsRate = calculateSavingsRate(actualSavings, monthlyIncome);
    const targetSavingsRate = calculateTargetSavingsRate(
      monthlySavingsTarget,
      monthlyIncome
    );

    const categories = categoryAgg.map((item) => {
      const budgetItem = budgetOverview.categories.find(
        (b) => b.category === item._id
      );
      return {
        name: item._id,
        amount: Math.round(item.total * 100) / 100,
        percentage: calculateCategoryPercentage(item.total, totalExpenses),
        budget: budgetItem?.budgetAmount,
        status: budgetItem?.status
      };
    });

    const snapshot: FinancialContextSnapshot = {
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
    const aiResponse: AiCoachResponse = await GeminiFinancialCoach.generateCoaching(
      snapshot
    );

    // 4. Save to database
    const insight = await AIInsight.create({
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

  static async getLatestInsights(
    userId: string,
    monthYear?: string
  ): Promise<IAIInsight | null> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    const queryMonth =
      monthYear ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return await AIInsight.findOne({
      userId: userObjectId,
      monthYear: queryMonth
    }).sort({ generatedAt: -1 });
  }
}
