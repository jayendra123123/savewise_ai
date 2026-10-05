import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/summary', ReportController.getReport);

export default router;
