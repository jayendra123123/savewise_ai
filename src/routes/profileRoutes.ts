import { Router } from 'express';
import { ProfileController } from '../controllers/profileController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', ProfileController.getProfile);
router.put('/', ProfileController.updateProfile);

export default router;
