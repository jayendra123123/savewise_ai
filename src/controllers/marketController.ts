import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { MarketMonitoringService } from '../services/marketMonitoringService';
import { sendSuccess } from '../utils/apiResponse';
import { AssetType, AlertCondition } from '../models/PriceAlert';

export class MarketController {
  /**
   * GET /api/market/usage
   * Returns current UTC Twelve Data usage, limit status, and monitoring info.
   */
  static async getUsage(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const usage = await MarketMonitoringService.getUsageMetrics();
      sendSuccess(res, usage, 'Twelve Data usage metrics retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/market/watchlist
   * Returns live/cached prices for Gold, Silver, and popular stocks.
   */
  static async getWatchlist(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const watchlist = await MarketMonitoringService.getWatchlistPrices();
      const allAssets = [...(watchlist.metals || []), ...(watchlist.stocks || [])];
      sendSuccess(res, { ...watchlist, assets: allAssets }, 'Market watchlist retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/market/price?symbol=AAPL&assetType=STOCK
   */
  static async getPrice(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const symbol = (req.query.symbol as string) || 'AAPL';
      const assetType = ((req.query.assetType as string) || 'STOCK').toUpperCase() as AssetType;
      const currency = (req.query.currency as string) || 'USD';

      const price = await MarketMonitoringService.getAssetPrice(assetType, symbol, currency);
      sendSuccess(res, price, 'Asset price retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/market/alerts
   * Returns user's active, triggered, and disabled alerts.
   */
  static async getAlerts(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const alerts = await MarketMonitoringService.getUserAlerts(req.user!.userId);
      sendSuccess(
        res,
        {
          ...alerts,
          alerts: alerts.all,
          activeCount: alerts.active.length,
          triggeredCount: alerts.triggered.length
        },
        'Price alerts retrieved'
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/market/alerts
   * Creates a new user price alert.
   */
  static async createAlert(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { assetType, symbol, assetName, targetPrice, condition, currency, notes } = req.body;

      if (!symbol || !targetPrice || !condition) {
        res.status(400).json({
          success: false,
          error: 'Symbol, targetPrice, and condition are required.'
        });
        return;
      }

      const numTarget = parseFloat(targetPrice);
      if (isNaN(numTarget) || numTarget <= 0) {
        res.status(400).json({
          success: false,
          error: 'Target price must be a valid positive number.'
        });
        return;
      }

      const cleanCondition = condition.toUpperCase() as AlertCondition;
      if (!['ABOVE', 'BELOW'].includes(cleanCondition)) {
        res.status(400).json({
          success: false,
          error: 'Condition must be either ABOVE or BELOW.'
        });
        return;
      }

      const cleanAssetType = (assetType ? assetType.toUpperCase() : 'STOCK') as AssetType;

      const alert = await MarketMonitoringService.createAlert(req.user!.userId, {
        assetType: cleanAssetType,
        symbol,
        assetName,
        targetPrice: numTarget,
        condition: cleanCondition,
        currency: currency || 'USD',
        notes
      });

      sendSuccess(res, alert, 'Price alert created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/market/alerts/:id/toggle
   */
  static async toggleAlert(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await MarketMonitoringService.toggleAlert(req.user!.userId, id);

      if (!updated) {
        res.status(404).json({ success: false, error: 'Alert not found' });
        return;
      }

      sendSuccess(res, updated, `Alert ${updated.status === 'ACTIVE' ? 'activated' : 'disabled'}`);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/market/alerts/:id
   */
  static async deleteAlert(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await MarketMonitoringService.deleteAlert(req.user!.userId, id);

      if (!deleted) {
        res.status(404).json({ success: false, error: 'Alert not found' });
        return;
      }

      sendSuccess(res, { deleted: true }, 'Alert deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/market/alerts/evaluate
   * Triggers evaluation of active alerts against real-time prices.
   */
  static async evaluateAlerts(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await MarketMonitoringService.evaluateAlerts();
      const userAlerts = await MarketMonitoringService.getUserAlerts(req.user!.userId);
      const usage = await MarketMonitoringService.getUsageMetrics();
      sendSuccess(
        res,
        {
          ...result,
          alerts: userAlerts.all,
          usage
        },
        'Alerts evaluated successfully'
      );
    } catch (err) {
      next(err);
    }
  }
}
