import mongoose from 'mongoose';
import { PriceAlert, IPriceAlert, AssetType, AlertCondition } from '../models/PriceAlert';
import { MarketPriceCache } from '../models/MarketPriceCache';
import { TwelveDataService, TwelveDataLimitReachedError } from './twelveDataService';
import { GoldApiService } from './goldApiService';
import { TwelveDataUsageManager } from '../models/TwelveDataUsage';
import { EmailService } from './emailService';
import { IUser, User } from '../models/User';

export interface MarketPriceSummary {
  symbol: string;
  assetType: AssetType;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  currency: string;
  source: 'TWELVE_DATA' | 'GOLD_API' | 'FALLBACK';
  updatedAt: Date;
}

export class MarketMonitoringService {
  // Cache TTL: 60 seconds to conserve Twelve Data 700-credit budget
  private static CACHE_TTL_MS = 60 * 1000;

  /**
   * Retrieves Twelve Data daily usage metrics & dashboard monitoring stats.
   */
  static async getUsageMetrics() {
    return await TwelveDataUsageManager.getTodayMetrics();
  }

  /**
   * Fetches the current price of a single asset (cached or fresh).
   */
  static async getAssetPrice(
    assetType: AssetType,
    symbol: string,
    currency = 'USD'
  ): Promise<MarketPriceSummary> {
    const cleanSymbol = symbol.trim().toUpperCase();

    // 1. Check cache first
    const cached = await MarketPriceCache.findOne({ symbol: cleanSymbol });
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
    let freshData: MarketPriceSummary;

    if (assetType === 'GOLD' || cleanSymbol === 'XAU') {
      const metal = await GoldApiService.getMetalPrice('XAU', currency);
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
    } else if (assetType === 'SILVER' || cleanSymbol === 'XAG') {
      const metal = await GoldApiService.getMetalPrice('XAG', currency);
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
    } else {
      // Stock asset: use TwelveDataService with 700-credit daily limit
      try {
        const stock = await TwelveDataService.getStockPrice(cleanSymbol);
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
      } catch (err: any) {
        if (err instanceof TwelveDataLimitReachedError) {
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
    await MarketPriceCache.findOneAndUpdate(
      { symbol: cleanSymbol },
      {
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
      },
      { upsert: true, new: true }
    );

    return freshData;
  }

  /**
   * Fetches prices for the standard market watchlist:
   * Metals: Gold (XAU), Silver (XAG)
   * Stocks: AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA
   */
  static async getWatchlistPrices(): Promise<{
    metals: MarketPriceSummary[];
    stocks: MarketPriceSummary[];
    usage: any;
  }> {
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
    const cachedItems = await MarketPriceCache.find({
      symbol: { $in: stockSymbols }
    });

    const cacheMap = new Map<string, any>();
    cachedItems.forEach((item) => cacheMap.set(item.symbol, item));

    // Determine which stocks need refreshing
    const symbolsToFetch = stockSymbols.filter((sym) => {
      const cached = cacheMap.get(sym);
      if (!cached) return true;
      return (now - cached.updatedAt.getTime()) >= this.CACHE_TTL_MS;
    });

    if (symbolsToFetch.length > 0) {
      try {
        // Query Twelve Data in ONE batch request (consumes only 1 minute-limit request)
        const batchResults = await TwelveDataService.getBatchStockPrices(symbolsToFetch);

        for (const item of batchResults) {
          await MarketPriceCache.findOneAndUpdate(
            { symbol: item.symbol },
            {
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
            },
            { upsert: true, new: true }
          );
        }
      } catch (err: any) {
        console.warn('[Watchlist] Batch stock fetch notice:', err?.message || err);
      }
    }

    // Read back final consolidated results
    const finalItems = await MarketPriceCache.find({
      symbol: { $in: stockSymbols }
    });
    const finalMap = new Map<string, any>();
    finalItems.forEach((item) => finalMap.set(item.symbol, item));

    const stocks: MarketPriceSummary[] = stockSymbols.map((sym) => {
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
      const fb = TwelveDataService.getFallbackPrice(sym, 0);
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
   * Creates a user-defined price alert.
   */
  static async createAlert(
    userId: string,
    data: {
      assetType: AssetType;
      symbol: string;
      assetName?: string;
      targetPrice: number;
      condition: AlertCondition;
      currency?: string;
      notes?: string;
    }
  ): Promise<IPriceAlert> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const cleanSymbol = data.symbol.trim().toUpperCase();

    // Fetch initial asset price
    const currentPriceInfo = await this.getAssetPrice(
      data.assetType,
      cleanSymbol,
      data.currency || 'USD'
    );

    const assetName = data.assetName || currentPriceInfo.name;

    // Check if the condition is already met upon creation
    let isAlreadyTriggered = false;
    let notificationMsg: string | null = null;
    if (data.condition === 'ABOVE' && currentPriceInfo.price >= data.targetPrice) {
      isAlreadyTriggered = true;
      notificationMsg = `🔔 Alert Triggered: ${assetName} (${cleanSymbol}) rose above $${data.targetPrice.toLocaleString()}! Current price is $${currentPriceInfo.price.toLocaleString()}.`;
    } else if (data.condition === 'BELOW' && currentPriceInfo.price <= data.targetPrice) {
      isAlreadyTriggered = true;
      notificationMsg = `🔔 Alert Triggered: ${assetName} (${cleanSymbol}) fell below $${data.targetPrice.toLocaleString()}! Current price is $${currentPriceInfo.price.toLocaleString()}.`;
    }

    const alert = await PriceAlert.create({
      userId: userObjectId,
      assetType: data.assetType,
      symbol: cleanSymbol,
      assetName,
      targetPrice: data.targetPrice,
      currency: data.currency || 'USD',
      condition: data.condition,
      initialPrice: currentPriceInfo.price,
      currentPrice: currentPriceInfo.price,
      status: isAlreadyTriggered ? 'TRIGGERED' : 'ACTIVE',
      triggeredAt: isAlreadyTriggered ? new Date() : null,
      triggeredPrice: isAlreadyTriggered ? currentPriceInfo.price : null,
      notificationMessage: notificationMsg,
      isRead: false,
      emailSent: false,
      emailSentAt: null,
      notes: data.notes || null
    });

    // If already met on creation, immediately trigger email notification
    if (isAlreadyTriggered) {
      try {
        const user = await User.findById(userObjectId);
        if (user && user.email) {
          const sent = await EmailService.sendPriceAlertEmail({
            to: user.email,
            recipientName: user.fullName || 'SaveWise Member',
            assetName,
            symbol: cleanSymbol,
            condition: data.condition,
            targetPrice: data.targetPrice,
            currentPrice: currentPriceInfo.price,
            currency: data.currency || 'USD'
          });
          if (sent) {
            alert.emailSent = true;
            alert.emailSentAt = new Date();
            await alert.save();
          }
        }
      } catch (err) {
        console.error('[Create Alert Email Error]', err);
      }
    }

    return alert;
  }

  /**
   * Gets all price alerts configured by the user.
   */
  static async getUserAlerts(userId: string): Promise<{
    active: IPriceAlert[];
    triggered: IPriceAlert[];
    disabled: IPriceAlert[];
    all: IPriceAlert[];
  }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const alerts = await PriceAlert.find({ userId: userObjectId }).sort({ createdAt: -1 });

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
  static async toggleAlert(userId: string, alertId: string): Promise<IPriceAlert | null> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const alert = await PriceAlert.findOne({ _id: alertId, userId: userObjectId });
    if (!alert) return null;

    if (alert.status === 'ACTIVE') {
      alert.status = 'DISABLED';
    } else {
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
  static async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const res = await PriceAlert.deleteOne({ _id: alertId, userId: userObjectId });
    return res.deletedCount > 0;
  }

  /**
   * Marks a triggered alert notification as read.
   */
  static async markAlertAsRead(userId: string, alertId: string): Promise<IPriceAlert | null> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    return await PriceAlert.findOneAndUpdate(
      { _id: alertId, userId: userObjectId },
      { $set: { isRead: true } },
      { new: true }
    );
  }

  /**
   * Continuous Monitoring & Alert Evaluation Engine:
   * Evaluates all ACTIVE alerts against real-time market prices.
   * If an alert condition is met, updates status to TRIGGERED and generates notification.
   */
  static async evaluateAlerts(): Promise<{
    evaluatedCount: number;
    triggeredCount: number;
    triggeredAlerts: IPriceAlert[];
  }> {
    const activeAlerts = await PriceAlert.find({ status: 'ACTIVE' }).populate<{ userId: IUser }>('userId');
    if (activeAlerts.length === 0) {
      return { evaluatedCount: 0, triggeredCount: 0, triggeredAlerts: [] };
    }

    // Collect unique assets to avoid duplicate credit consumption
    const uniqueAssets = new Map<string, { assetType: AssetType; symbol: string; currency: string }>();
    activeAlerts.forEach(a => {
      const key = `${a.assetType}:${a.symbol}:${a.currency}`;
      if (!uniqueAssets.has(key)) {
        uniqueAssets.set(key, { assetType: a.assetType, symbol: a.symbol, currency: a.currency });
      }
    });

    // Fetch current prices for each unique asset
    const priceMap = new Map<string, number>();
    for (const [key, asset] of uniqueAssets.entries()) {
      try {
        const info = await this.getAssetPrice(asset.assetType, asset.symbol, asset.currency);
        priceMap.set(key, info.price);
      } catch (err) {
        console.warn(`[Alert Evaluation] Error fetching price for ${key}:`, err);
      }
    }

    const newlyTriggered: IPriceAlert[] = [];

    // Evaluate each active alert against the retrieved price
    for (const alert of activeAlerts) {
      const key = `${alert.assetType}:${alert.symbol}:${alert.currency}`;
      const currentPrice = priceMap.get(key);
      if (currentPrice === undefined) continue;

      alert.currentPrice = currentPrice;

      let isTriggered = false;
      let notificationMsg = '';

      if (alert.condition === 'ABOVE' && currentPrice >= alert.targetPrice) {
        isTriggered = true;
        notificationMsg = `🔔 Alert Triggered: ${alert.assetName} (${alert.symbol}) rose above $${alert.targetPrice.toLocaleString()}! Current price is $${currentPrice.toLocaleString()}.`;
      } else if (alert.condition === 'BELOW' && currentPrice <= alert.targetPrice) {
        isTriggered = true;
        notificationMsg = `🔔 Alert Triggered: ${alert.assetName} (${alert.symbol}) fell below $${alert.targetPrice.toLocaleString()}! Current price is $${currentPrice.toLocaleString()}.`;
      }

      if (isTriggered) {
        alert.status = 'TRIGGERED';
        alert.triggeredAt = new Date();
        alert.triggeredPrice = currentPrice;
        alert.notificationMessage = notificationMsg;
        alert.isRead = false;
        newlyTriggered.push(alert as any);

        // Send email notification to authenticated user via Nodemailer + SMTP
        if (!alert.emailSent) {
          const user = alert.userId as unknown as IUser;
          if (user && user.email) {
            try {
              const sent = await EmailService.sendPriceAlertEmail({
                to: user.email,
                recipientName: user.fullName || 'SaveWise Member',
                assetName: alert.assetName,
                symbol: alert.symbol,
                condition: alert.condition,
                targetPrice: alert.targetPrice,
                currentPrice: currentPrice,
                currency: alert.currency || 'USD'
              });
              if (sent) {
                alert.emailSent = true;
                alert.emailSentAt = new Date();
              }
            } catch (emailErr) {
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
