"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoldApiService = void 0;
const https_1 = __importDefault(require("https"));
const dns_1 = __importDefault(require("dns"));
const env_1 = require("../config/env");
const FALLBACK_METALS = {
    XAU: {
        name: 'Gold (XAU/USD)',
        price: 4165.20,
        gram24k: 133.91,
        gram22k: 122.75,
        change: 8.50,
        pct: 0.21,
        high: 4175.00,
        low: 4150.00
    },
    XAG: {
        name: 'Silver (XAG/USD)',
        price: 61.10,
        gram24k: 1.96,
        gram22k: 1.80,
        change: 0.35,
        pct: 0.58,
        high: 61.80,
        low: 60.50
    }
};
// In-memory tracking of high, low, and previous price across sessions
const sessionMetalQuotes = {};
// Public DNS resolver to prevent ISP DNS ENOTFOUND issues for api.gold-api.com
const fallbackDnsResolver = new dns_1.default.promises.Resolver();
fallbackDnsResolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
function customGoldApiLookup(hostname, options, callback) {
    let cb = callback;
    let opts = options;
    if (typeof options === 'function') {
        cb = options;
        opts = {};
    }
    const isAll = opts && opts.all;
    // 1. Try local default DNS first
    dns_1.default.lookup(hostname, opts, async (err, address, family) => {
        if (!err && address) {
            return cb(null, address, family);
        }
        // 2. If local ISP fails with ENOTFOUND, use public Google / Cloudflare DNS
        try {
            const addresses = await fallbackDnsResolver.resolve4(hostname);
            if (addresses && addresses.length > 0) {
                if (isAll) {
                    return cb(null, [{ address: addresses[0], family: 4 }]);
                }
                return cb(null, addresses[0], 4);
            }
        }
        catch {
            // 3. Fallback known IP for api.gold-api.com
            if (hostname === 'api.gold-api.com') {
                if (isAll) {
                    return cb(null, [{ address: '159.65.119.83', family: 4 }]);
                }
                return cb(null, '159.65.119.83', 4);
            }
        }
        cb(err || new Error(`DNS resolution failed for ${hostname}`), '');
    });
}
function httpsGetJson(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https_1.default.get(url, {
            headers,
            timeout: 8000,
            lookup: customGoldApiLookup,
            servername: 'api.gold-api.com'
        }, (res) => {
            let raw = '';
            res.on('data', (chunk) => { raw += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(raw);
                    resolve({ status: res.statusCode || 200, data: parsed });
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
class GoldApiService {
    /**
     * Base URL for Gold API based on official documentation:
     * https://gold-api.com/docs
     * Base URL: https://api.gold-api.com
     */
    static baseUrl = 'https://api.gold-api.com';
    /**
     * Fetches real-time price for Gold (XAU) or Silver (XAG).
     * Free endpoint: GET https://api.gold-api.com/price/{symbol}/{currency}
     * No authentication required. No rate limits.
     */
    static async getMetalPrice(metal, currency = 'USD') {
        const symbol = metal.toUpperCase();
        const curr = currency.toUpperCase();
        try {
            const url = `${this.baseUrl}/price/${symbol}/${curr}`;
            const headers = {
                'Accept': 'application/json'
            };
            // Optional API key if user provides one in environment variables
            if (env_1.config.goldApiKey && env_1.config.goldApiKey.trim() !== '') {
                headers['x-api-key'] = env_1.config.goldApiKey.trim();
            }
            const { status, data } = await httpsGetJson(url, headers);
            if (status !== 200 || !data || data.price === undefined) {
                console.warn(`[Gold API] HTTP ${status} from ${url}. Reverting to fallback.`);
                return this.getFallbackMetalPrice(symbol, curr);
            }
            const price = parseFloat(data.price || '0');
            if (isNaN(price) || price <= 0) {
                return this.getFallbackMetalPrice(symbol, curr);
            }
            // Track price changes and 24h high/low
            const cacheKey = `${symbol}_${curr}`;
            const session = sessionMetalQuotes[cacheKey];
            let change = 0;
            let percentChange = 0;
            let high = price;
            let low = price;
            if (session) {
                change = Number((price - session.previousPrice).toFixed(2));
                percentChange = session.previousPrice > 0
                    ? Number((((price - session.previousPrice) / session.previousPrice) * 100).toFixed(2))
                    : 0;
                high = Math.max(session.high, price);
                low = Math.min(session.low, price);
            }
            else {
                sessionMetalQuotes[cacheKey] = {
                    previousPrice: price,
                    high: price,
                    low: price
                };
            }
            // Approximate grams: 1 Troy Ounce = 31.1034768 grams
            const gram24k = Number((price / 31.1034768).toFixed(2));
            const gram22k = Number(((price * 0.9167) / 31.1034768).toFixed(2));
            return {
                symbol,
                name: data.name ? `${data.name} (${symbol}/${curr})` : symbol === 'XAU' ? 'Gold (XAU/USD)' : 'Silver (XAG/USD)',
                price,
                priceGram24k: gram24k,
                priceGram22k: gram22k,
                change,
                percentChange,
                high,
                low,
                currency: curr,
                source: 'GOLD_API',
                timestamp: data.updatedAt ? new Date(data.updatedAt) : new Date()
            };
        }
        catch (err) {
            console.warn(`[Gold API] Error fetching ${symbol}/${curr}:`, err?.message || err);
            return this.getFallbackMetalPrice(symbol, curr);
        }
    }
    /**
     * Fallback quote generator in case of network outages
     */
    static getFallbackMetalPrice(symbol, currency) {
        const base = FALLBACK_METALS[symbol] || FALLBACK_METALS.XAU;
        return {
            symbol,
            name: base.name,
            price: base.price,
            priceGram24k: base.gram24k,
            priceGram22k: base.gram22k,
            change: base.change,
            percentChange: base.pct,
            high: base.high,
            low: base.low,
            currency,
            source: 'FALLBACK',
            timestamp: new Date()
        };
    }
}
exports.GoldApiService = GoldApiService;
