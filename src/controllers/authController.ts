import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema
} from '../validators/authValidators';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class AuthController {
  static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(
        validated.email,
        validated.password,
        validated.fullName
      );
      sendSuccess(res, result, 'User registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(
        validated.email,
        validated.password
      );
      sendSuccess(res, result, 'Logged in successfully');
    } catch (err: any) {
      if (err.message === 'Invalid email or password.') {
        sendError(res, err.message, 401);
        return;
      }
      next(err);
    }
  }

  static async refresh(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = refreshTokenSchema.parse(req.body);
      const tokens = await AuthService.refreshToken(validated.refreshToken);
      sendSuccess(res, { tokens }, 'Tokens refreshed successfully');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to refresh token', 401);
    }
  }

  static async logout(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (req.user?.userId) {
        await AuthService.logout(req.user.userId);
      }
      sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }
}
