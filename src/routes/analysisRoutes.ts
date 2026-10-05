import { Router } from 'express';
import { AnalysisController } from '../controllers/analysisController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/monthly', AnalysisController.getMonthlyAnalysis);
router.post('/monthly/ai', AnalysisController.refreshAiMonthlyAnalysis);

export default router;
