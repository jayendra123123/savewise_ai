import { Router } from 'express';
import { SavingsController } from '../controllers/savingsController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', SavingsController.getSavingsSummary);

export default router;
