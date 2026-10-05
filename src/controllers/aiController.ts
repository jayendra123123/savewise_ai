import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AIService } from '../services/aiService';
import { sendSuccess } from '../utils/apiResponse';

export class AIController {
  static async analyzeFinances(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const monthYear = req.body.monthYear as string | undefined;
      const result = await AIService.analyzeFinances(
        req.user!.userId,
        monthYear
      );
      sendSuccess(res, result, 'Financial analysis generated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getInsights(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const monthYear = req.query.month as string | undefined;
      let insight = await AIService.getLatestInsights(
        req.user!.userId,
        monthYear
      );

      // If no insights exist yet for this month, automatically generate initial insights
      if (!insight) {
        const generated = await AIService.analyzeFinances(
          req.user!.userId,
          monthYear
        );
        insight = generated.insight;
      }

      sendSuccess(res, insight, 'AI Insights retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}
