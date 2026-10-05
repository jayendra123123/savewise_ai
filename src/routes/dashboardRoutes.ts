import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', DashboardController.getDashboard);

export default router;
