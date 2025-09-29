import { Request, Response, NextFunction } from 'express';

interface ErrorWithStatus extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export function errorHandler(
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  // Extract status code, defaulting to 500 for internal errors
  const status = err.status || 500;

  // Extract error code, defaulting to "INTERNAL"
  const code = err.code || 'INTERNAL';

  // Extract error message, defaulting to "Unexpected error"
  const message = err.message || 'Unexpected error';

  // Build error response
  const errorResponse: any = {
    error: {
      code,
      message
    }
  };

  // Include details if available
  if (err.details) {
    errorResponse.error.details = err.details;
  }

  res.status(status).json(errorResponse);
}
