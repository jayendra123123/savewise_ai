"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const marketController_1 = require("../controllers/marketController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// All market routes require authentication
router.use(authMiddleware_1.requireAuth);
router.get('/usage', marketController_1.MarketController.getUsage);
router.get('/watchlist', marketController_1.MarketController.getWatchlist);
router.get('/price', marketController_1.MarketController.getPrice);
router.get('/metal-analysis', marketController_1.MarketController.getMetalAnalysis);
router.get('/alerts', marketController_1.MarketController.getAlerts);
router.post('/alerts', marketController_1.MarketController.createAlert);
router.put('/alerts/:id/toggle', marketController_1.MarketController.toggleAlert);
router.delete('/alerts/:id', marketController_1.MarketController.deleteAlert);
router.post('/alerts/evaluate', marketController_1.MarketController.evaluateAlerts);
exports.default = router;
