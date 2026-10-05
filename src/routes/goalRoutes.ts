import { Router } from 'express';
import { GoalController } from '../controllers/goalController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', GoalController.getGoals);
router.post('/', GoalController.createGoal);
router.put('/:id', GoalController.updateGoal);
router.delete('/:id', GoalController.deleteGoal);

export default router;
