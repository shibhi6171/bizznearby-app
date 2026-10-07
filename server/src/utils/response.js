// Every response uses the same shape: { success, data, error }
export const ok = (res, data = null, status = 200) =>
  res.status(status).json({ success: true, data, error: null });

export const fail = (res, status, error, details) =>
  res.status(status).json({ success: false, data: null, error, ...(details ? { details } : {}) });

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
