/**
 * Unified Response Envelopes
 * Per Technical Specification 9.1
 */

export const sendSuccess = (res, data = {}, message = 'Operation completed successfully.', meta = null, statusCode = 200) => {
  const payload = {
    success: true,
    data,
    message,
  };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
};

export const sendError = (res, message = 'An error occurred.', code = 'INTERNAL_ERROR', details = [], statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
};
