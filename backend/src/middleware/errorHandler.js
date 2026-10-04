import { sendError } from '../utils/response.js';

/**
 * Global Error Handling Middleware
 * Prevents sensitive database errors or stack traces from leaking to clients
 */
export const globalErrorHandler = (err, req, res, next) => {
  console.error('[Unhandled Server Error]:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  });

  // Handle unique constraint violations
  if (err.code === '23505') {
    if (err.constraint === 'uq_society_utr') {
      return sendError(
        res,
        'This transaction UTR has already been submitted for this society.',
        'DUPLICATE_UTR',
        [],
        409
      );
    }
    return sendError(
      res,
      'A record with this unique identifier already exists.',
      'CONFLICT',
      [],
      409
    );
  }

  // Handle foreign key constraint failures
  if (err.code === '23503') {
    return sendError(
      res,
      'Referenced resource does not exist or cannot be deleted due to existing records.',
      'FOREIGN_KEY_VIOLATION',
      [],
      400
    );
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred. Please contact society administration.'
    : err.message || 'An unexpected error occurred.';

  return sendError(res, message, err.errorCode || 'INTERNAL_SERVER_ERROR', [], statusCode);
};
