import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Error Handler]:', err);

  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formatted = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    sendError(res, 'Validation failed for request input', 422, formatted);
    return;
  }

  // Handle Mongoose Duplicate Key Error (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'record';
    sendError(res, `A record with this ${field} already exists.`, 409);
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    sendError(res, `Invalid resource identifier format: ${err.value}`, 400);
    return;
  }

  // Default Internal Server Error
  sendError(
    res,
    err.message || 'An unexpected internal server error occurred',
    err.status || 500
  );
};
