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
1. AI must NOT invent or change financial numbers. The numbers provided below are the single source of truth.
2. Tone: Conversational, simple, direct, empathetic. Avoid wall street or banking jargon.
3. Identify: Highest spending category, overspending or budget risks, savings performance against target, goal progress.
4. Output MUST be strictly valid JSON matching this schema:
{
  "summary": "...",
  "insights": ["...", "..."],
  "warnings": ["..."],
  "recommendations": ["...", "..."],
  "goalAdvice": ["..."],
  "disclaimer": "AI insights are for educational and informational purposes only and are not professional financial advice."
}

FINANCIAL DATA CONTEXT:
${JSON.stringify(snapshot, null, 2)}
`;
            const response = await client.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json'
                }
            });
            const responseText = response.text;
            if (!responseText) {
                throw new Error('Empty response from Gemini API');
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
