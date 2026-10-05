import { z } from 'zod';

export interface FinancialContextSnapshot {
  currency: string;
  monthYear: string;
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
  budgetWarnings: string[];
  goals: Array<{
    title: string;
    targetAmount: number;
    currentAmount: number;
    progressPercentage: number;
    estimatedMonths: number;
    isCompleted: boolean;
  }>;
}

export const AiCoachResponseSchema = z.object({
  summary: z.string().min(10),
  insights: z.array(z.string()).min(1),
  warnings: z.array(z.string()),
  recommendations: z.array(z.string()).min(1),
  goalAdvice: z.array(z.string()),
  disclaimer: z
    .string()
    .default(
      'AI insights are for educational and informational purposes only and are not professional financial advice.'
    )
});

export type AiCoachResponse = z.infer<typeof AiCoachResponseSchema>;
