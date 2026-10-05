import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { ProfileService } from '../services/profileService';
import { updateProfileSchema } from '../validators/profileValidators';
import { sendSuccess } from '../utils/apiResponse';

export class ProfileController {
  static async getProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const profile = await ProfileService.getProfile(req.user!.userId);
      sendSuccess(res, profile, 'Profile fetched successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const profile = await ProfileService.updateProfile(
        req.user!.userId,
        validated
      );
      sendSuccess(res, profile, 'Profile updated successfully');
    } catch (err) {
      next(err);
    }
  }
}
