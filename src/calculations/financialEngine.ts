export type BudgetStatusType = 'SAFE' | 'NEAR_LIMIT' | 'OVER_BUDGET';

export interface BudgetStatusResult {
  budgetAmount: number;
  actualSpent: number;
  remainingAmount: number;
  percentageUsed: number;
  status: BudgetStatusType;
}

export interface GoalMetricsResult {
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  estimatedMonths: number;
  estimatedCompletionDate: string | null;
  isCompleted: boolean;
}

export interface MonthlyFinancialSummary {
  monthlyIncome: number;
  monthlySavingsTarget: number;
  availableSpendingBudget: number;
  totalExpenses: number;
  remainingBudget: number;
  actualSavings: number;
  savingsRate: number;
  targetSavingsRate: number;
  annualTargetProjection: number;
  isOverBudget: boolean;
}

/**
 * Calculates Available Spending Budget:
 * Available Spending Budget = Monthly Income - Monthly Savings Target
 */
export function calculateAvailableSpendingBudget(
  monthlyIncome: number,
  monthlySavingsTarget: number
): number {
  const safeIncome = Math.max(0, Number(monthlyIncome) || 0);
  const safeTarget = Math.max(0, Number(monthlySavingsTarget) || 0);
  return Math.max(0, safeIncome - safeTarget);
}

/**
 * Calculates Remaining Spending Budget:
 * Remaining Spending Budget = Available Spending Budget - Total Expenses
 */
export function calculateRemainingBudget(
  availableSpendingBudget: number,
  totalExpenses: number
): number {
  const safeBudget = Number(availableSpendingBudget) || 0;
  const safeExpenses = Math.max(0, Number(totalExpenses) || 0);
  return safeBudget - safeExpenses;
}

/**
 * Calculates Actual Savings for the month:
 * Actual Savings = Monthly Income - Total Expenses
 */
export function calculateActualSavings(
  monthlyIncome: number,
  totalExpenses: number
): number {
  const safeIncome = Math.max(0, Number(monthlyIncome) || 0);
  const safeExpenses = Math.max(0, Number(totalExpenses) || 0);
  return safeIncome - safeExpenses;
}

/**
 * Calculates Savings Rate as a percentage:
 * Savings Rate = (Actual Savings / Monthly Income) * 100
 * Clamped and rounded to 1 decimal place.
 */
export function calculateSavingsRate(
  actualSavings: number,
  monthlyIncome: number
): number {
  const safeIncome = Number(monthlyIncome) || 0;
  if (safeIncome <= 0) return 0;
  const rate = (actualSavings / safeIncome) * 100;
  return Math.round(rate * 10) / 10;
}

/**
 * Calculates Target Savings Rate as a percentage:
 * Target Savings Rate = (Monthly Savings Target / Monthly Income) * 100
 */
export function calculateTargetSavingsRate(
  monthlySavingsTarget: number,
  monthlyIncome: number
): number {
  const safeIncome = Number(monthlyIncome) || 0;
  const safeTarget = Math.max(0, Number(monthlySavingsTarget) || 0);
  if (safeIncome <= 0) return 0;
  const rate = (safeTarget / safeIncome) * 100;
  return Math.round(rate * 10) / 10;
}

/**
 * Calculates category expenditure percentage of total expenses.
 */
export function calculateCategoryPercentage(
  categoryExpense: number,
  totalExpenses: number
): number {
  const safeTotal = Number(totalExpenses) || 0;
  const safeCategory = Math.max(0, Number(categoryExpense) || 0);
  if (safeTotal <= 0) return 0;
  const percentage = (safeCategory / safeTotal) * 100;
  return Math.round(percentage * 10) / 10;
}

/**
 * Calculates status of a specific category budget:
 * - SAFE: <= 80% used
 * - NEAR_LIMIT: > 80% and <= 100% used
 * - OVER_BUDGET: > 100% used
 */
export function calculateBudgetStatus(
  actualSpent: number,
  budgetAmount: number
): BudgetStatusResult {
  const safeSpent = Math.max(0, Number(actualSpent) || 0);
  const safeBudget = Math.max(0, Number(budgetAmount) || 0);
  const remaining = safeBudget - safeSpent;

  let percentageUsed = 0;
  if (safeBudget > 0) {
    percentageUsed = Math.round(((safeSpent / safeBudget) * 100) * 10) / 10;
  } else if (safeSpent > 0) {
    percentageUsed = 100;
  }

  let status: BudgetStatusType = 'SAFE';
  if (safeSpent > safeBudget && safeBudget > 0) {
    status = 'OVER_BUDGET';
  } else if (percentageUsed >= 80) {
    status = 'NEAR_LIMIT';
  }

  return {
    budgetAmount: safeBudget,
    actualSpent: safeSpent,
    remainingAmount: remaining,
    percentageUsed,
    status
  };
}

/**
 * Calculates progress and timeline milestones for a financial goal.
 */
export function calculateGoalMetrics(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
  referenceDate: Date = new Date()
): GoalMetricsResult {
  const safeTarget = Math.max(0, Number(targetAmount) || 0);
  const safeCurrent = Math.max(0, Number(currentAmount) || 0);
  const safeMonthly = Math.max(0, Number(monthlyContribution) || 0);

  const remaining = Math.max(0, safeTarget - safeCurrent);
  const isCompleted = safeCurrent >= safeTarget && safeTarget > 0;
  const progressPercentage = safeTarget > 0
    ? Math.min(100, Math.round(((safeCurrent / safeTarget) * 100) * 10) / 10)
    : 0;

  let estimatedMonths = 0;
  let estimatedCompletionDate: string | null = null;

  if (isCompleted) {
    estimatedMonths = 0;
  } else if (safeMonthly > 0) {
    estimatedMonths = Math.ceil(remaining / safeMonthly);
    const futureDate = new Date(referenceDate);
    futureDate.setMonth(futureDate.getMonth() + estimatedMonths);
    estimatedCompletionDate = futureDate.toISOString().split('T')[0];
  } else {
    estimatedMonths = Infinity;
    estimatedCompletionDate = null;
  }

  return {
    targetAmount: safeTarget,
    currentAmount: safeCurrent,
    remainingAmount: remaining,
    progressPercentage,
    estimatedMonths,
    estimatedCompletionDate,
    isCompleted
  };
}

/**
 * Calculates annual projected target savings.
 */
export function calculateAnnualTargetProjection(monthlySavingsTarget: number): number {
  const safeTarget = Math.max(0, Number(monthlySavingsTarget) || 0);
  return safeTarget * 12;
}

/**
 * Aggregates complete monthly financial picture deterministically.
 */
export function calculateMonthlySummary(
  monthlyIncome: number,
  monthlySavingsTarget: number,
  totalExpenses: number
): MonthlyFinancialSummary {
  const availableBudget = calculateAvailableSpendingBudget(monthlyIncome, monthlySavingsTarget);
  const remainingBudget = calculateRemainingBudget(availableBudget, totalExpenses);
  const actualSavings = calculateActualSavings(monthlyIncome, totalExpenses);
  const savingsRate = calculateSavingsRate(actualSavings, monthlyIncome);
  const targetSavingsRate = calculateTargetSavingsRate(monthlySavingsTarget, monthlyIncome);
  const annualTargetProjection = calculateAnnualTargetProjection(monthlySavingsTarget);

  return {
    monthlyIncome,
    monthlySavingsTarget,
    availableSpendingBudget: availableBudget,
    totalExpenses,
    remainingBudget,
    actualSavings,
    savingsRate,
    targetSavingsRate,
    annualTargetProjection,
    isOverBudget: remainingBudget < 0
  };
}
