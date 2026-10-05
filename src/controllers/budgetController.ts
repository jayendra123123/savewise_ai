import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { BudgetService } from '../services/budgetService';
import {
  setBudgetSchema,
  getBudgetsQuerySchema
} from '../validators/budgetValidators';
import { sendSuccess } from '../utils/apiResponse';

export class BudgetController {
  static async setBudget(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = setBudgetSchema.parse(req.body);
      const budget = await BudgetService.setBudget(req.user!.userId, validated);
      sendSuccess(res, budget, 'Budget set successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getBudgets(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = getBudgetsQuerySchema.parse(req.query);
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}`;
      const monthYear = validated.month || currentMonth;

      const overview = await BudgetService.getBudgetsForMonth(
        req.user!.userId,
        monthYear
      );
      sendSuccess(res, overview, 'Budgets retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteBudget(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      await BudgetService.deleteBudget(req.user!.userId, id);
      sendSuccess(res, null, 'Budget deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
