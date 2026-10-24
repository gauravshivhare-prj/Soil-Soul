import { rateLimit } from 'express-rate-limit';
import env from '../../config/env.js';
import { createError } from '../../utils/createError.js';
import { verifyAccessToken, getAuthState } from './auth.service.js';

/**
 * Authentication middleware that verifies access token from Bearer Authorization header.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw createError(401, 'UNAUTHORIZED', 'Authentication token required.');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw createError(401, 'UNAUTHORIZED', 'Authentication token required.');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw createError(401, 'TOKEN_EXPIRED', 'Access token has expired.');
      }
      throw createError(401, 'INVALID_TOKEN', 'Invalid access token.');
    }

    const { user, tokenVersion, status, emailVerified } = await getAuthState(decoded.sub);
    if ((decoded.tv ?? 0) !== tokenVersion) {
      throw createError(401, 'TOKEN_REVOKED', 'This session has ended. Please log in again.');
    }
    if (status === 'disabled') {
      throw createError(403, 'ACCOUNT_DISABLED', 'This account has been disabled.');
    }
    if (!emailVerified) {
      throw createError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email address before continuing.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-based authorization middleware factory.
 * Verifies that the authenticated user possesses one of the allowed roles.
 * Must be used after `authenticate` middleware.
 *
 * @param {...string|string[]} roles - Allowed role(s) (e.g. 'admin' or 'admin', 'customer')
 * @returns {import('express').RequestHandler}
 */
export function authorize(...roles) {
  const allowed = roles.flat().filter(Boolean);

  return (req, res, next) => {
    try {
      if (!req.user) {
        throw createError(401, 'UNAUTHORIZED', 'Authentication token required.');
      }

      if (allowed.length > 0 && !allowed.includes(req.user.role)) {
        throw createError(403, 'FORBIDDEN', 'Insufficient permissions.');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Stricter rate limiter specifically for authentication endpoints.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.authRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.env === 'test', // Do not throttle test suites
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});
