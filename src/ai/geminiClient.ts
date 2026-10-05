import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env';
import {
  FinancialContextSnapshot,
  AiCoachResponse,
  AiCoachResponseSchema
} from './aiTypes';
import { generateFallbackFinancialInsights } from './fallbackCoach';

export class GeminiFinancialCoach {
  private static aiClient: GoogleGenAI | null = null;

  private static getClient(): GoogleGenAI | null {
    if (!this.aiClient && config.geminiApiKey && config.geminiApiKey !== 'your_gemini_api_key_here') {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
      } catch (err) {
        console.warn('[Gemini Client] Failed to initialize GoogleGenAI client:', err);
      }
    }
    return this.aiClient;
  }

  static async generateCoaching(
    snapshot: FinancialContextSnapshot
  ): Promise<AiCoachResponse> {
    const client = this.getClient();

    if (!client) {
      console.log('[Gemini Financial Coach] No valid API key provided. Using rule-grounded financial coach engine.');
      return generateFallbackFinancialInsights(snapshot);
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

      const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
      let responseText: string | undefined;

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
        } catch (modelErr: any) {
          console.warn(
            `[Gemini Financial Coach] Model ${model} unavailable (${modelErr?.message || modelErr}), trying fallback model...`
          );
        }
      }

      if (!responseText) {
        throw new Error('All Gemini models unavailable or returned 503');
      }

      // Parse and validate response with Zod
      const parsed = JSON.parse(responseText.trim());
      const validated = AiCoachResponseSchema.parse(parsed);
      return validated;
    } catch (err) {
      console.warn(
        '[Gemini Financial Coach] Gemini API error or timeout, smoothly switching to fallback coach engine:',
        err
      );
      return generateFallbackFinancialInsights(snapshot);
    }
  }
}
