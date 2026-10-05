import { Router } from 'express';
import { BudgetController } from '../controllers/budgetController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', BudgetController.getBudgets);
router.post('/', BudgetController.setBudget);
router.delete('/:id', BudgetController.deleteBudget);

export default router;
