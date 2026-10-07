import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { fail } from '../utils/response.js';

function readToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

export function authenticate(req, res, next) {
  const token = readToken(req);
  if (!token) return fail(res, 401, 'Authentication required');
  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    fail(res, 401, 'Your session has expired. Please sign in again.');
  }
}

// Attaches req.user when a valid token is present, but never blocks.
export function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try { req.user = jwt.verify(token, env.jwtSecret); } catch { /* treat as guest */ }
  }
  next();
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : fail(res, 403, `This action is only available to ${roles.join(' or ')} accounts`);
