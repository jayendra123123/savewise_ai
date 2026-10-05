import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { MonthlyAnalysisService } from '../services/monthlyAnalysisService';
import { sendSuccess } from '../utils/apiResponse';

export class AnalysisController {
  static async getMonthlyAnalysis(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const month = req.query.month as string | undefined;
      const data = await MonthlyAnalysisService.getMonthlyAnalysis(
        req.user!.userId,
        month,
        false
      );
      sendSuccess(res, data, 'Monthly financial analysis retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async refreshAiMonthlyAnalysis(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const month = req.body.month as string | undefined;
      const data = await MonthlyAnalysisService.getMonthlyAnalysis(
        req.user!.userId,
        month,
        true // trigger live Gemini AI invocation
      );
      sendSuccess(res, data, 'AI monthly financial analysis generated successfully');
    } catch (err) {
      next(err);
    }
  }
}
