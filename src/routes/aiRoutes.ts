import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.post('/analyze', AIController.analyzeFinances);
router.get('/insights', AIController.getInsights);

export default router;
