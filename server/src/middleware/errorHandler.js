import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { fail } from '../utils/response.js';

export const notFound = (_req, res) => fail(res, 404, 'Route not found');

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return fail(res, err.status, err.message);
  if (err?.type === 'entity.parse.failed') return fail(res, 400, 'Invalid JSON body');
  if (err?.code === '23505') return fail(res, 409, 'This record already exists');
  if (err?.code === '23503') return fail(res, 400, 'A related record was not found');
  console.error(err);
  fail(res, 500, env.isProd ? 'Something went wrong. Please try again.' : err?.message || 'Server error');
}
