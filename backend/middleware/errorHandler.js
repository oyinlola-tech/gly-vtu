import { logger } from '../utils/logger.js';

export function globalErrorHandler(err, req, res, next) {
  logger.error('Unhandled error', {
    message: err?.message,
    stack: err?.stack,
    path: req?.path,
    method: req?.method,
  });

  res.status(500).json({
    error: 'An unexpected error occurred',
    code: 'INTERNAL_SERVER_ERROR',
  });
}

