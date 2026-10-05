import { z } from 'zod';

export const updateProfileSchema = z.object({
  monthlyIncome: z.number().min(0, 'Monthly income must be greater than or equal to 0'),
  monthlySavingsTarget: z.number().min(0, 'Monthly savings target must be greater than or equal to 0'),
  currency: z.string().min(1).max(5).default('₹'),
  fullName: z.string().min(2).optional()
});
