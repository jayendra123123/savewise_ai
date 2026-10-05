import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../models/Expense';

export const createExpenseSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  category: z.enum(EXPENSE_CATEGORIES, {
    errorMap: () => ({ message: 'Invalid expense category' })
  }),
  date: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid date format'
    }),
  selectedMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'selectedMonth must be in YYYY-MM format')
    .optional(),
  description: z.string().min(1, 'Description is required').max(150),
  note: z.string().max(500).optional()
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseQuerySchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  month: z
    .string()
    .regex(/^(\d{4}-(0[1-9]|1[0-2])|all)$/, 'Month must be in YYYY-MM format or all')
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).default('1'),
  limit: z.string().regex(/^\d+$/).default('50')
});
