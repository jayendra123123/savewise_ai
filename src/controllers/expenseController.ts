import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { ExpenseService } from '../services/expenseService';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseQuerySchema
} from '../validators/expenseValidators';
import { sendSuccess } from '../utils/apiResponse';

export class ExpenseController {
  static async createExpense(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = createExpenseSchema.parse(req.body);
      const expense = await ExpenseService.createExpense(
        req.user!.userId,
        validated
      );
      sendSuccess(res, expense, 'Expense added successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async updateExpense(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const validated = updateExpenseSchema.parse(req.body);
      const updated = await ExpenseService.updateExpense(
        req.user!.userId,
        id,
        validated
      );
      sendSuccess(res, updated, 'Expense updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteExpense(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      await ExpenseService.deleteExpense(req.user!.userId, id);
      sendSuccess(res, null, 'Expense deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getExpenses(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedQuery = expenseQuerySchema.parse(req.query);
      const result = await ExpenseService.getExpenses(req.user!.userId, {
        category: validatedQuery.category as any,
        month: validatedQuery.month,
        startDate: validatedQuery.startDate,
        endDate: validatedQuery.endDate,
        search: validatedQuery.search,
        page: parseInt(validatedQuery.page, 10),
        limit: parseInt(validatedQuery.limit, 10)
      });
      sendSuccess(res, result, 'Expenses retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}
