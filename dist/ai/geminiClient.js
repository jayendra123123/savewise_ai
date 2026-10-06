"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiFinancialCoach = void 0;
const genai_1 = require("@google/genai");
const env_1 = require("../config/env");
const aiTypes_1 = require("./aiTypes");
const fallbackCoach_1 = require("./fallbackCoach");
class GeminiFinancialCoach {
    static aiClient = null;
    static getClient() {
        if (!this.aiClient && env_1.config.geminiApiKey && env_1.config.geminiApiKey !== 'your_gemini_api_key_here') {
            try {
                this.aiClient = new genai_1.GoogleGenAI({ apiKey: env_1.config.geminiApiKey });
            }
            catch (err) {
                console.warn('[Gemini Client] Failed to initialize GoogleGenAI client:', err);
            }
        }
        return this.aiClient;
    }
    static async generateCoaching(snapshot) {
        const client = this.getClient();
        if (!client) {
            console.log('[Gemini Financial Coach] No valid API key provided. Using rule-grounded financial coach engine.');
            return (0, fallbackCoach_1.generateFallbackFinancialInsights)(snapshot);
        }
        try {
            const prompt = `
You are the SaveWise AI Financial Coach, a friendly, encouraging, and financially prudent personal financial assistant.
Our core product philosophy is:
INCOME -> SAVE FIRST -> CONTROL SPENDING -> ANALYZE -> IMPROVE -> REACH FINANCIAL GOALS.

CRITICAL INSTRUCTIONS:
1. Grounding: Do NOT invent or alter financial figures. Use ONLY the backend-calculated numbers provided in the context snapshot.
2. Tone: Clear, direct, empathetic, and actionable. Avoid banking jargon.
3. If hasTransactions is false, provide a warm explanation that no expenses are logged for this month yet and invite the user to log their first expense.
4. If transactions exist, output strictly valid JSON matching this schema:
{
  "summary": "Concise executive overview of the month",
  "financialSummary": {
    "earnedText": "e.g. Earned ₹30,000 this month",
    "spentText": "e.g. Spent ₹12,400 across 8 transactions",
    "savedText": "e.g. Retained ₹17,600 (58.7% savings rate)",
    "targetStatusText": "e.g. On track for your ₹10,000 target with a ₹7,600 surplus",
    "momChangeText": "e.g. Spending decreased by 12% (₹1,500) vs last month"
  },
  "spendingAnalysis": {
    "overview": "Detailed overview of where most money went",
    "topCategoryInsights": ["Insight on category 1 with amounts", "Insight on category 2..."],
    "unnecessarySpending": ["Specific reducible or discretionary spending callouts..."]
  },
  "warnings": ["Warning for over-budget or high-risk categories..."],
  "saveMoreOpportunities": [
    {
      "category": "Food",
      "insight": "Your Food spending increased by ₹800 compared with last month. Reducing Food spending by ₹500 this month would increase your expected savings from ₹8,000 to ₹8,500.",
      "suggestedCut": 500,
      "potentialSavings": 500,
      "projectedSavingsTotal": 8500
    }
  ],
  "goalProgress": [
    {
      "goalTitle": "Emergency Fund",
      "progressText": "60% completed (₹30,000 of ₹50,000)",
      "advice": "At your current pace, you will reach this goal in 4 months."
    }
  ],
  "actionPlan": [
    "Practical action 1",
    "Practical action 2",
    "Practical action 3"
  ],
  "insights": ["General key takeaway 1", "General key takeaway 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "goalAdvice": ["Goal takeaway 1"],
  "disclaimer": "SaveWise AI Financial Coach insights are for educational and informational purposes only and do not constitute certified financial advice."
}

FINANCIAL DATA CONTEXT:
${JSON.stringify(snapshot, null, 2)}
`;
            const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
            let responseText;
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
                        responseText = response.text;
                        break;
                    }
                }
                catch (modelErr) {
                    console.warn(`[Gemini Financial Coach] Model ${model} unavailable (${modelErr?.message || modelErr}), trying fallback model...`);
                }
            }
            if (!responseText) {
                throw new Error('All Gemini models unavailable or returned 503');
            }
            // Parse and validate response with Zod
            const parsed = JSON.parse(responseText.trim());
            const validated = aiTypes_1.AiCoachResponseSchema.parse(parsed);
            return validated;
        }
        catch (err) {
            console.warn('[Gemini Financial Coach] Gemini API error or timeout, smoothly switching to fallback coach engine:', err);
            return (0, fallbackCoach_1.generateFallbackFinancialInsights)(snapshot);
        }
    }
}
exports.GeminiFinancialCoach = GeminiFinancialCoach;
