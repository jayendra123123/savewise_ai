import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { config } from '../config/env';

export const MonthlyAiAnalysisSchema = z.object({
  summary: z.string(),
  biggestSpendingArea: z.string(),
  biggestChanges: z.array(z.string()).default([]),
  positiveBehavior: z.array(z.string()).default([]),
  concerns: z.array(z.string()).default([]),
  savingsOpportunities: z.array(z.string()).default([]),
  budgetRecommendations: z.array(z.string()).default([]),
  actionableTips: z.array(z.string()).default([]),
  disclaimer: z
    .string()
    .default(
      'AI insights are for educational and informational purposes only and are not professional financial advice.'
    )
});

export type MonthlyAiAnalysisResponse = z.infer<typeof MonthlyAiAnalysisSchema>;

export interface MonthlyAnalysisContextSnapshot {
  selectedMonth: string;
  monthLabel: string;
  currency: string;
  currentMonth: {
    income: number;
    savingsTarget: number;
    totalExpenses: number;
    remainingBudget: number;
    actualSavings: number;
    savingsRate: number;
    transactionCount: number;
  };
  previousMonth: {
    income: number;
    totalExpenses: number;
    actualSavings: number;
    hasData: boolean;
  };
  spendingDifference: {
    difference: number;
    percentageChange: number;
    trend: 'INCREASED' | 'DECREASED' | 'UNCHANGED';
  };
  topCategory: {
    category: string;
    amount: number;
    percentage: number;
  } | null;
  categoryComparison: Array<{
    category: string;
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
  }>;
  topExpenses: Array<{
    description: string;
    amount: number;
    category: string;
  }>;
}

export class MonthlyAnalysisAi {
  private static aiClient: GoogleGenAI | null = null;

