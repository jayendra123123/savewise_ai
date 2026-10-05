import mongoose from 'mongoose';
import { FinancialProfile } from '../models/FinancialProfile';
import { Expense } from '../models/Expense';
import { Budget } from '../models/Budget';
import {
  calculateAvailableSpendingBudget,
  calculateRemainingBudget,
  calculateActualSavings,
  calculateSavingsRate,
  calculateTargetSavingsRate,
  calculateCategoryPercentage
} from '../calculations/financialEngine';
import {
  MonthlyAnalysisAi,
  MonthlyAiAnalysisResponse,
  MonthlyAnalysisContextSnapshot
} from '../ai/monthlyAnalysisAi';

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

export interface MonthlyAnalysisResponse {
  selectedMonth: string;
  monthLabel: string;
  previousMonth: string;
  previousMonthLabel: string;
  currency: string;
  isCurrentMonth: boolean;
  hasFutureMonth: boolean;

  summary: {
    monthlyIncome: number;
    savingsTarget: number;
    totalExpenses: number;
    availableSpendingBudget: number;
    remainingBudget: number;
    actualSavings: number;
    savingsRate: number;
    targetSavingsRate: number;
    transactionCount: number;
    isTargetAchieved: boolean;
    savingsTargetDifference: number;
  };

  comparison: {
    currentMonthExpenses: number;
    previousMonthExpenses: number;
    hasPreviousMonthData: boolean;
    difference: number;
    percentageChange: number;
    trend: 'INCREASED' | 'DECREASED' | 'UNCHANGED';
    indicatorMessage: string;
  };

  topCategory: {
    category: string;
    amount: number;
    percentage: number;
    highlightText: string;
  } | null;

  categoryBreakdown: Array<{
    category: string;
    currentAmount: number;
    percentage: number;
    previousAmount: number;
    change: number;
    changePercentage: number;
    trend: 'INCREASED' | 'DECREASED' | 'UNCHANGED';
    isHighest: boolean;
  }>;

  topExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
  }>;

  categoryComparison: Array<{
    category: string;
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
    trend: 'INCREASED' | 'DECREASED' | 'UNCHANGED';
    isSignificantIncrease: boolean;
  }>;

  spendingTrends: Array<{
    month: string;
    label: string;
    totalExpenses: number;
    income: number;
    savings: number;
  }>;

  dailySpending: {
    days: Array<{
      day: number;
      date: string;
      amount: number;
      count: number;
    }>;
    highestDay: {
      day: number;
      date: string;
      amount: number;
    } | null;
    highestDayHighlight: string | null;
  };

  budgetPerformance: {
    monthlySpendingBudget: number;
    actualSpending: number;
    remaining: number;
    percentageUsed: number;
    status: 'ON_TRACK' | 'NEAR_LIMIT' | 'OVER_BUDGET';
    categories: Array<{
      category: string;
      budgetAmount: number;
      actualSpent: number;
      remainingAmount: number;
      percentageUsed: number;
      status: 'SAFE' | 'NEAR_LIMIT' | 'OVER_BUDGET';
    }>;
  };

  savingsAnalysis: {
    savingsTarget: number;
    actualSavings: number;
    savingsRate: number;
    previousMonthSavings: number;
    savingsChange: number;
    yearToDateSavings: number;
    targetStatus: 'ACHIEVED' | 'MISSED' | 'NO_TARGET';
    targetMessage: string;
  };

  insightCards: Array<{
    id: string;
    title: string;
    message: string;
    type: 'SPENDING' | 'CATEGORY' | 'IMPROVEMENT' | 'SAVINGS' | 'BUDGET';
    status: 'POSITIVE' | 'WARNING' | 'NEUTRAL';
  }>;

  aiAnalysis: MonthlyAiAnalysisResponse;
}

export class MonthlyAnalysisService {
  /**
   * Helper to format YYYY-MM to human label (e.g. October 2026)
   */
  private static formatMonthLabel(monthYear: string): string {
    const [yearStr, monthStr] = monthYear.split('-');
    const monthIdx = parseInt(monthStr, 10) - 1;
    const monthName = MONTH_NAMES[monthIdx] || 'Month';
    return `${monthName} ${yearStr}`;
  }

