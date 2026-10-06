"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFallbackFinancialInsights = generateFallbackFinancialInsights;
function generateFallbackFinancialInsights(snapshot) {
    const { currency, monthLabel, hasTransactions, financialSummary, previousMonthComparison, spendingAnalysis, savingsOpportunities, budgetWarnings, goals } = snapshot;
    const { income, savingsTarget, totalExpenses, actualSavings, savingsRate, targetSavingsRate, remainingBudget, transactionCount, isOnTrackForTarget, savingsDifference } = financialSummary;
    // Handle empty month (no transactions)
    if (!hasTransactions || totalExpenses === 0) {
        const summary = `No expenses have been recorded for ${monthLabel} yet. Your monthly income is set to ${currency}${income.toLocaleString()} with a savings target of ${currency}${savingsTarget.toLocaleString()}.`;
        return {
            summary,
            financialSummary: {
                earnedText: `Monthly income: ${currency}${income.toLocaleString()}`,
                spentText: `Total expenses: ${currency}0 (0 transactions)`,
                savedText: `Projected savings: ${currency}${income.toLocaleString()} (100% savings rate)`,
                targetStatusText: savingsTarget > 0 ? `Target: ${currency}${savingsTarget.toLocaleString()}/month` : 'No savings target set',
                momChangeText: previousMonthComparison.hasData
                    ? `Last month (${previousMonthComparison.previousMonthLabel}), you spent ${currency}${previousMonthComparison.previousExpenses.toLocaleString()}.`
                    : 'No previous month data recorded.'
            },
            spendingAnalysis: {
                overview: `You have not logged any transactions for ${monthLabel}.`,
                topCategoryInsights: [],
                unnecessarySpending: []
            },
            warnings: [],
            saveMoreOpportunities: [],
            goalProgress: goals.map((g) => ({
                goalTitle: g.title,
                progressText: `${g.progressPercentage}% completed (${currency}${g.currentAmount.toLocaleString()} of ${currency}${g.targetAmount.toLocaleString()})`,
                advice: g.isCompleted
                    ? 'Goal completed! 🎉'
                    : `Remaining: ${currency}${g.remainingAmount.toLocaleString()}`
            })),
            actionPlan: [
                `Record your daily expenses for ${monthLabel} to unlock detailed category analytics.`,
                `Commit to your "Save First" target of ${currency}${savingsTarget.toLocaleString()} early in the month.`,
                'Review your category budget limits before making discretionary purchases.'
            ],
            insights: [
                `No expenses recorded for ${monthLabel}.`,
                `Monthly savings target is ${currency}${savingsTarget.toLocaleString()} (${targetSavingsRate}% of income).`
            ],
            recommendations: [
                'Log your everyday transactions to keep your financial metrics up-to-date.',
                'Follow the Save First rule by allocating to savings before spending.'
            ],
            goalAdvice: goals.length > 0
                ? goals.map(g => `${g.title}: ${g.progressPercentage}% achieved.`)
                : ['Configure an Emergency Fund goal to build a strong safety net.'],
            disclaimer: 'SaveWise AI Financial Coach insights are for educational and informational purposes only and do not constitute certified financial advice.'
        };
    }
    // 1. Executive Summary
    let summary = '';
    if (remainingBudget >= 0) {
        summary = `In ${monthLabel}, you earned ${currency}${income.toLocaleString()}, spent ${currency}${totalExpenses.toLocaleString()}, and successfully retained ${currency}${actualSavings.toLocaleString()} (${savingsRate}% savings rate). You are currently within your spending budget with ${currency}${remainingBudget.toLocaleString()} remaining.`;
    }
    else {
        summary = `In ${monthLabel}, you spent ${currency}${totalExpenses.toLocaleString()} from a spending budget of ${currency}${(income - savingsTarget).toLocaleString()}, exceeding your limit by ${currency}${Math.abs(remainingBudget).toLocaleString()}. Your actual savings stand at ${currency}${actualSavings.toLocaleString()} (${savingsRate}%).`;
    }
    // 2. Financial Summary Highlights
    const earnedText = `Earned ${currency}${income.toLocaleString()} in ${monthLabel}`;
    const spentText = `Spent ${currency}${totalExpenses.toLocaleString()} across ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}`;
    const savedText = `Retained ${currency}${actualSavings.toLocaleString()} (${savingsRate}% savings rate)`;
    let targetStatusText = '';
    if (savingsTarget <= 0) {
        targetStatusText = 'No monthly savings target set in profile';
    }
    else if (isOnTrackForTarget) {
        targetStatusText = `On track for your ${currency}${savingsTarget.toLocaleString()} savings target with a ${currency}${savingsDifference.toLocaleString()} surplus`;
    }
    else {
        targetStatusText = `Currently ${currency}${Math.abs(savingsDifference).toLocaleString()} below your ${currency}${savingsTarget.toLocaleString()} savings target`;
    }
    let momChangeText = '';
    if (previousMonthComparison.hasData) {
        const diffAbs = Math.abs(previousMonthComparison.expensesDiff);
        if (previousMonthComparison.trend === 'INCREASED') {
            momChangeText = `Spending increased by ${previousMonthComparison.expensesPctChange}% (${currency}${diffAbs.toLocaleString()}) vs ${previousMonthComparison.previousMonthLabel}`;
        }
        else if (previousMonthComparison.trend === 'DECREASED') {
            momChangeText = `Spending decreased by ${previousMonthComparison.expensesPctChange}% (${currency}${diffAbs.toLocaleString()}) vs ${previousMonthComparison.previousMonthLabel}`;
        }
        else {
            momChangeText = `Spending is virtually unchanged compared with ${previousMonthComparison.previousMonthLabel}`;
        }
    }
    else {
        momChangeText = 'First month of tracked spending data';
    }
    // 3. Spending Analysis
    const topCat = spendingAnalysis.topCategory;
    const topCatOverview = topCat
        ? `Your largest spending category is ${topCat.name}, accounting for ${currency}${topCat.amount.toLocaleString()} (${topCat.percentage}% of all expenses).`
        : `Total spending is spread across ${spendingAnalysis.categories.length} categories.`;
    const topCategoryInsights = [];
    spendingAnalysis.categories.slice(0, 3).forEach((c) => {
        let catText = `${c.name}: ${currency}${c.amount.toLocaleString()} (${c.percentage}% of total)`;
        if (c.previousAmount > 0) {
            if (c.trend === 'INCREASED') {
                catText += ` • Up by ${currency}${c.changeAmount.toLocaleString()} (${c.changePercentage}%) vs last month`;
            }
            else if (c.trend === 'DECREASED') {
                catText += ` • Down by ${currency}${Math.abs(c.changeAmount).toLocaleString()} (${Math.abs(c.changePercentage)}%) vs last month`;
            }
        }
        topCategoryInsights.push(catText);
    });
    const unnecessarySpending = [];
    spendingAnalysis.categories.forEach((c) => {
        if (['Shopping', 'Entertainment', 'Other'].includes(c.name) && c.amount > 0) {
            unnecessarySpending.push(`${c.name} spending stands at ${currency}${c.amount.toLocaleString()} (${c.percentage}% of expenses). Discretionary purchases here can be trimmed.`);
        }
        else if (c.status === 'OVER_BUDGET') {
            unnecessarySpending.push(`${c.name} is over budget by ${currency}${Math.abs((c.budget || 0) - c.amount).toLocaleString()}. Review recent transactions to pause optional spending.`);
        }
    });
    // 4. Warnings
    const warnings = [];
    if (remainingBudget < 0) {
        warnings.push(`Monthly spending budget exceeded by ${currency}${Math.abs(remainingBudget).toLocaleString()}. Curb non-essential purchases immediately.`);
    }
    if (!isOnTrackForTarget && savingsTarget > 0) {
        warnings.push(`Savings target is at risk: You have a ${currency}${Math.abs(savingsDifference).toLocaleString()} shortfall against your ${currency}${savingsTarget.toLocaleString()} goal.`);
    }
    spendingAnalysis.categories.forEach((c) => {
        if (c.status === 'OVER_BUDGET') {
            warnings.push(`${c.name} has exceeded its budget ceiling.`);
        }
        else if (c.percentage > 35 && c.name !== 'Housing') {
            warnings.push(`${c.name} absorbs ${c.percentage}% of your entire monthly spending.`);
        }
    });
    budgetWarnings.forEach((w) => {
        if (!warnings.includes(w))
            warnings.push(w);
    });
    // 5. Save More Money Opportunities (Grounded in real numbers)
    const saveMoreOpportunities = savingsOpportunities.map((opp) => ({
        category: opp.category,
        insight: `Your ${opp.category} spending is ${currency}${opp.currentAmount.toLocaleString()} (${opp.reason}). Reducing ${opp.category} spending by ${currency}${opp.suggestedReduction.toLocaleString()} this month would increase your expected savings from ${currency}${opp.currentActualSavings.toLocaleString()} to ${currency}${opp.newProjectedSavings.toLocaleString()}.`,
        suggestedCut: opp.suggestedReduction,
        potentialSavings: opp.potentialSavingsIncrease,
        projectedSavingsTotal: opp.newProjectedSavings
    }));
    // If no opportunities were automatically generated, construct one from top category
    if (saveMoreOpportunities.length === 0 && topCat && topCat.amount > 100) {
        const cut = Math.round(topCat.amount * 0.15);
        saveMoreOpportunities.push({
            category: topCat.name,
            insight: `Trimming ${topCat.name} spending by 15% (${currency}${cut.toLocaleString()}) would increase your monthly savings from ${currency}${actualSavings.toLocaleString()} to ${currency}${(actualSavings + cut).toLocaleString()}.`,
            suggestedCut: cut,
            potentialSavings: cut,
            projectedSavingsTotal: actualSavings + cut
        });
    }
    // 6. Goal Progress
    const goalProgress = goals.map((g) => {
        let advice = '';
        if (g.isCompleted) {
            advice = 'Milestone achieved! Celebrate and direct future monthly surplus toward your next priority.';
        }
        else if (g.estimatedMonths !== Infinity && g.estimatedMonths > 0) {
            advice = `At your planned contribution rate, you will reach this goal in approximately ${g.estimatedMonths} month${g.estimatedMonths === 1 ? '' : 's'}.`;
        }
        else {
            advice = `Allocate a portion of your ${currency}${actualSavings > 0 ? actualSavings.toLocaleString() : 'monthly'} savings to speed up completion.`;
        }
        return {
            goalTitle: g.title,
            progressText: `${g.progressPercentage}% achieved (${currency}${g.currentAmount.toLocaleString()} of ${currency}${g.targetAmount.toLocaleString()})`,
            advice
        };
    });
    // 7. Action Plan (Exactly 3-5 concrete steps)
    const actionPlan = [];
    if (saveMoreOpportunities.length > 0) {
        const primaryOpp = saveMoreOpportunities[0];
        actionPlan.push(`Cap ${primaryOpp.category} spending to save an extra ${currency}${(primaryOpp.potentialSavings || 0).toLocaleString()} this month.`);
    }
    if (!isOnTrackForTarget && savingsTarget > 0) {
        actionPlan.push(`Close the ${currency}${Math.abs(savingsDifference).toLocaleString()} savings target gap by limiting discretionary shopping and entertainment.`);
    }
    else if (savingsTarget > 0) {
        actionPlan.push(`Transfer your ${currency}${savingsTarget.toLocaleString()} savings target to an interest-bearing account or emergency fund immediately.`);
    }
    if (goals.some((g) => !g.isCompleted)) {
        const nextGoal = goals.find((g) => !g.isCompleted);
        actionPlan.push(`Make a progress contribution toward your "${nextGoal?.title}" goal before the end of the month.`);
    }
    if (spendingAnalysis.categories.some((c) => c.status === 'OVER_BUDGET')) {
        const overCat = spendingAnalysis.categories.find((c) => c.status === 'OVER_BUDGET');
        actionPlan.push(`Freeze new spending in ${overCat?.name} until the next monthly billing cycle begins.`);
    }
    if (actionPlan.length < 3) {
        actionPlan.push('Track all expenses on the day they occur to prevent end-of-month budget surprises.');
    }
    // Legacy fields
    const insights = topCategoryInsights;
    const recommendations = saveMoreOpportunities.map(o => o.insight);
    const goalAdvice = goalProgress.map(g => `${g.goalTitle}: ${g.progressText}. ${g.advice}`);
    return {
        summary,
        financialSummary: {
            earnedText,
            spentText,
            savedText,
            targetStatusText,
            momChangeText
        },
        spendingAnalysis: {
            overview: topCatOverview,
            topCategoryInsights,
            unnecessarySpending
        },
        warnings,
        saveMoreOpportunities,
        goalProgress,
        actionPlan: actionPlan.slice(0, 5),
        insights,
        recommendations,
        goalAdvice,
        disclaimer: 'SaveWise AI Financial Coach insights are for educational and informational purposes only and do not constitute certified financial advice.'
    };
}