  private static getClient(): GoogleGenAI | null {
    if (
      !this.aiClient &&
      config.geminiApiKey &&
      config.geminiApiKey !== 'your_gemini_api_key_here'
    ) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
      } catch (err) {
        console.warn('[MonthlyAnalysisAi] Failed to initialize GoogleGenAI:', err);
      }
    }
    return this.aiClient;
  }

  static generateFallbackAnalysis(
    snapshot: MonthlyAnalysisContextSnapshot
  ): MonthlyAiAnalysisResponse {
    const {
      currency,
      monthLabel,
      currentMonth,
      previousMonth,
      spendingDifference,
      topCategory,
      categoryComparison
    } = snapshot;

    const diffAbs = Math.abs(spendingDifference.difference);
    let summary = '';
    if (spendingDifference.trend === 'INCREASED') {
      summary = `In ${monthLabel}, your total spending increased by ${spendingDifference.percentageChange}% (${currency}${diffAbs.toLocaleString()}) compared with the previous month.`;
    } else if (spendingDifference.trend === 'DECREASED') {
      summary = `In ${monthLabel}, you reduced your spending by ${Math.abs(spendingDifference.percentageChange)}% (${currency}${diffAbs.toLocaleString()}) compared with the previous month.`;
    } else {
      summary = `In ${monthLabel}, your spending remained steady compared with the previous month at ${currency}${currentMonth.totalExpenses.toLocaleString()}.`;
    }

    const biggestSpendingArea = topCategory
      ? `${topCategory.category} was your largest expenditure area, accounting for ${currency}${topCategory.amount.toLocaleString()} (${topCategory.percentage}% of all expenses).`
      : 'No recorded spending categories for this period.';

    const biggestChanges: string[] = [];
    const significantSpikes = categoryComparison
      .filter((c) => c.change > 0 && c.changePercentage >= 15)
      .slice(0, 3);

    significantSpikes.forEach((c) => {
      biggestChanges.push(
        `${c.category} spending increased by ${c.changePercentage}% (+${currency}${c.change.toLocaleString()}).`
      );
    });

    const positiveBehavior: string[] = [];
    if (currentMonth.remainingBudget >= 0) {
      positiveBehavior.push(
        `Maintained overall spending within the monthly spending budget with ${currency}${currentMonth.remainingBudget.toLocaleString()} to spare.`
      );
    }
    if (currentMonth.actualSavings >= currentMonth.savingsTarget && currentMonth.savingsTarget > 0) {
      positiveBehavior.push(
        `Exceeded monthly savings target, retaining an estimated ${currency}${currentMonth.actualSavings.toLocaleString()} (${currentMonth.savingsRate}% savings rate).`
      );
    }
    const decreasedCats = categoryComparison.filter((c) => c.change < -100).slice(0, 2);
    decreasedCats.forEach((c) => {
      positiveBehavior.push(
        `Trimmed ${c.category} spending by ${currency}${Math.abs(c.change).toLocaleString()}.`
      );
    });

    const concerns: string[] = [];
    if (currentMonth.remainingBudget < 0) {
      concerns.push(
        `Monthly spending budget was exceeded by ${currency}${Math.abs(currentMonth.remainingBudget).toLocaleString()}.`
      );
    }
    if (currentMonth.actualSavings < currentMonth.savingsTarget && currentMonth.savingsTarget > 0) {
      concerns.push(
        `Missed monthly savings target by ${currency}${Math.abs(currentMonth.savingsTarget - currentMonth.actualSavings).toLocaleString()}.`
      );
    }

    const savingsOpportunities: string[] = [];
    if (topCategory && topCategory.percentage > 35) {
      savingsOpportunities.push(
        `Evaluating discretionary purchases in ${topCategory.category} could unlock higher monthly savings.`
      );
    }
    savingsOpportunities.push(
      `Automate a transfer of your target savings (${currency}${currentMonth.savingsTarget.toLocaleString()}) immediately when income arrives.`
    );

    const budgetRecommendations: string[] = [
      currentMonth.remainingBudget >= 0
        ? `Carry forward surplus budget to emergency fund or investment goals.`
        : `Establish strict category limits next month to reverse budget overrun.`
    ];

    const actionableTips: string[] = [
      `Review high-value transactions before confirming discretionary buys.`,
      `Track daily expenses to avoid end-of-month budget crunches.`
    ];

    return {
      summary,
      biggestSpendingArea,
      biggestChanges,
      positiveBehavior,
      concerns,
      savingsOpportunities,
      budgetRecommendations,
      actionableTips,
      disclaimer:
        'AI insights are for educational and informational purposes only and are not professional financial advice.'
    };
  }

  static async generateMonthlyAnalysis(
    snapshot: MonthlyAnalysisContextSnapshot
  ): Promise<MonthlyAiAnalysisResponse> {
    const client = this.getClient();

    if (!client) {
      return this.generateFallbackAnalysis(snapshot);
    }

    try {
      const prompt = `
You are the SaveWise AI Monthly Financial Analyst.
Analyze the following month-end financial performance data accurately and objectively.

CRITICAL FINANCIAL SAFETY RULES:
1. ONLY interpret the supplied numbers. NEVER invent transactions, amounts, or financial figures.
2. Tone: Professional, clear, concise, actionable. No financial jargon.
3. Distinguish factual observations from actionable recommendations.
4. Highlight:
   - Month-over-month spending direction (increased/decreased)
   - Highest expenditure categories
   - Major category shifts
   - Budget discipline (on track vs over budget)
   - Savings performance against target
5. Return strictly valid JSON matching this schema:
{
  "summary": "...",
  "biggestSpendingArea": "...",
  "biggestChanges": ["...", "..."],
  "positiveBehavior": ["..."],
  "concerns": ["..."],
  "savingsOpportunities": ["..."],
  "budgetRecommendations": ["..."],
  "actionableTips": ["..."],
  "disclaimer": "AI insights are for educational and informational purposes only and are not professional financial advice."
}

MONTHLY FINANCIAL DATA SNAPSHOT:
${JSON.stringify(snapshot, null, 2)}
`;

      const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
      let text: string | undefined;

      for (const model of modelsToTry) {
        try {
          const response = await client.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          });
          if (response.text) {
            text = response.text;
            break;
          }
        } catch (modelErr: any) {
          console.warn(
            `[MonthlyAnalysisAi] Model ${model} unavailable (${modelErr?.message || modelErr}), trying fallback model...`
          );
        }
      }

      if (!text) {
        throw new Error('All Gemini models unavailable or returned 503');
      }

      const parsed = JSON.parse(text.trim());
      return MonthlyAiAnalysisSchema.parse(parsed);
    } catch (err) {
      console.warn(
        '[MonthlyAnalysisAi] Gemini API call error or timeout; utilizing verified deterministic engine:',
        err
      );
      return this.generateFallbackAnalysis(snapshot);
    }
  }
}
