"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketMonitoringService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const PriceAlert_1 = require("../models/PriceAlert");
const MarketPriceCache_1 = require("../models/MarketPriceCache");
const twelveDataService_1 = require("./twelveDataService");
const goldApiService_1 = require("./goldApiService");
const TwelveDataUsage_1 = require("../models/TwelveDataUsage");
const emailService_1 = require("./emailService");
const User_1 = require("../models/User");
const metalAnalysisAi_1 = require("../ai/metalAnalysisAi");
class MarketMonitoringService {
    // Cache TTL: 60 seconds to conserve Twelve Data 700-credit budget
    static CACHE_TTL_MS = 60 * 1000;
    /**
     * Retrieves Twelve Data daily usage metrics & dashboard monitoring stats.
     */
    static async getUsageMetrics() {
        return await TwelveDataUsage_1.TwelveDataUsageManager.getTodayMetrics();
    }
    /**
     * Fetches the current price of a single asset (cached or fresh).
     */
    static async getAssetPrice(assetType, symbol, currency = 'USD') {
        const cleanSymbol = symbol.trim().toUpperCase();
        // 1. Check cache first
        const cached = await MarketPriceCache_1.MarketPriceCache.findOne({ symbol: cleanSymbol });
        const now = Date.now();
        if (cached && (now - cached.updatedAt.getTime()) < this.CACHE_TTL_MS) {
            return {
                symbol: cached.symbol,
                assetType: cached.assetType,
                name: cached.name,
                price: cached.price,
                change: cached.change,
                percentChange: cached.percentChange,
                high: cached.high,
                low: cached.low,
                currency: cached.currency,
                source: cached.source,
                updatedAt: cached.updatedAt
            };
        }
        // 2. Fetch fresh price from appropriate provider
        let freshData;
        if (assetType === 'GOLD' || cleanSymbol === 'XAU') {
            const metal = await goldApiService_1.GoldApiService.getMetalPrice('XAU', currency);
            freshData = {
                symbol: 'XAU',
                assetType: 'GOLD',
                name: metal.name,
                price: metal.price,
                change: metal.change,
                percentChange: metal.percentChange,
                high: metal.high,
                low: metal.low,
                currency,
                source: metal.source,
                updatedAt: new Date()
            };
        }
        else if (assetType === 'SILVER' || cleanSymbol === 'XAG') {
            const metal = await goldApiService_1.GoldApiService.getMetalPrice('XAG', currency);
            freshData = {
                symbol: 'XAG',
                assetType: 'SILVER',
                name: metal.name,
                price: metal.price,
                change: metal.change,
                percentChange: metal.percentChange,
                high: metal.high,
                low: metal.low,
                currency,
                source: metal.source,
                updatedAt: new Date()
            };
        }
        else {
            // Stock asset: use TwelveDataService with 700-credit daily limit
            try {
                const stock = await twelveDataService_1.TwelveDataService.getStockPrice(cleanSymbol);
                freshData = {
                    symbol: stock.symbol,
                    assetType: 'STOCK',
                    name: stock.name,
                    price: stock.price,
                    change: stock.change,
                    percentChange: stock.percentChange,
                    high: stock.high,
                    low: stock.low,
                    currency: stock.currency,
                    source: stock.source,
                    updatedAt: new Date()
                };
            }
            catch (err) {
                if (err instanceof twelveDataService_1.TwelveDataLimitReachedError) {
                    // If limit reached, return cached or fallback gracefully
                    if (cached) {
                        return {
                            symbol: cached.symbol,
                            assetType: cached.assetType,
                            name: cached.name,
                            price: cached.price,
                            change: cached.change,
                            percentChange: cached.percentChange,
                            high: cached.high,
                            low: cached.low,
                            currency: cached.currency,
                            source: cached.source,
                            updatedAt: cached.updatedAt
                        };
                    }
                }
                throw err;
            }
        }
        // 3. Update cache
        await MarketPriceCache_1.MarketPriceCache.findOneAndUpdate({ symbol: cleanSymbol }, {
            assetType: freshData.assetType,
            name: freshData.name,
            price: freshData.price,
            change: freshData.change,
            percentChange: freshData.percentChange,
            high: freshData.high,
            low: freshData.low,
            currency: freshData.currency,
            source: freshData.source,
            updatedAt: freshData.updatedAt
        }, { upsert: true, new: true });
        return freshData;
    }
    /**
     * Fetches prices for the standard market watchlist:
     * Metals: Gold (XAU), Silver (XAG)
     * Stocks: AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA
     */
    static async getWatchlistPrices() {
        const usage = await this.getUsageMetrics();
        // 1. Fetch Gold & Silver
        const [goldPrice, silverPrice] = await Promise.all([
            this.getAssetPrice('GOLD', 'XAU'),
            this.getAssetPrice('SILVER', 'XAG')
        ]);
        // 2. Fetch popular stocks via single efficient batch request
        const stockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA'];
        const now = Date.now();
        // Check existing cache for all watchlist stocks
        const cachedItems = await MarketPriceCache_1.MarketPriceCache.find({
            symbol: { $in: stockSymbols }
        });
        const cacheMap = new Map();
        cachedItems.forEach((item) => cacheMap.set(item.symbol, item));
        // Determine which stocks need refreshing
        const symbolsToFetch = stockSymbols.filter((sym) => {
            const cached = cacheMap.get(sym);
            if (!cached)
                return true;
            return (now - cached.updatedAt.getTime()) >= this.CACHE_TTL_MS;
        });
        if (symbolsToFetch.length > 0) {
            try {
                // Query Twelve Data in ONE batch request (consumes only 1 minute-limit request)
                const batchResults = await twelveDataService_1.TwelveDataService.getBatchStockPrices(symbolsToFetch);
                for (const item of batchResults) {
                    await MarketPriceCache_1.MarketPriceCache.findOneAndUpdate({ symbol: item.symbol }, {
                        assetType: 'STOCK',
                        name: item.name,
                        price: item.price,
                        change: item.change,
                        percentChange: item.percentChange,
                        high: item.high,
                        low: item.low,
                        currency: item.currency,
                        source: item.source,
                        updatedAt: new Date()
                    }, { upsert: true, new: true });
                }
            }
            catch (err) {
                console.warn('[Watchlist] Batch stock fetch notice:', err?.message || err);
            }
        }
        // Read back final consolidated results
        const finalItems = await MarketPriceCache_1.MarketPriceCache.find({
            symbol: { $in: stockSymbols }
        });
        const finalMap = new Map();
        finalItems.forEach((item) => finalMap.set(item.symbol, item));
        const stocks = stockSymbols.map((sym) => {
            const item = finalMap.get(sym);
            if (item) {
                return {
                    symbol: item.symbol,
                    assetType: 'STOCK',
                    name: item.name,
                    price: item.price,
                    change: item.change,
                    percentChange: item.percentChange,
                    high: item.high,
                    low: item.low,
                    currency: item.currency,
                    source: item.source,
                    updatedAt: item.updatedAt
                };
            }
            const fb = twelveDataService_1.TwelveDataService.getFallbackPrice(sym, 0);
            return {
                symbol: sym,
                assetType: 'STOCK',
                name: fb.name,
                price: fb.price,
                change: fb.change,
                percentChange: fb.percentChange,
                high: fb.high,
                low: fb.low,
                currency: fb.currency,
                source: 'FALLBACK',
                updatedAt: new Date()
            };
        });
        return {
            metals: [goldPrice, silverPrice],
            stocks,
            usage
        };
    }
    /**
     * Fetches real-time precious metal market data along with Gemini AI trend analysis.
     */
    static async getMetalAnalysis(metal, currency = 'USD') {
        const symbol = metal === 'GOLD' ? 'XAU' : 'XAG';
        const quote = await goldApiService_1.GoldApiService.getMetalPrice(symbol, currency);
        const aiAnalysis = await metalAnalysisAi_1.MetalAnalysisAiService.analyzeMetal({
            metal,
            symbol,
            price: quote.price,
            priceGram24k: quote.priceGram24k,
            priceGram22k: quote.priceGram22k,
            change: quote.change,
            percentChange: quote.percentChange,
            high: quote.high,
            low: quote.low,
            currency
        });
        return {
            price: quote,
            aiAnalysis
        };
    }
    /**
     * Creates a user-defined price alert with user intention and Gemini AI market analysis.
     */
    static async createAlert(userId, data) {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const cleanSymbol = data.symbol.trim().toUpperCase();
        // Determine condition based on intention if provided
        let resolvedIntention = data.intention || 'PRICE_THRESHOLD';
        let resolvedCondition = data.condition || 'ABOVE';
        if (resolvedIntention === 'BUY_ON_FALL') {
            resolvedCondition = 'BELOW';
        }
        else if (resolvedIntention === 'MONITOR_GROWTH') {
            resolvedCondition = 'ABOVE';
        }
        else if (data.condition) {
            resolvedCondition = data.condition;
            resolvedIntention = resolvedCondition === 'BELOW' ? 'BUY_ON_FALL' : 'MONITOR_GROWTH';
        }
        // Fetch initial asset price from real market feeds
        const currentPriceInfo = await this.getAssetPrice(data.assetType, cleanSymbol, data.currency || 'USD');
        const assetName = data.assetName || currentPriceInfo.name;
        // Generate Gemini AI educational trend analysis for Precious Metals
        let aiAnalysis = null;
        if (data.assetType === 'GOLD' || cleanSymbol === 'XAU' || data.assetType === 'SILVER' || cleanSymbol === 'XAG') {
            try {
                const isGold = data.assetType === 'GOLD' || cleanSymbol === 'XAU';
                const metalQuote = await goldApiService_1.GoldApiService.getMetalPrice(isGold ? 'XAU' : 'XAG', data.currency || 'USD');
                const ai = await metalAnalysisAi_1.MetalAnalysisAiService.analyzeMetal({
                    metal: isGold ? 'GOLD' : 'SILVER',
                    symbol: isGold ? 'XAU' : 'XAG',
                    price: currentPriceInfo.price,
                    priceGram24k: metalQuote.priceGram24k,
                    priceGram22k: metalQuote.priceGram22k,
                    change: currentPriceInfo.change,
                    percentChange: currentPriceInfo.percentChange,
                    high: currentPriceInfo.high,
                    low: currentPriceInfo.low,
                    currency: data.currency || 'USD',
                    intention: resolvedIntention,
                    targetPrice: data.targetPrice
                });
                aiAnalysis = {
                    trend: ai.trend,
                    summary: ai.summary,
                    explanation: ai.explanation,
                    recommendation: ai.recommendation,
                    educationalTakeaway: ai.educationalTakeaway,
                    analyzedAt: ai.analyzedAt
                };
            }
            catch (aiErr) {
                console.warn('[Market Monitoring] Gemini analysis notice during alert creation:', aiErr);
            }
        }
        // Check if the condition is already met upon creation
        let isAlreadyTriggered = false;
        let notificationMsg = null;
        if (resolvedCondition === 'ABOVE' && currentPriceInfo.price >= data.targetPrice) {
            isAlreadyTriggered = true;
            if (resolvedIntention === 'MONITOR_GROWTH') {
                notificationMsg = `📈 Investment Target Hit: ${assetName} (${cleanSymbol}) reached $${currentPriceInfo.price.toLocaleString()} (Target: $${data.targetPrice.toLocaleString()}).`;
            }
            else {
                notificationMsg = `🔔 Alert Triggered: ${assetName} (${cleanSymbol}) rose above $${data.targetPrice.toLocaleString()}! Current price is $${currentPriceInfo.price.toLocaleString()}.`;
            }
        }
        else if (resolvedCondition === 'BELOW' && currentPriceInfo.price <= data.targetPrice) {
            isAlreadyTriggered = true;
            if (resolvedIntention === 'BUY_ON_FALL') {
                notificationMsg = `🟢 Buying Opportunity: ${assetName} (${cleanSymbol}) dipped to $${currentPriceInfo.price.toLocaleString()} (Buy Target: $${data.targetPrice.toLocaleString()}).`;
            }
            else {
                notificationMsg = `🔔 Alert Triggered: ${assetName} (${cleanSymbol}) fell below $${data.targetPrice.toLocaleString()}! Current price is $${currentPriceInfo.price.toLocaleString()}.`;
            }
        }
        const alert = await PriceAlert_1.PriceAlert.create({
            userId: userObjectId,
            assetType: data.assetType,
            symbol: cleanSymbol,
            assetName,
            targetPrice: data.targetPrice,
            currency: data.currency || 'USD',
            condition: resolvedCondition,
            intention: resolvedIntention,
            initialPrice: currentPriceInfo.price,
            currentPrice: currentPriceInfo.price,
            status: isAlreadyTriggered ? 'TRIGGERED' : 'ACTIVE',
            triggeredAt: isAlreadyTriggered ? new Date() : null,
            triggeredPrice: isAlreadyTriggered ? currentPriceInfo.price : null,
            notificationMessage: notificationMsg,
            isRead: false,
            emailSent: false,
            emailSentAt: null,
            notes: data.notes || null,
            aiAnalysis
        });
        // If already met on creation, immediately trigger email notification
        if (isAlreadyTriggered) {
            try {
                const user = await User_1.User.findById(userObjectId);
                if (user && user.email) {
                    const sent = await emailService_1.EmailService.sendPriceAlertEmail({
                        to: user.email,
                        recipientName: user.fullName || 'SaveWise Member',
                        assetName,
                        symbol: cleanSymbol,
                        condition: resolvedCondition,
                        intention: resolvedIntention,
                        targetPrice: data.targetPrice,
                        currentPrice: currentPriceInfo.price,
                        currency: data.currency || 'USD',
                        aiAnalysis
                    });
                    if (sent) {
                        alert.emailSent = true;
                        alert.emailSentAt = new Date();
                        await alert.save();
                    }
                }
            }
            catch (err) {
                console.error('[Create Alert Email Error]', err);
            }
        }
        return alert;
    }
    /**
     * Gets all price alerts configured by the user.
     */
    static async getUserAlerts(userId) {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const alerts = await PriceAlert_1.PriceAlert.find({ userId: userObjectId }).sort({ createdAt: -1 });
        const active = alerts.filter(a => a.status === 'ACTIVE');
        const triggered = alerts.filter(a => a.status === 'TRIGGERED');
        const disabled = alerts.filter(a => a.status === 'DISABLED');
        return {
            active,
            triggered,
            disabled,
            all: alerts
        };
    }
    /**
     * Toggles an alert between ACTIVE and DISABLED.
     */
    static async toggleAlert(userId, alertId) {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const alert = await PriceAlert_1.PriceAlert.findOne({ _id: alertId, userId: userObjectId });
        if (!alert)
            return null;
        if (alert.status === 'ACTIVE') {
            alert.status = 'DISABLED';
        }
        else {
            alert.status = 'ACTIVE';
            alert.triggeredAt = null;
            alert.triggeredPrice = null;
            alert.notificationMessage = null;
            alert.emailSent = false;
            alert.emailSentAt = null;
        }
        await alert.save();
        return alert;
    }
    /**
     * Deletes a price alert.
     */
    static async deleteAlert(userId, alertId) {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const res = await PriceAlert_1.PriceAlert.deleteOne({ _id: alertId, userId: userObjectId });
        return res.deletedCount > 0;
    }
    /**
     * Marks a triggered alert notification as read.
     */
    static async markAlertAsRead(userId, alertId) {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        return await PriceAlert_1.PriceAlert.findOneAndUpdate({ _id: alertId, userId: userObjectId }, { $set: { isRead: true } }, { new: true });
    }
    /**
     * Continuous Monitoring & Alert Evaluation Engine:
     * Evaluates all ACTIVE alerts against real-time market prices.
     * If an alert condition is met, updates status to TRIGGERED and generates notification.
     */
    static async evaluateAlerts() {
        const activeAlerts = await PriceAlert_1.PriceAlert.find({ status: 'ACTIVE' }).populate('userId');
        if (activeAlerts.length === 0) {
            return { evaluatedCount: 0, triggeredCount: 0, triggeredAlerts: [] };
        }
        // Collect unique assets to avoid duplicate credit consumption
        const uniqueAssets = new Map();
        activeAlerts.forEach(a => {
            const key = `${a.assetType}:${a.symbol}:${a.currency}`;
            if (!uniqueAssets.has(key)) {
                uniqueAssets.set(key, { assetType: a.assetType, symbol: a.symbol, currency: a.currency });
            }
        });
        // Fetch current prices for each unique asset
        const priceMap = new Map();
        for (const [key, asset] of uniqueAssets.entries()) {
            try {
                const info = await this.getAssetPrice(asset.assetType, asset.symbol, asset.currency);
                priceMap.set(key, info.price);
            }
            catch (err) {
                console.warn(`[Alert Evaluation] Error fetching price for ${key}:`, err);
            }
        }
        const newlyTriggered = [];
        // Evaluate each active alert against the retrieved price
        for (const alert of activeAlerts) {
            const key = `${alert.assetType}:${alert.symbol}:${alert.currency}`;
            const currentPrice = priceMap.get(key);
            if (currentPrice === undefined)
                continue;
            alert.currentPrice = currentPrice;
            let isTriggered = false;
            let notificationMsg = '';
            if (alert.condition === 'ABOVE' && currentPrice >= alert.targetPrice) {
                isTriggered = true;
                if (alert.intention === 'MONITOR_GROWTH') {
                    notificationMsg = `📈 Investment Target Hit: ${alert.assetName} (${alert.symbol}) reached $${currentPrice.toLocaleString()} (Target: $${alert.targetPrice.toLocaleString()}).`;
                }
                else {
                    notificationMsg = `🔔 Alert Triggered: ${alert.assetName} (${alert.symbol}) rose above $${alert.targetPrice.toLocaleString()}! Current price is $${currentPrice.toLocaleString()}.`;
                }
            }
            else if (alert.condition === 'BELOW' && currentPrice <= alert.targetPrice) {
                isTriggered = true;
                if (alert.intention === 'BUY_ON_FALL') {
                    notificationMsg = `🟢 Buying Opportunity: ${alert.assetName} (${alert.symbol}) dipped to $${currentPrice.toLocaleString()} (Buy Target: $${alert.targetPrice.toLocaleString()}).`;
                }
                else {
                    notificationMsg = `🔔 Alert Triggered: ${alert.assetName} (${alert.symbol}) fell below $${alert.targetPrice.toLocaleString()}! Current price is $${currentPrice.toLocaleString()}.`;
                }
            }
            if (isTriggered) {
                alert.status = 'TRIGGERED';
                alert.triggeredAt = new Date();
                alert.triggeredPrice = currentPrice;
                alert.notificationMessage = notificationMsg;
                alert.isRead = false;
                newlyTriggered.push(alert);
                // Send email notification to authenticated user via Nodemailer + SMTP (guaranteed deduplication)
                if (!alert.emailSent) {
                    const user = alert.userId;
                    if (user && user.email) {
                        try {
                            const sent = await emailService_1.EmailService.sendPriceAlertEmail({
                                to: user.email,
                                recipientName: user.fullName || 'SaveWise Member',
                                assetName: alert.assetName,
                                symbol: alert.symbol,
                                condition: alert.condition,
                                intention: alert.intention,
                                targetPrice: alert.targetPrice,
                                currentPrice: currentPrice,
                                currency: alert.currency || 'USD',
                                aiAnalysis: alert.aiAnalysis
                            });
                            if (sent) {
                                alert.emailSent = true;
                                alert.emailSentAt = new Date();
                            }
                        }
                        catch (emailErr) {
                            console.error(`[Alert Email] Failed to send email to ${user.email}:`, emailErr);
                        }
                    }
                }
            }
            await alert.save();
        }
        return {
            evaluatedCount: activeAlerts.length,
            triggeredCount: newlyTriggered.length,
            triggeredAlerts: newlyTriggered
        };
    }
}
exports.MarketMonitoringService = MarketMonitoringService;
