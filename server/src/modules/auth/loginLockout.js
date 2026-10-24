import crypto from 'node:crypto';
import env from '../../config/env.js';
import { createError } from '../../utils/createError.js';
import { LoginAttempt } from './loginAttempt.model.js';

export const LOGIN_LOCKOUT = Object.freeze({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
});

/** HMAC of the normalized email: stable per account, useless without the server secret. */
export function loginKeyHash(normalizedEmail) {
  return crypto.createHmac('sha256', env.jwtSecret).update(`login-lockout:${normalizedEmail}`).digest('hex');
}

function tooManyAttempts(lockUntil, now) {
  const err = createError(429, 'TOO_MANY_ATTEMPTS', 'Too many failed login attempts. Please try again later.');
  err.retryAfterSeconds = Math.max(1, Math.ceil((lockUntil.getTime() - now.getTime()) / 1000));
  return err;
}

/**
 * Atomically reserve one login attempt for this account key, before the password is checked.
 * Up to `maxAttempts` attempts per window may proceed; the attempt that reaches the limit arms
 * the lock, so concurrent attempts can never verify more passwords than the limit allows.
 * A successful login clears the record (see clearLoginAttempts).
 *
 * @throws 429 TOO_MANY_ATTEMPTS (with retryAfterSeconds) while the account key is locked
 */
export async function reserveLoginAttempt(keyHash, now = new Date()) {
  const windowCutoff = new Date(now.getTime() - LOGIN_LOCKOUT.windowMs);
  const lockEnd = new Date(now.getTime() + LOGIN_LOCKOUT.lockMs);
  const expiresAt = new Date(now.getTime() + LOGIN_LOCKOUT.windowMs + LOGIN_LOCKOUT.lockMs);

  const update = [
    // Decide with the stored values first: is the key locked right now?
    { $set: { allowed: { $not: [{ $gt: [{ $ifNull: ['$lockUntil', null] }, now] }] } } },
    {
      $set: {
        windowExpired: {
          $or: [{ $eq: [{ $ifNull: ['$windowStart', null] }, null] }, { $lt: ['$windowStart', windowCutoff] }],
        },
      },
    },
    {
      $set: {
        failures: {
          $cond: [
            '$allowed',
            { $cond: ['$windowExpired', 1, { $add: [{ $ifNull: ['$failures', 0] }, 1] }] },
            '$failures',
          ],
        },
        windowStart: { $cond: [{ $and: ['$allowed', '$windowExpired'] }, now, '$windowStart'] },
      },
    },
    {
      $set: {
        lockUntil: {
          $cond: [{ $and: ['$allowed', { $gte: ['$failures', LOGIN_LOCKOUT.maxAttempts] }] }, lockEnd, '$lockUntil'],
        },
        expiresAt: { $cond: ['$allowed', expiresAt, '$expiresAt'] },
      },
    },
    { $unset: 'windowExpired' },
  ];

  let record;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      record = await LoginAttempt.findOneAndUpdate({ keyHash }, update, {
        upsert: true,
        returnDocument: 'after',
        lean: true,
        updatePipeline: true, // one atomic read-decide-write on the server
      });
      break;
    } catch (err) {
      // Two first attempts upserting the same key at once: the loser retries as an update.
      if (err?.code !== 11000 || attempt === 1) throw err;
    }
  }

  if (!record.allowed) throw tooManyAttempts(record.lockUntil, now);
}

/** Reset the counter after a successful login. */
export async function clearLoginAttempts(keyHash) {
  await LoginAttempt.deleteOne({ keyHash });
}
