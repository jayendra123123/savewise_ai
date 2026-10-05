import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { sendError } from '../utils/apiResponse';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication required. No token provided.', 401, { code: 'NO_TOKEN' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      sendError(res, 'Access token expired.', 401, { code: 'TOKEN_EXPIRED' });
      return;
    }
    sendError(res, 'Invalid or corrupted access token.', 401, { code: 'INVALID_TOKEN' });
  }
};
