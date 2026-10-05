import mongoose from 'mongoose';
import { Budget, IBudget } from '../models/Budget';
import { FinancialProfile } from '../models/FinancialProfile';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '../models/Expense';
import { ExpenseService } from './expenseService';
import {
  calculateBudgetStatus,
  BudgetStatusResult
} from '../calculations/financialEngine';

export interface CategoryBudgetStatus extends BudgetStatusResult {
  id?: string;
  category: ExpenseCategory;
  monthYear: string;
}

export interface BudgetOverview {
  monthYear: string;
  totalBudgeted: number;
  categoryBudgetSum: number;
  totalSpent: number;
  overallRemaining: number;
  overallStatus: 'SAFE' | 'NEAR_LIMIT' | 'OVER_BUDGET';
  categories: CategoryBudgetStatus[];
  warnings: string[];
}

export class BudgetService {
  static async setBudget(
    userId: string,
    data: {
      category: ExpenseCategory;
      budgetAmount: number;
      monthYear: string;
    }
  ): Promise<IBudget> {
    const budget = await Budget.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        category: data.category,
        monthYear: data.monthYear
      },
      {
        budgetAmount: data.budgetAmount
      },
      { new: true, upsert: true }
    );

    return budget;
  }

  static async getBudgetsForMonth(
    userId: string,
    monthYear: string
  ): Promise<BudgetOverview> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Fetch user financial profile to know how much the user allocated/wants to spend
    const profile = await FinancialProfile.findOne({ userId: userObjectId });
    const profileSpendingBudget =
      profile?.availableSpendingBudget ||
      (profile
        ? Math.max(0, (profile.monthlyIncome || 0) - (profile.monthlySavingsTarget || 0))
        : 0);

    // Fetch all user configured budgets for this month
    const budgets = await Budget.find({
      userId: userObjectId,
      monthYear
    });

    // Fetch actual spent by category from expenses
    const categoryTotals = await ExpenseService.getCategoryTotals(
      userId,
      monthYear
    );

    const spentMap = new Map<string, number>();
    categoryTotals.forEach((c) => {
      spentMap.set(c.category, c.amount);
    });

    const budgetMap = new Map<string, IBudget>();
    budgets.forEach((b) => {
      budgetMap.set(b.category, b);
    });

    const categories: CategoryBudgetStatus[] = [];
    const warnings: string[] = [];

    let categoryBudgetSum = 0;
    let totalSpent = 0;

    // Process all categories that either have a budget or have expenses
    const activeCategories = new Set<ExpenseCategory>([
      ...budgets.map((b) => b.category),
      ...categoryTotals.map((c) => c.category)
    ]);

    activeCategories.forEach((cat) => {
      const budgetDoc = budgetMap.get(cat);
      const budgetAmount = budgetDoc ? budgetDoc.budgetAmount : 0;
      const actualSpent = spentMap.get(cat) || 0;

      categoryBudgetSum += budgetAmount;
      totalSpent += actualSpent;

      const statusResult = calculateBudgetStatus(actualSpent, budgetAmount);

      if (statusResult.status === 'OVER_BUDGET') {
        warnings.push(
          `Over budget in ${cat}! Spent ₹${actualSpent.toLocaleString()} against budget of ₹${budgetAmount.toLocaleString()}.`
        );
      } else if (statusResult.status === 'NEAR_LIMIT') {
        warnings.push(
          `Approaching budget limit in ${cat}: ${statusResult.percentageUsed}% used.`
        );
      }

      categories.push({
        id: budgetDoc?._id.toString(),
        category: cat,
        monthYear,
        ...statusResult
      });
    });

    // Sort categories: OVER_BUDGET first, then NEAR_LIMIT, then SAFE, then by amount spent desc
    categories.sort((a, b) => {
      const statusWeight = { OVER_BUDGET: 3, NEAR_LIMIT: 2, SAFE: 1 };
      const diff = statusWeight[b.status] - statusWeight[a.status];
      if (diff !== 0) return diff;
      return b.actualSpent - a.actualSpent;
    });

    // The money the person wants to spend:
    // Sourced from their monthly spending budget (Income - Savings Target).
    // If category budgets sum to higher, or profile is unset, use categoryBudgetSum.
    const totalBudgeted =
      profileSpendingBudget > 0
        ? Math.max(profileSpendingBudget, categoryBudgetSum)
        : categoryBudgetSum;

    // Remaining = Budgeted - spent
    const overallRemaining = totalBudgeted - totalSpent;

    let overallStatus: 'SAFE' | 'NEAR_LIMIT' | 'OVER_BUDGET' = 'SAFE';
    if (totalBudgeted > 0) {
      const overallRatio = (totalSpent / totalBudgeted) * 100;
      if (overallRatio > 100) overallStatus = 'OVER_BUDGET';
      else if (overallRatio >= 80) overallStatus = 'NEAR_LIMIT';
    } else if (totalSpent > 0) {
      overallStatus = 'OVER_BUDGET';
    }

    return {
      monthYear,
      totalBudgeted,
      categoryBudgetSum,
      totalSpent,
      overallRemaining,
      overallStatus,
      categories,
      warnings
    };
  }

  static async deleteBudget(userId: string, budgetId: string): Promise<void> {
    const result = await Budget.findOneAndDelete({
      _id: budgetId,
      userId: new mongoose.Types.ObjectId(userId)
    });
    if (!result) {
      throw new Error('Budget not found or unauthorized.');
    }
  }
}
