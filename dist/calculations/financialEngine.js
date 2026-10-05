"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAvailableSpendingBudget = calculateAvailableSpendingBudget;
exports.calculateRemainingBudget = calculateRemainingBudget;
exports.calculateActualSavings = calculateActualSavings;
exports.calculateSavingsRate = calculateSavingsRate;
exports.calculateTargetSavingsRate = calculateTargetSavingsRate;
exports.calculateCategoryPercentage = calculateCategoryPercentage;
exports.calculateBudgetStatus = calculateBudgetStatus;
exports.calculateGoalMetrics = calculateGoalMetrics;
exports.calculateAnnualTargetProjection = calculateAnnualTargetProjection;
exports.calculateMonthlySummary = calculateMonthlySummary;
/**
 * Calculates Available Spending Budget:
 * Available Spending Budget = Monthly Income - Monthly Savings Target
 */
function calculateAvailableSpendingBudget(monthlyIncome, monthlySavingsTarget) {
    const safeIncome = Math.max(0, Number(monthlyIncome) || 0);
    const safeTarget = Math.max(0, Number(monthlySavingsTarget) || 0);
    return Math.max(0, safeIncome - safeTarget);
}
/**
 * Calculates Remaining Spending Budget:
 * Remaining Spending Budget = Available Spending Budget - Total Expenses
 */
function calculateRemainingBudget(availableSpendingBudget, totalExpenses) {
    const safeBudget = Number(availableSpendingBudget) || 0;
    const safeExpenses = Math.max(0, Number(totalExpenses) || 0);
    return safeBudget - safeExpenses;
}
/**
 * Calculates Actual Savings for the month:
 * Actual Savings = Monthly Income - Total Expenses
 */
function calculateActualSavings(monthlyIncome, totalExpenses) {
    const safeIncome = Math.max(0, Number(monthlyIncome) || 0);
    const safeExpenses = Math.max(0, Number(totalExpenses) || 0);
    return safeIncome - safeExpenses;
}
/**
 * Calculates Savings Rate as a percentage:
 * Savings Rate = (Actual Savings / Monthly Income) * 100
 * Clamped and rounded to 1 decimal place.
 */
function calculateSavingsRate(actualSavings, monthlyIncome) {
    const safeIncome = Number(monthlyIncome) || 0;
    if (safeIncome <= 0)
        return 0;
    const rate = (actualSavings / safeIncome) * 100;
    return Math.round(rate * 10) / 10;
}
/**
 * Calculates Target Savings Rate as a percentage:
 * Target Savings Rate = (Monthly Savings Target / Monthly Income) * 100
 */
function calculateTargetSavingsRate(monthlySavingsTarget, monthlyIncome) {
    const safeIncome = Number(monthlyIncome) || 0;
    const safeTarget = Math.max(0, Number(monthlySavingsTarget) || 0);
    if (safeIncome <= 0)
        return 0;
    const rate = (safeTarget / safeIncome) * 100;
    return Math.round(rate * 10) / 10;
}
/**
 * Calculates category expenditure percentage of total expenses.
 */
function calculateCategoryPercentage(categoryExpense, totalExpenses) {
    const safeTotal = Number(totalExpenses) || 0;
    const safeCategory = Math.max(0, Number(categoryExpense) || 0);
    if (safeTotal <= 0)
        return 0;
    const percentage = (safeCategory / safeTotal) * 100;
    return Math.round(percentage * 10) / 10;
}
/**
 * Calculates status of a specific category budget:
 * - SAFE: <= 80% used
 * - NEAR_LIMIT: > 80% and <= 100% used
 * - OVER_BUDGET: > 100% used
 */
function calculateBudgetStatus(actualSpent, budgetAmount) {
    const safeSpent = Math.max(0, Number(actualSpent) || 0);
    const safeBudget = Math.max(0, Number(budgetAmount) || 0);
    const remaining = safeBudget - safeSpent;
    let percentageUsed = 0;
    if (safeBudget > 0) {
        percentageUsed = Math.round(((safeSpent / safeBudget) * 100) * 10) / 10;
    }
    else if (safeSpent > 0) {
        percentageUsed = 100;
    }
    let status = 'SAFE';
    if (safeSpent > safeBudget && safeBudget > 0) {
        status = 'OVER_BUDGET';
    }
    else if (percentageUsed >= 80) {
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
function calculateGoalMetrics(targetAmount, currentAmount, monthlyContribution, referenceDate = new Date()) {
    const safeTarget = Math.max(0, Number(targetAmount) || 0);
    const safeCurrent = Math.max(0, Number(currentAmount) || 0);
    const safeMonthly = Math.max(0, Number(monthlyContribution) || 0);
    const remaining = Math.max(0, safeTarget - safeCurrent);
    const isCompleted = safeCurrent >= safeTarget && safeTarget > 0;
    const progressPercentage = safeTarget > 0
        ? Math.min(100, Math.round(((safeCurrent / safeTarget) * 100) * 10) / 10)
        : 0;
    let estimatedMonths = 0;
    let estimatedCompletionDate = null;
    if (isCompleted) {
        estimatedMonths = 0;
    }
    else if (safeMonthly > 0) {
        estimatedMonths = Math.ceil(remaining / safeMonthly);
        const futureDate = new Date(referenceDate);
        futureDate.setMonth(futureDate.getMonth() + estimatedMonths);
        estimatedCompletionDate = futureDate.toISOString().split('T')[0];
    }
    else {
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
function calculateAnnualTargetProjection(monthlySavingsTarget) {
    const safeTarget = Math.max(0, Number(monthlySavingsTarget) || 0);
    return safeTarget * 12;
}
/**
 * Aggregates complete monthly financial picture deterministically.
 */
function calculateMonthlySummary(monthlyIncome, monthlySavingsTarget, totalExpenses) {
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
