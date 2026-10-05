import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { DashboardService } from '../services/dashboardService';
import { sendSuccess } from '../utils/apiResponse';

export class DashboardController {
  static async getDashboard(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const month = req.query.month as string | undefined;
      const data = await DashboardService.getDashboard(
        req.user!.userId,
        month
      );
      sendSuccess(res, data, 'Dashboard data retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}
