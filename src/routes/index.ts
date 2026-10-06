import { Router } from 'express';
import authRoutes from './authRoutes';
import profileRoutes from './profileRoutes';
import expenseRoutes from './expenseRoutes';
import budgetRoutes from './budgetRoutes';
import savingsRoutes from './savingsRoutes';
import goalRoutes from './goalRoutes';
import dashboardRoutes from './dashboardRoutes';
import reportRoutes from './reportRoutes';
import aiRoutes from './aiRoutes';
import analysisRoutes from './analysisRoutes';
import marketRoutes from './marketRoutes';
import todoRoutes from './todoRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/expenses', expenseRoutes);
router.use('/budgets', budgetRoutes);
router.use('/savings', savingsRoutes);
router.use('/goals', goalRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/ai', aiRoutes);
router.use('/analysis', analysisRoutes);
router.use('/market', marketRoutes);
router.use('/todos', todoRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'SaveWise AI Backend',
    timestamp: new Date().toISOString()
  });
});

export default router;
