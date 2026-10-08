import { Router } from 'express';
import { MarketController } from '../controllers/marketController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// All market routes require authentication
router.use(requireAuth);

router.get('/usage', MarketController.getUsage);
router.get('/watchlist', MarketController.getWatchlist);
router.get('/price', MarketController.getPrice);
router.get('/metal-analysis', MarketController.getMetalAnalysis);
router.get('/alerts', MarketController.getAlerts);
router.post('/alerts', MarketController.createAlert);
router.put('/alerts/:id/toggle', MarketController.toggleAlert);
router.delete('/alerts/:id', MarketController.deleteAlert);
router.post('/alerts/evaluate', MarketController.evaluateAlerts);

export default router;
