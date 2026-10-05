import { z } from 'zod';
import { GOAL_CATEGORIES } from '../models/FinancialGoal';

export const createGoalSchema = z.object({
  title: z.string().min(1, 'Goal title is required').max(100),
  category: z.enum(GOAL_CATEGORIES, {
    errorMap: () => ({ message: 'Invalid goal category' })
  }),
  targetAmount: z.number().positive('Target amount must be greater than zero'),
  currentAmount: z.number().min(0).default(0),
  monthlyContribution: z.number().min(0, 'Monthly contribution must be positive or zero'),
  targetDate: z.string().optional()
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  category: z.enum(GOAL_CATEGORIES).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  monthlyContribution: z.number().min(0).optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'PAUSED']).optional(),
  targetDate: z.string().optional(),
  addContribution: z.number().positive().optional()
});
