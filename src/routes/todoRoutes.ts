import { Router } from 'express';
import { TodoController } from '../controllers/todoController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Enforce authentication on all todo operations
router.use(requireAuth);

router.get('/', TodoController.getTodos);
router.post('/', TodoController.createTodo);
router.put('/:id', TodoController.updateTodo);
router.patch('/:id/toggle', TodoController.toggleTodo);
router.delete('/:id', TodoController.deleteTodo);
router.delete('/completed/all', TodoController.clearCompleted);
router.post('/evaluate-reminders', TodoController.evaluateReminders);

export default router;
