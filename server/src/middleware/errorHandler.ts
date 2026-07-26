import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // Log full error details (including stack traces) on the server
  console.error('Centralized Error Logger - Full Trace:', error.stack || error);

  const status = error.statusCode || error.status || 500;
  
  // Mask raw details, internal paths, and SQL errors in production
  let message = error.message || 'Internal Server Error';
  if (process.env.NODE_ENV === 'production') {
    if (status >= 500 || error.code || error.detail || error.hint || error.severity) {
      message = 'An internal server error occurred.';
    }
  }

  res.status(status).json({ error: message });
};
