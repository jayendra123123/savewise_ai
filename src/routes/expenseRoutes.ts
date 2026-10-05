import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', ExpenseController.getExpenses);
router.post('/', ExpenseController.createExpense);
router.put('/:id', ExpenseController.updateExpense);
router.delete('/:id', ExpenseController.deleteExpense);

export default router;
