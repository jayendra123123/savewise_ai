import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { ReportService, ReportPeriod } from '../services/reportService';
import { sendSuccess } from '../utils/apiResponse';

export class ReportController {
  static async getReport(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const period = (req.query.period as ReportPeriod) || 'current_month';
      const month = req.query.month as string | undefined;
      const report = await ReportService.getReport(req.user!.userId, period, month);
      sendSuccess(res, report, 'Financial report retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}
