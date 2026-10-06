"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketController = void 0;
const marketMonitoringService_1 = require("../services/marketMonitoringService");
const apiResponse_1 = require("../utils/apiResponse");
class MarketController {
    /**
     * GET /api/market/usage
     * Returns current UTC Twelve Data usage, limit status, and monitoring info.
     */
    static async getUsage(_req, res, next) {
        try {
            const usage = await marketMonitoringService_1.MarketMonitoringService.getUsageMetrics();
            (0, apiResponse_1.sendSuccess)(res, usage, 'Twelve Data usage metrics retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * GET /api/market/watchlist
     * Returns live/cached prices for Gold, Silver, and popular stocks.
     */
    static async getWatchlist(_req, res, next) {
        try {
            const watchlist = await marketMonitoringService_1.MarketMonitoringService.getWatchlistPrices();
            const allAssets = [...(watchlist.metals || []), ...(watchlist.stocks || [])];
            (0, apiResponse_1.sendSuccess)(res, { ...watchlist, assets: allAssets }, 'Market watchlist retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * GET /api/market/price?symbol=AAPL&assetType=STOCK
     */
    static async getPrice(req, res, next) {
        try {
            const symbol = req.query.symbol || 'AAPL';
            const assetType = (req.query.assetType || 'STOCK').toUpperCase();
            const currency = req.query.currency || 'USD';
            const price = await marketMonitoringService_1.MarketMonitoringService.getAssetPrice(assetType, symbol, currency);
            (0, apiResponse_1.sendSuccess)(res, price, 'Asset price retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * GET /api/market/alerts
     * Returns user's active, triggered, and disabled alerts.
     */
    static async getAlerts(req, res, next) {
        try {
            const alerts = await marketMonitoringService_1.MarketMonitoringService.getUserAlerts(req.user.userId);
            (0, apiResponse_1.sendSuccess)(res, {
                ...alerts,
                alerts: alerts.all,
                activeCount: alerts.active.length,
                triggeredCount: alerts.triggered.length
            }, 'Price alerts retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * POST /api/market/alerts
     * Creates a new user price alert.
     */
    static async createAlert(req, res, next) {
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
            const cleanCondition = condition.toUpperCase();
            if (!['ABOVE', 'BELOW'].includes(cleanCondition)) {
                res.status(400).json({
                    success: false,
                    error: 'Condition must be either ABOVE or BELOW.'
                });
                return;
            }
            const cleanAssetType = (assetType ? assetType.toUpperCase() : 'STOCK');
            const alert = await marketMonitoringService_1.MarketMonitoringService.createAlert(req.user.userId, {
                assetType: cleanAssetType,
                symbol,
                assetName,
                targetPrice: numTarget,
                condition: cleanCondition,
                currency: currency || 'USD',
                notes
            });
            (0, apiResponse_1.sendSuccess)(res, alert, 'Price alert created successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * PUT /api/market/alerts/:id/toggle
     */
    static async toggleAlert(req, res, next) {
        try {
            const { id } = req.params;
            const updated = await marketMonitoringService_1.MarketMonitoringService.toggleAlert(req.user.userId, id);
            if (!updated) {
                res.status(404).json({ success: false, error: 'Alert not found' });
                return;
            }
            (0, apiResponse_1.sendSuccess)(res, updated, `Alert ${updated.status === 'ACTIVE' ? 'activated' : 'disabled'}`);
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * DELETE /api/market/alerts/:id
     */
    static async deleteAlert(req, res, next) {
        try {
            const { id } = req.params;
            const deleted = await marketMonitoringService_1.MarketMonitoringService.deleteAlert(req.user.userId, id);
            if (!deleted) {
                res.status(404).json({ success: false, error: 'Alert not found' });
                return;
            }
            (0, apiResponse_1.sendSuccess)(res, { deleted: true }, 'Alert deleted successfully');
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * POST /api/market/alerts/evaluate
     * Triggers evaluation of active alerts against real-time prices.
     */
    static async evaluateAlerts(req, res, next) {
        try {
            const result = await marketMonitoringService_1.MarketMonitoringService.evaluateAlerts();
            const userAlerts = await marketMonitoringService_1.MarketMonitoringService.getUserAlerts(req.user.userId);
            const usage = await marketMonitoringService_1.MarketMonitoringService.getUsageMetrics();
            (0, apiResponse_1.sendSuccess)(res, {
                ...result,
                alerts: userAlerts.all,
                usage
            }, 'Alerts evaluated successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.MarketController = MarketController;
