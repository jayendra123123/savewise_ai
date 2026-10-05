import { FinancialContextSnapshot, AiCoachResponse } from './aiTypes';

export function generateFallbackFinancialInsights(
  snapshot: FinancialContextSnapshot
): AiCoachResponse {
  const {
    currency,
    monthlyIncome,
    monthlySavingsTarget,
    spendingBudget,
    totalExpenses,
    remainingBudget,
    actualSavings,
    savingsRate,
    targetSavingsRate,
    categories,
    goals
  } = snapshot;

  // 1. Summary
  let summary = '';
  if (remainingBudget >= 0) {
    summary = `Your finances are currently within your monthly spending budget. You have spent ${currency}${totalExpenses.toLocaleString()} from your ${currency}${spendingBudget.toLocaleString()} spending budget, leaving ${currency}${remainingBudget.toLocaleString()}.`;
  } else {
    summary = `You have currently exceeded your monthly spending budget by ${currency}${Math.abs(
      remainingBudget
    ).toLocaleString()}. Total spending stands at ${currency}${totalExpenses.toLocaleString()} against an available budget of ${currency}${spendingBudget.toLocaleString()}.`;
  }

  // 2. Spending Insights
  const insights: string[] = [];
  if (categories.length > 0) {
    const top = categories[0];
    insights.push(
      `${top.name} is your largest expense category at ${currency}${top.amount.toLocaleString()} (${top.percentage}% of total expenses).`
    );
  }

  if (targetSavingsRate > 0) {
    insights.push(
      `Your target savings of ${currency}${monthlySavingsTarget.toLocaleString()} represents ${targetSavingsRate}% of your monthly income.`
    );
  }

  if (actualSavings >= monthlySavingsTarget && monthlySavingsTarget > 0) {
    insights.push(
      `You are currently on track with your monthly savings target, having retained an estimated ${currency}${actualSavings.toLocaleString()} (${savingsRate}% savings rate).`
    );
  } else if (monthlyIncome > 0) {
    insights.push(
      `Current estimated savings stand at ${currency}${actualSavings.toLocaleString()}, giving an effective savings rate of ${savingsRate}%.`
    );
  }

  // 3. Warnings
  const warnings: string[] = [];
  if (remainingBudget < 0) {
    warnings.push(
      `Spending budget exceeded by ${currency}${Math.abs(
        remainingBudget
      ).toLocaleString()}. Reduce discretionary spending immediately to protect your savings.`
    );
  } else if (spendingBudget > 0 && remainingBudget <= spendingBudget * 0.15) {
    warnings.push(
      `Only ${currency}${remainingBudget.toLocaleString()} remaining in your spending budget for this month.`
    );
  }

  snapshot.budgetWarnings.forEach((w) => {
    if (!warnings.includes(w)) {
      warnings.push(w);
    }
  });

  // 4. Recommendations
  const recommendations: string[] = [];
  if (remainingBudget < 0) {
    recommendations.push(
      'Pause non-essential entertainment and shopping purchases until the start of the next budget cycle.'
    );
  } else {
    recommendations.push(
      'Continue following the "Save First" philosophy by maintaining your monthly savings commitment before allocating to non-essentials.'
    );
  }

  if (categories.some((c) => c.name === 'Food' && c.percentage > 30)) {
    recommendations.push(
      'Food spending represents a notable portion of your budget. Meal planning can help reduce recurring takeout costs.'
    );
  }

  if (recommendations.length < 2) {
    recommendations.push(
      'Automate your monthly savings transfer on payday to ensure consistent progress toward your targets.'
    );
  }

  // 5. Goal Advice
  const goalAdvice: string[] = [];
  if (goals.length > 0) {
    goals.forEach((g) => {
      if (g.isCompleted) {
        goalAdvice.push(
          `Congratulations! You have fully achieved your "${g.title}" goal! 🎉 Consider allocating future contributions to your next objective.`
        );
      } else if (g.estimatedMonths !== Infinity && g.estimatedMonths > 0) {
        goalAdvice.push(
          `For "${g.title}": At your current monthly contribution, you are approximately ${g.estimatedMonths} month(s) away from reaching your target of ${currency}${g.targetAmount.toLocaleString()}.`
        );
      } else {
        goalAdvice.push(
          `For "${g.title}": Setting a regular monthly contribution will help you establish a predictable completion timeline.`
        );
      }
    });
  } else {
    goalAdvice.push(
      'You have not configured any financial goals yet. Setting an Emergency Fund goal of 3-6 months expenses is a recommended starting point.'
    );
  }

  return {
    summary,
    insights,
    warnings,
    recommendations,
    goalAdvice,
    disclaimer:
      'AI insights are for educational and informational purposes only and are not professional financial advice.'
  };
}
