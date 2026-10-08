"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetalAnalysisAiService = void 0;
const genai_1 = require("@google/genai");
const env_1 = require("../config/env");
class MetalAnalysisAiService {
    static aiClient = null;
    static getClient() {
        if (!this.aiClient && env_1.config.geminiApiKey && env_1.config.geminiApiKey !== 'your_gemini_api_key_here') {
            try {
                this.aiClient = new genai_1.GoogleGenAI({ apiKey: env_1.config.geminiApiKey });
            }
            catch (err) {
                console.warn('[Gemini Metal Analysis] Failed to initialize GoogleGenAI client:', err);
            }
        }
        return this.aiClient;
    }
    /**
     * Generates Gemini AI trend analysis and educational recommendation for Gold or Silver.
     */
    static async analyzeMetal(input) {
        const client = this.getClient();
        if (!client) {
            console.log('[Gemini Metal Analysis] No Gemini API key. Using deterministic educational analysis engine.');
            return this.generateDeterministicAnalysis(input);
        }
        try {
            const intentionContext = input.intention === 'BUY_ON_FALL'
                ? `The user's intention is to "BUY WHEN PRICE FALLS" (target entry: ${input.currency} ${input.targetPrice ?? 'unspecified'}). They want to accumulate precious metals when the price dips.`
                : input.intention === 'MONITOR_GROWTH'
                    ? `The user's intention is to "MONITOR EXISTING INVESTMENT & NOTIFY WHEN PRICE RISES" (target profit: ${input.currency} ${input.targetPrice ?? 'unspecified'}). They already hold an investment and want to track growth.`
                    : `The user wants general market monitoring.`;
            const prompt = `
You are the SaveWise AI Commodities & Precious Metals Analyst, providing educational market insights and trend analysis.

CRITICAL PRODUCT RULES:
1. Grounding: Rely strictly on the real market figures provided. Do NOT invent prices or imaginary historical rates.
2. Educational Only: DO NOT provide certified financial advice or tell the user to execute financial transactions. Do NOT guarantee future profits.
3. User Intention Context: Tailor the explanation and educational recommendation to the user's specific strategy (${input.intention || 'MARKET_MONITORING'}).
4. Output strictly valid JSON matching this schema:
{
  "trend": "BULLISH" | "BEARISH" | "NEUTRAL",
  "summary": "1-2 sentences summarizing current price momentum and short-term behavior",
  "explanation": "Clear explanation of factors influencing precious metal moves (e.g. inflation hedging, safe-haven demand, central bank buying, dollar strength)",
  "recommendation": "Educational perspective tailored to the user's strategy without giving financial advice",
  "educationalTakeaway": "Key educational concept about precious metals (e.g. historical volatility, gold as inflation hedge, silver industrial demand)",
  "disclaimer": "Educational market insights powered by SaveWise AI. Does not constitute financial or investment advice."
}

REAL MARKET DATA CONTEXT:
- Asset: ${input.metal} (${input.symbol}/${input.currency})
- Current Real-time Price: ${input.currency} ${input.price.toFixed(2)} per Troy Ounce
- 24h Price Change: ${input.change >= 0 ? '+' : ''}${input.change.toFixed(2)} (${input.percentChange >= 0 ? '+' : ''}${input.percentChange.toFixed(2)}%)
- 24h High: ${input.currency} ${input.high.toFixed(2)}
- 24h Low: ${input.currency} ${input.low.toFixed(2)}
${input.priceGram24k ? `- 24K Price per Gram: ${input.currency} ${input.priceGram24k.toFixed(2)}` : ''}
${input.priceGram22k ? `- 22K Price per Gram: ${input.currency} ${input.priceGram22k.toFixed(2)}` : ''}
- User Strategy Context: ${intentionContext}
`;
            const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
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
                    console.warn(`[Gemini Metal Analysis] Model ${model} unavailable (${modelErr?.message || modelErr}), trying fallback model...`);
                }
            }
            if (!responseText) {
                throw new Error('All Gemini models unavailable or rate limited');
            }
            const parsed = JSON.parse(responseText.trim());
            const trend = ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(parsed.trend)
                ? parsed.trend
                : input.percentChange > 0.3
                    ? 'BULLISH'
                    : input.percentChange < -0.3
                        ? 'BEARISH'
                        : 'NEUTRAL';
            return {
                trend,
                summary: parsed.summary || `${input.metal} is trading at $${input.price.toFixed(2)} with a ${input.percentChange.toFixed(2)}% move today.`,
                explanation: parsed.explanation || 'Market volatility is driven by global macro factors and currency fluctuations.',
                recommendation: parsed.recommendation || 'Maintain disciplined position sizing and monitor key support and resistance zones.',
                educationalTakeaway: parsed.educationalTakeaway || 'Precious metals are historically considered portfolio diversifiers.',
                disclaimer: parsed.disclaimer || 'Educational market insights powered by SaveWise AI. Does not constitute financial advice.',
                analyzedAt: new Date()
            };
        }
        catch (err) {
            console.warn('[Gemini Metal Analysis] Gemini API encountered error, smoothly switching to deterministic educational analysis engine:', err?.message || err);
            return this.generateDeterministicAnalysis(input);
        }
    }
    /**
     * High-quality deterministic educational trend engine grounded in real price data.
     * Ensures uninterrupted service if Gemini is experiencing high demand / 503.
     */
    static generateDeterministicAnalysis(input) {
        const isGold = input.symbol === 'XAU';
        const metalName = isGold ? 'Gold' : 'Silver';
        const pct = input.percentChange;
        const priceStr = `${input.currency} ${input.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const targetStr = input.targetPrice ? `${input.currency} ${input.targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
        let trend = 'NEUTRAL';
        if (pct >= 0.25)
            trend = 'BULLISH';
        else if (pct <= -0.25)
            trend = 'BEARISH';
        let summary = '';
        let explanation = '';
        let recommendation = '';
        let educationalTakeaway = '';
        if (trend === 'BULLISH') {
            summary = `${metalName} exhibits upward momentum, trading at ${priceStr} (+${pct.toFixed(2)}% today) with buyers defending intraday pullbacks.`;
            explanation = isGold
                ? `Gold gains are often supported by safe-haven capital inflows, steady physical demand, and expectations of central bank liquidity easing.`
                : `Silver upside is typically accelerated by dual tailwinds: industrial demand (photovoltaics/electronics) alongside general precious metal momentum.`;
        }
        else if (trend === 'BEARISH') {
            summary = `${metalName} is testing lower support, hovering around ${priceStr} (${pct.toFixed(2)}% today) amidst short-term selling pressure.`;
            explanation = isGold
                ? `Gold retracements frequently coincide with rising real bond yields, a strengthening US Dollar, or profit-taking following multi-week rallies.`
                : `Silver tends to carry higher beta (volatility) than gold, meaning pullbacks can be sharper during risk-off or liquidity contractions.`;
        }
        else {
            summary = `${metalName} is consolidating in a neutral range around ${priceStr} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% today) as buyers and sellers seek equilibrium.`;
            explanation = `Consolidation periods occur when market participants digest recent economic data (inflation prints, interest rate decisions) before committing to a decisive trend.`;
        }
        // Tailor educational recommendation according to user intention
        if (input.intention === 'BUY_ON_FALL') {
            if (targetStr) {
                recommendation = `You are targeting a purchase at ${targetStr}. With current price at ${priceStr}, disciplined dollar-cost averaging (DCA) and patience avoid the temptation of FOMO (fear of missing out) on temporary rallies.`;
            }
            else {
                recommendation = `Since your intention is to buy during dips, wait for clear price stabilization near key support zones rather than attempting to catch sharp downward moves prematurely.`;
            }
        }
        else if (input.intention === 'MONITOR_GROWTH') {
            if (targetStr) {
                recommendation = `You are tracking your holding toward ${targetStr}. Monitor whether current momentum sustains past previous 24h highs (${input.currency} ${input.high.toFixed(2)}) while keeping your overall investment horizon long-term.`;
            }
            else {
                recommendation = `Since you are monitoring existing holdings, evaluate performance against your broader financial portfolio and consider periodic rebalancing rather than emotional reactions.`;
            }
        }
        else {
            recommendation = `Monitor price action relative to the 24-hour range (${input.currency} ${input.low.toFixed(2)} - ${input.currency} ${input.high.toFixed(2)}) and keep position sizing aligned with your personal risk tolerance.`;
        }
        educationalTakeaway = isGold
            ? `Educational Insight: Gold has preserved purchasing power across millennia and typically behaves with low correlation to equities during systemic market stress.`
            : `Educational Insight: Silver acts as both a monetary metal and an indispensable green-tech industrial commodity, leading to wider price swings than gold.`;
        return {
            trend,
            summary,
            explanation,
            recommendation,
            educationalTakeaway,
            disclaimer: 'Educational market insights powered by SaveWise AI. Does not constitute financial or investment advice.',
            analyzedAt: new Date()
        };
    }
}
exports.MetalAnalysisAiService = MetalAnalysisAiService;
