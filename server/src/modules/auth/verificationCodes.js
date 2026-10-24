import crypto from 'node:crypto';
import env from '../../config/env.js';
import { VerificationCode } from './verificationCode.model.js';

export const CODE_POLICY = Object.freeze({
  ttlMs: 10 * 60 * 1000,
  maxAttempts: 5,
  resendCooldownMs: 60 * 1000,
  maxSendsPerHour: 5,
  hourMs: 60 * 60 * 1000,
});

function hashCode(userId, purpose, code) {
  return crypto.createHmac('sha256', env.jwtSecret).update(`otp:${purpose}:${userId}:${code}`).digest('hex');
}

/**
 * Issue a new 6-digit code for (user, purpose), replacing any previous one, unless sending is
 * throttled (60 s cooldown, at most 5 sends per hour). Atomic: the throttle check and the
 * replacement happen in one conditional update, so concurrent requests cannot both send.
 *
 * @returns {Promise<string|null>} the plain code (to be emailed, never logged), or null if throttled
 */
export async function issueCode(userId, purpose, now = new Date()) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const cooldownCutoff = new Date(now.getTime() - CODE_POLICY.resendCooldownMs);
  const hourCutoff = new Date(now.getTime() - CODE_POLICY.hourMs);
  const windowExpired = { $lte: [{ $ifNull: ['$windowStart', new Date(0)] }, hourCutoff] };

  try {
    const doc = await VerificationCode.findOneAndUpdate(
      {
        user: userId,
        purpose,
        lastSentAt: { $lte: cooldownCutoff },
        $or: [{ windowStart: { $lte: hourCutoff } }, { sentCount: { $lt: CODE_POLICY.maxSendsPerHour } }],
      },
      [
        {
          $set: {
            codeHash: hashCode(String(userId), purpose, code),
            expiresAt: new Date(now.getTime() + CODE_POLICY.ttlMs),
            attempts: 0,
            consumedAt: null,
            lastSentAt: now,
            sentCount: { $cond: [windowExpired, 1, { $add: [{ $ifNull: ['$sentCount', 0] }, 1] }] },
            windowStart: { $cond: [windowExpired, now, '$windowStart'] },
            purgeAt: new Date(now.getTime() + CODE_POLICY.hourMs + CODE_POLICY.ttlMs),
          },
        },
      ],
      { upsert: true, returnDocument: 'after', updatePipeline: true, lean: true }
    );
    return doc ? code : null;
  } catch (err) {
    // The (user, purpose) record exists but is throttled: the upsert collides with it.
    if (err?.code === 11000) return null;
    throw err;
  }
}

/**
 * Check and consume a code. Each check counts as an attempt (at most 5 per code); a code is
 * single-use and expires after 10 minutes. Comparison is constant-time.
 *
 * @returns {Promise<boolean>}
 */
export async function consumeCode(userId, purpose, code, now = new Date()) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return false;

  const record = await VerificationCode.findOneAndUpdate(
    { user: userId, purpose, consumedAt: null, expiresAt: { $gt: now }, attempts: { $lt: CODE_POLICY.maxAttempts } },
    { $inc: { attempts: 1 } },
    { returnDocument: 'after', lean: true }
  );
  if (!record) return false;

  const expected = Buffer.from(record.codeHash, 'hex');
  const actual = Buffer.from(hashCode(String(userId), purpose, code), 'hex');
  if (!crypto.timingSafeEqual(expected, actual)) return false;

  // Single use, even under concurrent submissions of the same correct code.
  const consumed = await VerificationCode.updateOne({ _id: record._id, consumedAt: null }, { $set: { consumedAt: now } });
  return consumed.modifiedCount === 1;
}
