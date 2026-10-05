import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { GoalService } from '../services/goalService';
import { createGoalSchema, updateGoalSchema } from '../validators/goalValidators';
import { sendSuccess } from '../utils/apiResponse';

export class GoalController {
  static async createGoal(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = createGoalSchema.parse(req.body);
      const goal = await GoalService.createGoal(req.user!.userId, validated as any);
      sendSuccess(res, goal, 'Financial goal created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async getGoals(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const goals = await GoalService.getGoals(req.user!.userId);
      sendSuccess(res, goals, 'Financial goals retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateGoal(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const validated = updateGoalSchema.parse(req.body);
      const updated = await GoalService.updateGoal(
        req.user!.userId,
        id,
        validated as any
      );
      sendSuccess(res, updated, 'Financial goal updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteGoal(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      await GoalService.deleteGoal(req.user!.userId, id);
      sendSuccess(res, null, 'Financial goal deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
