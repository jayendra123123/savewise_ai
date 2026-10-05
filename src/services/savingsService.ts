import mongoose from 'mongoose';
import { SavingsRecord, ISavingsRecord } from '../models/SavingsRecord';
import { FinancialProfile } from '../models/FinancialProfile';
import { Expense } from '../models/Expense';
import {
  calculateActualSavings,
  calculateSavingsRate,
  calculateAnnualTargetProjection
} from '../calculations/financialEngine';

export interface SavingsSummary {
  currentMonth: string;
  monthlySavingsTarget: number;
  actualSavings: number;
  savingsRate: number;
  totalExpenses: number;
  monthlyIncome: number;
  annualTargetProjection: number;
  targetAchieved: boolean;
  history: Array<{
    monthYear: string;
    income: number;
    targetSavings: number;
    actualSavings: number;
    totalExpenses: number;
    savingsRate: number;
    targetAchieved: boolean;
  }>;
}

export class SavingsService {
  static async getSavingsSummary(
    userId: string,
    targetMonthYear?: string
  ): Promise<SavingsSummary> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    const currentMonth =
      targetMonthYear ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Get user profile
    const profile = await FinancialProfile.findOne({ userId: userObjectId });
    const monthlyIncome = profile?.monthlyIncome || 0;
    const monthlySavingsTarget = profile?.monthlySavingsTarget || 0;

    // 2. Calculate expenses for current month
    const [yearStr, monthStr] = currentMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

    const expenseAgg = await Expense.aggregate([
      {
        $match: {
          userId: userObjectId,
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalExpenses = expenseAgg[0]?.total || 0;
    const actualSavings = calculateActualSavings(monthlyIncome, totalExpenses);
    const savingsRate = calculateSavingsRate(actualSavings, monthlyIncome);
    const targetAchieved = actualSavings >= monthlySavingsTarget && monthlySavingsTarget > 0;
    const annualTargetProjection = calculateAnnualTargetProjection(monthlySavingsTarget);

    // Save or update current month record in database
    await SavingsRecord.findOneAndUpdate(
      { userId: userObjectId, monthYear: currentMonth },
      {
        income: monthlyIncome,
        targetSavings: monthlySavingsTarget,
        actualSavings,
        totalExpenses,
        savingsRate,
        targetAchieved
      },
      { upsert: true, new: true }
    );

    // 3. Fetch past 12 months history
    const pastRecords = await SavingsRecord.find({ userId: userObjectId })
      .sort({ monthYear: -1 })
      .limit(12);

    return {
      currentMonth,
      monthlySavingsTarget,
      actualSavings,
      savingsRate,
      totalExpenses,
      monthlyIncome,
      annualTargetProjection,
      targetAchieved,
      history: pastRecords.map((r) => ({
        monthYear: r.monthYear,
        income: r.income,
        targetSavings: r.targetSavings,
        actualSavings: r.actualSavings,
        totalExpenses: r.totalExpenses,
        savingsRate: r.savingsRate,
        targetAchieved: r.targetAchieved
      }))
    };
  }
}