  /**
   * Helper to compute previous month (e.g. 2026-10 -> 2026-09)
   */
  private static getPreviousMonthYear(monthYear: string): string {
    const [yearStr, monthStr] = monthYear.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  /**
   * Helper to generate date range for a given month in UTC
   */
  private static getMonthDateRange(monthYear: string): {
    start: Date;
    end: Date;
    daysInMonth: number;
  } {
    const [yearStr, monthStr] = monthYear.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return { start, end, daysInMonth };
  }

  static async getMonthlyAnalysis(
    userId: string,
    targetMonth?: string,
    triggerAiRefresh = false
  ): Promise<MonthlyAnalysisResponse> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    const currentRealMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;

    const selectedMonth = targetMonth || currentRealMonth;
    const previousMonth = this.getPreviousMonthYear(selectedMonth);

    const monthLabel = this.formatMonthLabel(selectedMonth);
    const previousMonthLabel = this.formatMonthLabel(previousMonth);

    const isCurrentMonth = selectedMonth === currentRealMonth;
    const hasFutureMonth = selectedMonth < currentRealMonth;

    // 1. Fetch user financial profile
    const profile = await FinancialProfile.findOne({ userId: userObjectId });
    const monthlyIncome = profile?.monthlyIncome || 0;
    const monthlySavingsTarget = profile?.monthlySavingsTarget || 0;
    const currency = profile?.currency || '₹';

    const availableSpendingBudget = calculateAvailableSpendingBudget(
      monthlyIncome,
      monthlySavingsTarget
    );

    // 2. Compute date boundaries
    const { start: currentStart, end: currentEnd, daysInMonth } =
      this.getMonthDateRange(selectedMonth);
    const { start: prevStart, end: prevEnd } =
      this.getMonthDateRange(previousMonth);

    // 12-month boundary for spending trend
    const [selYearStr, selMonthStr] = selectedMonth.split('-');
    const selYear = parseInt(selYearStr, 10);
    const selMonth = parseInt(selMonthStr, 10) - 1;
    const trendStart = new Date(Date.UTC(selYear, selMonth - 11, 1, 0, 0, 0));

    // Year to date boundary (Jan 1 of selected year to end of selected month)
    const ytdStart = new Date(Date.UTC(selYear, 0, 1, 0, 0, 0));

    // 3. Parallel Database Aggregations
    const [
      currentCategoryAgg,
      previousCategoryAgg,
      topExpensesDocs,
      dailyAgg,
      trendAgg,
      ytdAgg,
      categoryBudgets
    ] = await Promise.all([
      // A. Current Month Category Aggregation
      Expense.aggregate([
        {
          $match: {
            userId: userObjectId,
            date: { $gte: currentStart, $lte: currentEnd }
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

      // B. Previous Month Category Aggregation
      Expense.aggregate([
        {
          $match: {
            userId: userObjectId,
            date: { $gte: prevStart, $lte: prevEnd }
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

      // C. Top Individual Expenses in selected month
      Expense.find({
        userId: userObjectId,
        date: { $gte: currentStart, $lte: currentEnd }
      })
        .sort({ amount: -1 })
        .limit(5)
        .lean(),

      // D. Daily spending aggregation
      Expense.aggregate([
        {
          $match: {
            userId: userObjectId,
            date: { $gte: currentStart, $lte: currentEnd }
          }
        },
        {
          $group: {
            _id: { $dayOfMonth: '$date' },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // E. 12-Month Trend Aggregation
      Expense.aggregate([
        {
          $match: {
            userId: userObjectId,
            date: { $gte: trendStart, $lte: currentEnd }
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

      // F. YTD Total Expenses
      Expense.aggregate([
        {
          $match: {
            userId: userObjectId,
            date: { $gte: ytdStart, $lte: currentEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      // G. User category budgets for this month
      Budget.find({
        userId: userObjectId,
        monthYear: selectedMonth
      }).lean()
    ]);

    // 4. Summarize Current & Previous Months
    const totalExpenses = currentCategoryAgg.reduce(
      (sum, item) => sum + item.total,
      0
    );
    const transactionCount = currentCategoryAgg.reduce(
      (sum, item) => sum + item.count,
      0
    );

    const previousMonthExpenses = previousCategoryAgg.reduce(
      (sum, item) => sum + item.total,
      0
    );
    const hasPreviousMonthData = previousCategoryAgg.length > 0;

    const remainingBudget = calculateRemainingBudget(
      availableSpendingBudget,
      totalExpenses
    );
    const actualSavings = calculateActualSavings(monthlyIncome, totalExpenses);
    const savingsRate = calculateSavingsRate(actualSavings, monthlyIncome);
    const targetSavingsRate = calculateTargetSavingsRate(
      monthlySavingsTarget,
      monthlyIncome
    );

    const isTargetAchieved =
      actualSavings >= monthlySavingsTarget && monthlySavingsTarget > 0;
    const savingsTargetDifference = actualSavings - monthlySavingsTarget;

    // 5. Month-over-Month Comparison
    const diff = totalExpenses - previousMonthExpenses;
    let percentageChange = 0;
    if (previousMonthExpenses > 0) {
      percentageChange = Math.round(((diff / previousMonthExpenses) * 100) * 10) / 10;
    } else if (totalExpenses > 0) {
      percentageChange = 100;
    }

    let trend: 'INCREASED' | 'DECREASED' | 'UNCHANGED' = 'UNCHANGED';
    if (diff > 0) trend = 'INCREASED';
    else if (diff < 0) trend = 'DECREASED';

    let indicatorMessage = '';
    if (!hasPreviousMonthData && previousMonthExpenses === 0) {
      indicatorMessage = 'No previous-month data available for comparison.';
    } else if (diff > 0) {
      indicatorMessage = `↑ You spent ${currency}${Math.abs(
        diff
      ).toLocaleString()} more than last month.`;
    } else if (diff < 0) {
      indicatorMessage = `↓ You spent ${currency}${Math.abs(
        diff
      ).toLocaleString()} less than last month.`;
    } else {
      indicatorMessage = `→ Your spending was unchanged compared to last month.`;
    }

    // 6. Category Breakdown & MoM Comparison
    const prevMap = new Map<string, number>();
    previousCategoryAgg.forEach((item) => {
      prevMap.set(item._id, item.total);
    });

    const categoryBreakdown = currentCategoryAgg.map((item, idx) => {
      const prevAmt = prevMap.get(item._id) || 0;
      const catDiff = item.total - prevAmt;
      let catPctChange = 0;
      if (prevAmt > 0) {
        catPctChange = Math.round(((catDiff / prevAmt) * 100) * 10) / 10;
      } else if (item.total > 0) {
        catPctChange = 100;
      }

      let catTrend: 'INCREASED' | 'DECREASED' | 'UNCHANGED' = 'UNCHANGED';
      if (catDiff > 0) catTrend = 'INCREASED';
      else if (catDiff < 0) catTrend = 'DECREASED';

      return {
        category: item._id,
        currentAmount: Math.round(item.total * 100) / 100,
        percentage: calculateCategoryPercentage(item.total, totalExpenses),
        previousAmount: Math.round(prevAmt * 100) / 100,
        change: Math.round(catDiff * 100) / 100,
        changePercentage: catPctChange,
        trend: catTrend,
        isHighest: idx === 0
      };
    });

    // Top Spending Category
    const topCategory =
      categoryBreakdown.length > 0
        ? {
            category: categoryBreakdown[0].category,
            amount: categoryBreakdown[0].currentAmount,
            percentage: categoryBreakdown[0].percentage,
            highlightText: `Your highest spending category this month is ${categoryBreakdown[0].category} at ${currency}${categoryBreakdown[0].currentAmount.toLocaleString()}.`
          }
        : null;

    // Full Category Comparison (including categories spent in previous month but 0 this month)
    const allCategoriesSet = new Set<string>([
      ...currentCategoryAgg.map((c) => c._id),
      ...previousCategoryAgg.map((c) => c._id)
    ]);

    const curMap = new Map<string, number>();
    currentCategoryAgg.forEach((item) => {
      curMap.set(item._id, item.total);
    });

    const categoryComparison = Array.from(allCategoriesSet).map((cat) => {
      const cur = curMap.get(cat) || 0;
      const prev = prevMap.get(cat) || 0;
      const catDiff = cur - prev;
      let catPctChange = 0;
      if (prev > 0) {
        catPctChange = Math.round(((catDiff / prev) * 100) * 10) / 10;
      } else if (cur > 0) {
        catPctChange = 100;
      }

      let catTrend: 'INCREASED' | 'DECREASED' | 'UNCHANGED' = 'UNCHANGED';
      if (catDiff > 0) catTrend = 'INCREASED';
      else if (catDiff < 0) catTrend = 'DECREASED';

      return {
        category: cat,
        current: Math.round(cur * 100) / 100,
        previous: Math.round(prev * 100) / 100,
        change: Math.round(catDiff * 100) / 100,
        changePercentage: catPctChange,
        trend: catTrend,
        isSignificantIncrease: catPctChange >= 20 && catDiff > 0
      };
    });

    categoryComparison.sort((a, b) => b.current - a.current);

    // 7. Top Individual Expenses
    const topExpenses = topExpensesDocs.map((tx: any) => ({
      id: tx._id.toString(),
      description: tx.description,
      amount: tx.amount,
      category: tx.category,
      date: new Date(tx.date).toISOString().split('T')[0]
    }));

    // 8. Spending Trends (Continuous Timeline for 12 Months)
    const trendMap = new Map<string, number>();
    trendAgg.forEach((item) => {
      trendMap.set(item._id, item.total);
    });

    const spendingTrends: Array<{
      month: string;
      label: string;
      totalExpenses: number;
      income: number;
      savings: number;
    }> = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(selYear, selMonth - i, 1));
      const mKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const mNameShort = MONTH_NAMES[d.getUTCMonth()].substring(0, 3);
      const mExp = trendMap.get(mKey) || 0;
      const mSav = calculateActualSavings(monthlyIncome, mExp);

      spendingTrends.push({
        month: mKey,
        label: `${mNameShort} ${String(d.getUTCFullYear()).slice(-2)}`,
        totalExpenses: mExp,
        income: monthlyIncome,
        savings: mSav
      });
    }

    // 9. Daily Spending Analysis
    const dayMap = new Map<number, { amount: number; count: number }>();
    dailyAgg.forEach((item) => {
      dayMap.set(item._id, { amount: item.total, count: item.count });
    });

    const days: Array<{
      day: number;
      date: string;
      amount: number;
      count: number;
    }> = [];

    let highestDay: { day: number; date: string; amount: number } | null = null;
    let maxDayAmount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const data = dayMap.get(day) || { amount: 0, count: 0 };
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        date: dateStr,
        amount: data.amount,
        count: data.count
      });

      if (data.amount > maxDayAmount) {
        maxDayAmount = data.amount;
        highestDay = {
          day,
          date: dateStr,
          amount: data.amount
        };
      }
    }

    const highestDayHighlight =
      highestDay && highestDay.amount > 0
        ? `${MONTH_NAMES[selMonth]} ${highestDay.day} was your highest spending day at ${currency}${highestDay.amount.toLocaleString()}.`
        : null;

    // 10. Budget Performance
    const budgetMap = new Map<string, number>();
    categoryBudgets.forEach((b) => {
      budgetMap.set(b.category, b.budgetAmount);
    });

    const budgetCatList = Array.from(allCategoriesSet).map((cat) => {
      const bAmt = budgetMap.get(cat) || 0;
      const sAmt = curMap.get(cat) || 0;
      const rem = bAmt - sAmt;
      const used = bAmt > 0 ? Math.round(((sAmt / bAmt) * 100) * 10) / 10 : sAmt > 0 ? 100 : 0;
      let st: 'SAFE' | 'NEAR_LIMIT' | 'OVER_BUDGET' = 'SAFE';
      if (sAmt > bAmt && bAmt > 0) st = 'OVER_BUDGET';
      else if (used >= 80) st = 'NEAR_LIMIT';

      return {
        category: cat,
        budgetAmount: bAmt,
        actualSpent: sAmt,
        remainingAmount: rem,
        percentageUsed: used,
        status: st
      };
    });

    budgetCatList.sort((a, b) => b.actualSpent - a.actualSpent);

    const budgetPercentageUsed =
      availableSpendingBudget > 0
        ? Math.round((totalExpenses / availableSpendingBudget) * 100)
        : 0;

    let overallBudgetStatus: 'ON_TRACK' | 'NEAR_LIMIT' | 'OVER_BUDGET' = 'ON_TRACK';
    if (remainingBudget < 0) overallBudgetStatus = 'OVER_BUDGET';
    else if (budgetPercentageUsed >= 80) overallBudgetStatus = 'NEAR_LIMIT';

    // 11. Savings Analysis
    const prevActualSavings = calculateActualSavings(
      monthlyIncome,
      previousMonthExpenses
    );
    const savingsChange = actualSavings - prevActualSavings;

    // YTD savings: (monthlyIncome * elapsedMonths) - ytdExpenses
    const elapsedMonthsInYear = selMonth + 1;
    const ytdExpenses = ytdAgg.length > 0 ? ytdAgg[0].total : 0;
    const yearToDateSavings = calculateActualSavings(
      monthlyIncome * elapsedMonthsInYear,
      ytdExpenses
    );

    let targetStatus: 'ACHIEVED' | 'MISSED' | 'NO_TARGET' = 'NO_TARGET';
    let targetMessage = 'No savings target set.';
    if (monthlySavingsTarget > 0) {
      if (actualSavings >= monthlySavingsTarget) {
        targetStatus = 'ACHIEVED';
        targetMessage = '✓ Savings target achieved';
      } else {
        targetStatus = 'MISSED';
        targetMessage = `⚠ Savings target missed by ${currency}${Math.abs(
          savingsTargetDifference
        ).toLocaleString()}`;
      }
    }

    // 12. Dynamic Insight Cards
    const insightCards: Array<{
      id: string;
      title: string;
      message: string;
      type: 'SPENDING' | 'CATEGORY' | 'IMPROVEMENT' | 'SAVINGS' | 'BUDGET';
      status: 'POSITIVE' | 'WARNING' | 'NEUTRAL';
    }> = [];

    // Card 1: Spending Trend Card
    if (hasPreviousMonthData) {
      if (trend === 'INCREASED') {
        insightCards.push({
          id: 'card-spending-increase',
          title: 'Spending Increased',
          message: `You spent ${currency}${Math.abs(diff).toLocaleString()} more than last month (+${percentageChange}%).`,
          type: 'SPENDING',
          status: 'WARNING'
        });
      } else if (trend === 'DECREASED') {
        insightCards.push({
          id: 'card-spending-decrease',
          title: 'Spending Decreased',
          message: `You spent ${currency}${Math.abs(diff).toLocaleString()} less than last month (-${Math.abs(percentageChange)}%).`,
          type: 'SPENDING',
          status: 'POSITIVE'
        });
      }
    }

    // Card 2: Top Category Card
    if (topCategory) {
      insightCards.push({
        id: 'card-top-category',
        title: 'Top Category',
        message: `${topCategory.category} was your largest expense (${currency}${topCategory.amount.toLocaleString()}).`,
        type: 'CATEGORY',
        status: 'NEUTRAL'
      });
    }

    // Card 3: Best Improvement (Category with largest reduction)
    const improvedCat = [...categoryComparison]
      .filter((c) => c.change < 0)
      .sort((a, b) => a.change - b.change)[0];
    if (improvedCat) {
      insightCards.push({
        id: 'card-best-improvement',
        title: 'Best Improvement',
        message: `${improvedCat.category} expenses decreased by ${currency}${Math.abs(
          improvedCat.change
        ).toLocaleString()}.`,
        type: 'IMPROVEMENT',
        status: 'POSITIVE'
      });
    }

    // Card 4: Savings Achievement
    if (monthlySavingsTarget > 0) {
      if (actualSavings >= monthlySavingsTarget) {
        const excess = actualSavings - monthlySavingsTarget;
        insightCards.push({
          id: 'card-savings-success',
          title: 'Savings Achievement',
          message: excess > 0
            ? `You exceeded your savings target by ${currency}${excess.toLocaleString()}!`
            : `You achieved 100% of your savings target!`,
          type: 'SAVINGS',
          status: 'POSITIVE'
        });
      } else {
        insightCards.push({
          id: 'card-savings-missed',
          title: 'Savings Target',
          message: `You missed your savings target by ${currency}${Math.abs(savingsTargetDifference).toLocaleString()}.`,
          type: 'SAVINGS',
          status: 'WARNING'
        });
      }
    }

    // Card 5: Budget Status Card
    if (remainingBudget >= 0) {
      insightCards.push({
        id: 'card-budget-status',
        title: 'Budget Status',
        message: `You have ${currency}${remainingBudget.toLocaleString()} remaining in your spending budget.`,
        type: 'BUDGET',
        status: 'POSITIVE'
      });
    } else {
      insightCards.push({
        id: 'card-budget-over',
        title: 'Budget Overrun',
        message: `You exceeded your spending budget by ${currency}${Math.abs(remainingBudget).toLocaleString()}.`,
        type: 'BUDGET',
        status: 'WARNING'
      });
    }

    // 13. Gemini AI Analysis
    const aiSnapshot: MonthlyAnalysisContextSnapshot = {
      selectedMonth,
      monthLabel,
      currency,
      currentMonth: {
        income: monthlyIncome,
        savingsTarget: monthlySavingsTarget,
        totalExpenses,
        remainingBudget,
        actualSavings,
        savingsRate,
        transactionCount
      },
      previousMonth: {
        income: monthlyIncome,
        totalExpenses: previousMonthExpenses,
        actualSavings: prevActualSavings,
        hasData: hasPreviousMonthData
      },
      spendingDifference: {
        difference: diff,
        percentageChange,
        trend
      },
      topCategory: topCategory
        ? {
            category: topCategory.category,
            amount: topCategory.amount,
            percentage: topCategory.percentage
          }
        : null,
      categoryComparison: categoryComparison.slice(0, 6).map((c) => ({
        category: c.category,
        current: c.current,
        previous: c.previous,
        change: c.change,
        changePercentage: c.changePercentage
      })),
      topExpenses: topExpenses.slice(0, 4).map((tx) => ({
        description: tx.description,
        amount: tx.amount,
        category: tx.category
      }))
    };

    const aiAnalysis = triggerAiRefresh
      ? await MonthlyAnalysisAi.generateMonthlyAnalysis(aiSnapshot)
      : MonthlyAnalysisAi.generateFallbackAnalysis(aiSnapshot);

    return {
      selectedMonth,
      monthLabel,
      previousMonth,
      previousMonthLabel,
      currency,
      isCurrentMonth,
      hasFutureMonth,

      summary: {
        monthlyIncome,
        savingsTarget: monthlySavingsTarget,
        totalExpenses,
        availableSpendingBudget,
        remainingBudget,
        actualSavings,
        savingsRate,
        targetSavingsRate,
        transactionCount,
        isTargetAchieved,
        savingsTargetDifference
      },

      comparison: {
        currentMonthExpenses: totalExpenses,
        previousMonthExpenses,
        hasPreviousMonthData,
        difference: diff,
        percentageChange,
        trend,
        indicatorMessage
      },

      topCategory,
      categoryBreakdown,
      topExpenses,
      categoryComparison,
      spendingTrends,
      dailySpending: {
        days,
        highestDay,
        highestDayHighlight
      },

      budgetPerformance: {
        monthlySpendingBudget: availableSpendingBudget,
        actualSpending: totalExpenses,
        remaining: remainingBudget,
        percentageUsed: budgetPercentageUsed,
        status: overallBudgetStatus,
        categories: budgetCatList
      },

      savingsAnalysis: {
        savingsTarget: monthlySavingsTarget,
        actualSavings,
        savingsRate,
        previousMonthSavings: prevActualSavings,
        savingsChange,
        yearToDateSavings,
        targetStatus,
        targetMessage
      },

      insightCards,
      aiAnalysis
    };
  }
}
