import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../models/Expense';

export const setBudgetSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, {
    errorMap: () => ({ message: 'Invalid category for budget' })
  }),
  budgetAmount: z.number().min(0, 'Budget amount must be positive or zero'),
  monthYear: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format')
});

export const getBudgetsQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format')
    .optional()
});
