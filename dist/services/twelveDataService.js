"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwelveDataService = exports.TwelveDataLimitReachedError = void 0;
const https_1 = __importDefault(require("https"));
const env_1 = require("../config/env");
const TwelveDataUsage_1 = require("../models/TwelveDataUsage");
class TwelveDataLimitReachedError extends Error {
    status;
    details;
    constructor(message, details) {
        super(message);
        this.name = 'TwelveDataLimitReachedError';
        this.status = 429;
        this.details = details;
    }
}
exports.TwelveDataLimitReachedError = TwelveDataLimitReachedError;
// Realistic baseline stock quotes for graceful fallback if no API key is provided or limit is paused
const FALLBACK_STOCK_CATALOG = {
    AAPL: { name: 'Apple Inc.', price: 333.70, change: 0.81, percentChange: 0.24, high: 334.33, low: 330.64 },
    MSFT: { name: 'Microsoft Corporation', price: 418.50, change: 1.75, percentChange: 0.42, high: 421.10, low: 416.20 },
    GOOGL: { name: 'Alphabet Inc.', price: 168.40, change: 0.85, percentChange: 0.51, high: 169.50, low: 167.20 },
    AMZN: { name: 'Amazon.com, Inc.', price: 185.30, change: 1.10, percentChange: 0.60, high: 186.50, low: 183.90 },
    NVDA: { name: 'NVIDIA Corporation', price: 124.60, change: 3.20, percentChange: 2.64, high: 126.00, low: 122.10 },
    TSLA: { name: 'Tesla, Inc.', price: 250.20, change: -4.10, percentChange: -1.61, high: 255.00, low: 248.00 },
    META: { name: 'Meta Platforms, Inc.', price: 585.40, change: 4.80, percentChange: 0.83, high: 588.00, low: 580.20 }
};
function httpsGetJson(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https_1.default.get(url, { headers, timeout: 8000 }, (res) => {
            let raw = '';
            res.on('data', (chunk) => { raw += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(raw);
                    resolve({ status: res.statusCode || 200, data: parsed, headers: res.headers });
                }
                catch {
                    reject(new Error(`Failed to parse JSON from ${url}: ${raw.slice(0, 100)}`));
                }
            });
        });
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`HTTPS request to ${url} timed out after 8000ms`));
        });
        req.on('error', (err) => reject(err));
    });
}
class TwelveDataService {
    static baseUrl = 'https://api.twelvedata.com';
    /**
     * Calculates the exact credit cost based on endpoint and symbol count.
     * Endpoint /price or /quote: 1 credit per symbol.
     */
    static calculateRequestCost(endpoint, symbols) {
        const symbolCount = Math.max(1, symbols.length);
        // Twelve Data charges 1 credit per symbol for quote / price endpoints
        return symbolCount * 1;
    }
    /**
     * Fetches real-time stock price from Twelve Data with strict 700-credit application limit enforcement.
     */
    static async getStockPrice(symbol) {
        const cleanSymbol = symbol.trim().toUpperCase();
        const cost = this.calculateRequestCost('quote', [cleanSymbol]);
        // 1. Concurrency-safe atomic reservation against the strict 700-credit daily limit
        const reservation = await TwelveDataUsage_1.TwelveDataUsageManager.reserveCredits(cost);
        if (!reservation.allowed) {
            console.warn(`[Twelve Data Safety Limit] Request blocked! Current usage: ${reservation.currentUsage}/${reservation.limit} credits. Blocked requests count: ${reservation.blockedRequests}.`);
            throw new TwelveDataLimitReachedError('Twelve Data daily limit reached. Market-data requests are paused until the next UTC day.', reservation);
        }
        // 2. Check if a valid API key is present
        const apiKey = env_1.config.twelveDataApiKey;
        if (!apiKey || apiKey === 'your_twelve_data_api_key_here') {
            console.log(`[Twelve Data] No API key configured. Using baseline reference rate for ${cleanSymbol}.`);
            return this.getFallbackPrice(cleanSymbol, cost);
        }
        // 3. Make the API request to Twelve Data using robust HTTPS client
        try {
            const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(cleanSymbol)}&apikey=${encodeURIComponent(apiKey)}`;
            const { status, data, headers } = await httpsGetJson(url, { 'Accept': 'application/json' });
            // Extract and reconcile credit headers if provided by Twelve Data server
            const creditsUsedHeader = headers['api-credits-used'];
            const creditsLeftHeader = headers['api-credits-left'];
            await TwelveDataUsage_1.TwelveDataUsageManager.reconcileHeaders(creditsUsedHeader, creditsLeftHeader);
            if (status === 429) {
                const errorMsg = 'Twelve Data returned 429 Too Many Requests';
                await TwelveDataUsage_1.TwelveDataUsageManager.recordError(errorMsg);
                console.warn(`[Twelve Data] 429 rate limit reached. Reverting to fallback for ${cleanSymbol}.`);
                return this.getFallbackPrice(cleanSymbol, cost);
            }
            if (status !== 200 || !data) {
                await TwelveDataUsage_1.TwelveDataUsageManager.recordError(`HTTP ${status} response from Twelve Data`);
                return this.getFallbackPrice(cleanSymbol, cost);
            }
            // Check for Twelve Data error status payload
            if (data.status === 'error' || data.code === 429) {
                await TwelveDataUsage_1.TwelveDataUsageManager.recordError(data.message || 'API error payload');
                console.warn(`[Twelve Data] API returned error: ${data.message}`);
                return this.getFallbackPrice(cleanSymbol, cost);
            }
            const price = parseFloat(data.close || data.price || '0');
            const change = parseFloat(data.change || '0');
            const percentChange = parseFloat(data.percent_change || '0');
            const high = parseFloat(data.high || '0');
            const low = parseFloat(data.low || '0');
            return {
                symbol: cleanSymbol,
                name: data.name || cleanSymbol,
                price: isNaN(price) ? 100 : price,
                change: isNaN(change) ? 0 : change,
                percentChange: isNaN(percentChange) ? 0 : percentChange,
                high: isNaN(high) ? price : high,
                low: isNaN(low) ? price : low,
                currency: data.currency || 'USD',
                source: 'TWELVE_DATA',
                creditsUsedThisRequest: cost
            };
        }
        catch (err) {
            console.warn(`[Twelve Data] Network request failed for ${cleanSymbol}:`, err?.message || err);
            await TwelveDataUsage_1.TwelveDataUsageManager.recordError(err?.message || 'Network error');
            return this.getFallbackPrice(cleanSymbol, cost);
        }
    }
    /**
     * Fetches batch prices for multiple stock symbols.
     * Atomic cost = symbols.length credits.
     */
    static async getBatchStockPrices(symbols) {
        const cleanSymbols = Array.from(new Set(symbols.map(s => s.trim().toUpperCase()))).filter(Boolean);
        if (cleanSymbols.length === 0)
            return [];
        const cost = this.calculateRequestCost('quote', cleanSymbols);
        const reservation = await TwelveDataUsage_1.TwelveDataUsageManager.reserveCredits(cost);
        if (!reservation.allowed) {
            console.warn(`[Twelve Data Safety Limit] Batch request blocked! Required: ${cost} credits. Current usage: ${reservation.currentUsage}/${reservation.limit}.`);
            throw new TwelveDataLimitReachedError('Twelve Data daily limit reached. Market-data requests are paused until the next UTC day.', reservation);
        }
        const apiKey = env_1.config.twelveDataApiKey;
        if (!apiKey || apiKey === 'your_twelve_data_api_key_here') {
            return cleanSymbols.map(sym => this.getFallbackPrice(sym, 1));
        }
        try {
            const symbolsParam = cleanSymbols.join(',');
            const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(symbolsParam)}&apikey=${encodeURIComponent(apiKey)}`;
            const { status, data, headers } = await httpsGetJson(url, { 'Accept': 'application/json' });
            const creditsUsedHeader = headers['api-credits-used'];
            const creditsLeftHeader = headers['api-credits-left'];
            await TwelveDataUsage_1.TwelveDataUsageManager.reconcileHeaders(creditsUsedHeader, creditsLeftHeader);
            if (status !== 200 || !data) {
                await TwelveDataUsage_1.TwelveDataUsageManager.recordError(`HTTP ${status} in batch request`);
                return cleanSymbols.map(sym => this.getFallbackPrice(sym, 1));
            }
            const results = [];
            for (const sym of cleanSymbols) {
                const item = data[sym] || (cleanSymbols.length === 1 ? data : null);
                if (item && item.status !== 'error') {
                    const price = parseFloat(item.close || item.price || '0');
                    const change = parseFloat(item.change || '0');
                    const percentChange = parseFloat(item.percent_change || '0');
                    const high = parseFloat(item.high || '0');
                    const low = parseFloat(item.low || '0');
                    results.push({
                        symbol: sym,
                        name: item.name || sym,
                        price: isNaN(price) ? 100 : price,
                        change: isNaN(change) ? 0 : change,
                        percentChange: isNaN(percentChange) ? 0 : percentChange,
                        high: isNaN(high) ? price : high,
                        low: isNaN(low) ? price : low,
                        currency: item.currency || 'USD',
                        source: 'TWELVE_DATA',
                        creditsUsedThisRequest: 1
                    });
                }
                else {
                    results.push(this.getFallbackPrice(sym, 1));
                }
            }
            return results;
        }
        catch (err) {
            await TwelveDataUsage_1.TwelveDataUsageManager.recordError(err?.message || 'Batch network error');
            return cleanSymbols.map(sym => this.getFallbackPrice(sym, 1));
        }
    }
    /**
     * Helper that returns reliable baseline market data.
     */
    static getFallbackPrice(symbol, cost = 0) {
        const known = FALLBACK_STOCK_CATALOG[symbol];
        if (known) {
            return {
                symbol,
                name: known.name,
                price: known.price,
                change: known.change,
                percentChange: known.percentChange,
                high: known.high,
                low: known.low,
                currency: 'USD',
                source: 'FALLBACK',
                creditsUsedThisRequest: cost
            };
        }
        return {
            symbol,
            name: `${symbol} Equity`,
            price: 150.00,
            change: 0.50,
            percentChange: 0.33,
            high: 152.00,
            low: 149.00,
            currency: 'USD',
            source: 'FALLBACK',
            creditsUsedThisRequest: cost
        };
    }
}
exports.TwelveDataService = TwelveDataService;
