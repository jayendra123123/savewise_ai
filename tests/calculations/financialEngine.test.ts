import {
  calculateAvailableSpendingBudget,
  calculateRemainingBudget,
  calculateActualSavings,
  calculateSavingsRate,
  calculateTargetSavingsRate,
  calculateCategoryPercentage,
  calculateBudgetStatus,
  calculateGoalMetrics,
  calculateAnnualTargetProjection,
  calculateMonthlySummary,
} from '../../src/calculations/financialEngine';

describe('Financial Calculation Engine', () => {
  describe('Example Scenario from Specification', () => {
    const monthlyIncome = 30000;
    const monthlySavingsTarget = 10000;
    const totalExpenses = 13000;

    it('calculates available spending budget correctly', () => {
      // Available Spending Budget = 30000 - 10000 = 20000
      const available = calculateAvailableSpendingBudget(monthlyIncome, monthlySavingsTarget);
      expect(available).toBe(20000);
    });

    it('calculates remaining spending budget correctly', () => {
      // Remaining Spending Budget = 20000 - 13000 = 7000
      const available = calculateAvailableSpendingBudget(monthlyIncome, monthlySavingsTarget);
      const remaining = calculateRemainingBudget(available, totalExpenses);
      expect(remaining).toBe(7000);
    });

    it('calculates target savings rate correctly', () => {
      // 10000 / 30000 * 100 = 33.3%
      const targetRate = calculateTargetSavingsRate(monthlySavingsTarget, monthlyIncome);
      expect(targetRate).toBe(33.3);
    });

    it('calculates actual savings and actual savings rate correctly', () => {
      // Actual savings = 30000 - 13000 = 17000
      const actualSavings = calculateActualSavings(monthlyIncome, totalExpenses);
      expect(actualSavings).toBe(17000);

      // Savings Rate = (17000 / 30000) * 100 = 56.7%
      const rate = calculateSavingsRate(actualSavings, monthlyIncome);
      expect(rate).toBe(56.7);
    });

    it('calculates annual savings target projection correctly', () => {
      // 10000 * 12 = 120000
      expect(calculateAnnualTargetProjection(monthlySavingsTarget)).toBe(120000);
    });

    it('calculates category percentage for Gold expense (5000 / 13000)', () => {
      const percentage = calculateCategoryPercentage(5000, 13000);
      expect(percentage).toBe(38.5);
    });
  });

  describe('Budget Status Determination', () => {
    it('returns SAFE when spending is <= 80%', () => {
      const result = calculateBudgetStatus(1500, 2000); // 75%
      expect(result.status).toBe('SAFE');
      expect(result.percentageUsed).toBe(75);
      expect(result.remainingAmount).toBe(500);
    });

    it('returns NEAR_LIMIT when spending is between 80% and 100%', () => {
      const result = calculateBudgetStatus(1700, 2000); // 85%
      expect(result.status).toBe('NEAR_LIMIT');
      expect(result.percentageUsed).toBe(85);
      expect(result.remainingAmount).toBe(300);
    });

    it('returns OVER_BUDGET when spending exceeds budget', () => {
      const result = calculateBudgetStatus(2300, 2000); // 115%
      expect(result.status).toBe('OVER_BUDGET');
      expect(result.percentageUsed).toBe(115);
      expect(result.remainingAmount).toBe(-300);
    });
  });

  describe('Goal Metrics & Timeline', () => {
    it('calculates goal milestones accurately (Emergency Fund: target 100000, current 30000, contribution 10000)', () => {
      const refDate = new Date('2026-10-01T00:00:00Z');
      const goal = calculateGoalMetrics(100000, 30000, 10000, refDate);

      expect(goal.remainingAmount).toBe(70000);
      expect(goal.progressPercentage).toBe(30);
      expect(goal.estimatedMonths).toBe(7);
      expect(goal.isCompleted).toBe(false);
      expect(goal.estimatedCompletionDate).toBe('2027-05-01');
    });

    it('handles completed goal', () => {
      const goal = calculateGoalMetrics(50000, 50000, 5000);
      expect(goal.remainingAmount).toBe(0);
      expect(goal.progressPercentage).toBe(100);
      expect(goal.estimatedMonths).toBe(0);
      expect(goal.isCompleted).toBe(true);
    });

    it('handles zero monthly contribution without division by zero', () => {
      const goal = calculateGoalMetrics(50000, 10000, 0);
      expect(goal.estimatedMonths).toBe(Infinity);
      expect(goal.estimatedCompletionDate).toBeNull();
    });
  });

  describe('Edge Cases & Defensive Bounds', () => {
    it('handles negative or zero income gracefully', () => {
      expect(calculateAvailableSpendingBudget(0, 5000)).toBe(0);
      expect(calculateSavingsRate(1000, 0)).toBe(0);
      expect(calculateTargetSavingsRate(5000, 0)).toBe(0);
    });

    it('handles expenses exceeding available budget', () => {
      const summary = calculateMonthlySummary(20000, 5000, 18000);
      // available: 15000, expenses: 18000 -> remaining: -3000
      expect(summary.availableSpendingBudget).toBe(15000);
      expect(summary.remainingBudget).toBe(-3000);
      expect(summary.isOverBudget).toBe(true);
    });
  });
});
