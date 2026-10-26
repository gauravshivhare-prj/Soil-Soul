import crypto from 'node:crypto';
import mongoose from 'mongoose';
import env from '../../config/env.js';
import { createError } from '../../utils/createError.js';
import { User } from '../users/user.model.js';

/**
 * Refresh sessions keep an admin or customer signed in across reloads, new tabs and access-token
 * expiry, without long-lived tokens in JavaScript-readable storage.
 *
 * - The browser holds `<userId>.<sessionId>.<secret>` in an httpOnly cookie scoped to /api/v1/auth.
 * - The server stores only a SHA-256 hash of the secret (on the user, `refreshSessions`).
 * - Every renewal rotates the secret and extends the lifetime (sliding expiry). Presenting an
 *   older secret again (outside a short grace period for concurrent tabs) is treated as theft:
 *   that session is ended.
 * - Sessions die with the account's tokenVersion: logout, password change/reset end them all.
 */

export const REFRESH_COOKIE = 'ss_refresh';
const COOKIE_PATH = '/api/v1/auth';
const MAX_SESSIONS = 10;
const GRACE_MS = 60 * 1000;

const ttlMs = () => env.refreshTokenTtlDays * 24 * 60 * 60 * 1000;
const hash = (secret) => crypto.createHash('sha256').update(secret).digest('hex');
const newSecret = () => crypto.randomBytes(32).toString('base64url');
const invalid = () => createError(401, 'REFRESH_INVALID', 'Your session has ended. Please sign in again.');

export function refreshCookieOptions() {
  const sameSite = env.authCookieSameSite;
  return {
    httpOnly: true,
    secure: env.isProduction || sameSite === 'none',
    sameSite,
    path: COOKIE_PATH,
    maxAge: ttlMs(),
  };
}

/** Reads the refresh cookie from the raw Cookie header (no cookie-parser dependency). */
export function readRefreshCookie(req) {
  const header = req.headers?.cookie;
  if (typeof header !== 'string' || !header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === REFRESH_COOKIE) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function parse(value) {
  if (typeof value !== 'string' || value.length > 200) return null;
  const [userId, sessionId, secret, extra] = value.split('.');
  if (extra !== undefined || !userId || !sessionId || !secret) return null;
  if (!/^[a-f0-9]{24}$/.test(userId) || !/^[0-9a-f-]{36}$/.test(sessionId) || !/^[A-Za-z0-9_-]{43}$/.test(secret)) return null;
  return { userId, sessionId, secret };
}

const cookieValue = (userId, sessionId, secret) => `${userId}.${sessionId}.${secret}`;

/**
 * Start a refresh session for a user who has just proven who they are (login, email verification,
 * password change). Keeps the newest MAX_SESSIONS sessions.
 * @returns {Promise<string>} the cookie value
 */
export async function startRefreshSession(userId) {
  const user = await User.findById(userId).select('_id tokenVersion');
  if (!user) throw invalid();
  const now = new Date();
  const sessionId = crypto.randomUUID();
  const secret = newSecret();
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        refreshSessions: {
          $each: [{ id: sessionId, tokenHash: hash(secret), tv: user.tokenVersion ?? 0, expiresAt: new Date(now.getTime() + ttlMs()), createdAt: now, lastUsedAt: now }],
          $slice: -MAX_SESSIONS,
        },
      },
    }
  );
  return cookieValue(user._id.toString(), sessionId, secret);
}

/**
 * Validate a refresh cookie and rotate it.
 * @returns {Promise<{ user: Object, cookie: string|null }>} `cookie` is the new value to set, or
 *   null when another tab renewed this session a moment ago (keep the browser's current cookie).
 * @throws 401 REFRESH_INVALID for anything that is not a live session
 */
export async function rotateRefreshSession(value) {
  const parts = parse(value);
  if (!parts) throw invalid();
  const user = await User.findById(parts.userId).select('+refreshSessions name email phone role status emailVerified tokenVersion');
  const session = user?.refreshSessions?.find((s) => s.id === parts.sessionId);
  if (!user || !session) throw invalid();

  const now = new Date();
  const presented = hash(parts.secret);
  const endSession = () => User.updateOne({ _id: user._id }, { $pull: { refreshSessions: { id: session.id } } });

  if (session.expiresAt <= now || session.tv !== (user.tokenVersion ?? 0) || user.status === 'disabled' || user.emailVerified === false) {
    await endSession();
    throw invalid();
  }

  const matches = (a, b) => typeof b === 'string' && b.length === a.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

  if (matches(presented, session.tokenHash)) {
    const secret = newSecret();
    const res = await User.updateOne(
      { _id: user._id, refreshSessions: { $elemMatch: { id: session.id, tokenHash: presented } } },
      {
        $set: {
          'refreshSessions.$.tokenHash': hash(secret),
          'refreshSessions.$.prevTokenHash': presented,
          'refreshSessions.$.prevValidUntil': new Date(now.getTime() + GRACE_MS),
          'refreshSessions.$.expiresAt': new Date(now.getTime() + ttlMs()),
          'refreshSessions.$.lastUsedAt': now,
        },
      }
    );
    // Lost a race with another renewal of the same secret: that one rotated it, so this request
    // falls into the grace window below on its next attempt; answer without a new cookie.
    if (res.modifiedCount === 0) return { user, cookie: null };
    return { user, cookie: cookieValue(parts.userId, session.id, secret) };
  }

  // A tab renewed this session moments ago and the browser already holds the newer cookie.
  if (matches(presented, session.prevTokenHash) && session.prevValidUntil && session.prevValidUntil > now) {
    return { user, cookie: null };
  }

  // An old secret was replayed: assume it was stolen and end this session.
  await endSession();
  throw invalid();
}

/** End every refresh session of a user (logout from all devices). */
export async function endAllRefreshSessions(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return;
  await User.updateOne({ _id: userId }, { $unset: { refreshSessions: 1 } });
}
