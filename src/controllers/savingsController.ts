import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { SavingsService } from '../services/savingsService';
import { sendSuccess } from '../utils/apiResponse';

export class SavingsController {
  static async getSavingsSummary(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const month = req.query.month as string | undefined;
      const summary = await SavingsService.getSavingsSummary(
        req.user!.userId,
        month
      );
      sendSuccess(res, summary, 'Savings summary retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}
