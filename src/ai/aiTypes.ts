import { z } from 'zod';

export interface FinancialContextSnapshot {
  currency: string;
  monthYear: string;
  monthLabel: string;
  hasTransactions: boolean;
  
  financialSummary: {
    income: number;
    savingsTarget: number;
    spendingBudget: number;
    totalExpenses: number;
    actualSavings: number;
    savingsRate: number;
    targetSavingsRate: number;
    remainingBudget: number;
    transactionCount: number;
    isOnTrackForTarget: boolean;
    savingsDifference: number; // surplus or deficit
  };

  previousMonthComparison: {
    hasData: boolean;
    previousMonth: string;
    previousMonthLabel: string;
    previousExpenses: number;
    previousSavings: number;
    expensesDiff: number;
    expensesPctChange: number;
    trend: 'INCREASED' | 'DECREASED' | 'UNCHANGED';
  };

  spendingAnalysis: {
    topCategory: { name: string; amount: number; percentage: number } | null;
    categories: Array<{
      name: string;
      amount: number;
      percentage: number;
      previousAmount: number;
      changeAmount: number;
      changePercentage: number;
      trend: 'INCREASED' | 'DECREASED' | 'UNCHANGED';
      budget?: number;
      status?: string;
    }>;
    topExpenses: Array<{
      description: string;
      amount: number;
      category: string;
      date: string;
    }>;
  };

  savingsOpportunities: Array<{
    category: string;
    reason: string;
    currentAmount: number;
    suggestedReduction: number;
    potentialSavingsIncrease: number;
    currentActualSavings: number;
    newProjectedSavings: number;
  }>;

  budgetWarnings: string[];

  goals: Array<{
    title: string;
    targetAmount: number;
    currentAmount: number;
    remainingAmount: number;
    progressPercentage: number;
    estimatedMonths: number;
    isCompleted: boolean;
  }>;

  // Backward compatibility fields
  monthlyIncome: number;
  monthlySavingsTarget: number;
  spendingBudget: number;
  totalExpenses: number;
  remainingBudget: number;
  actualSavings: number;
  savingsRate: number;
  targetSavingsRate: number;
  budgetStatus: 'SAFE' | 'NEAR_LIMIT' | 'OVER_BUDGET';
  categories: Array<{
    name: string;
    amount: number;
    percentage: number;
    budget?: number;
    status?: string;
  }>;
}

export const AiCoachResponseSchema = z.object({
  summary: z.string().min(10),
  financialSummary: z
    .object({
      earnedText: z.string(),
      spentText: z.string(),
      savedText: z.string(),
      targetStatusText: z.string(),
      momChangeText: z.string()
    })
    .optional(),
  spendingAnalysis: z
    .object({
      overview: z.string(),
      topCategoryInsights: z.array(z.string()).default([]),
      unnecessarySpending: z.array(z.string()).default([])
    })
    .optional(),
  warnings: z.array(z.string()).default([]),
  saveMoreOpportunities: z
    .array(
      z.object({
        category: z.string(),
        insight: z.string(),
        suggestedCut: z.number().optional(),
        potentialSavings: z.number().optional(),
        projectedSavingsTotal: z.number().optional()
      })
    )
    .default([]),
  goalProgress: z
    .array(
      z.object({
        goalTitle: z.string(),
        progressText: z.string(),
        advice: z.string()
      })
    )
    .default([]),
  actionPlan: z.array(z.string()).default([]),
  insights: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  goalAdvice: z.array(z.string()).default([]),
  disclaimer: z
    .string()
    .default(
      'SaveWise AI Financial Coach insights are for educational and informational purposes only and do not constitute certified financial advice.'
    )
});

export type AiCoachResponse = z.infer<typeof AiCoachResponseSchema>;
