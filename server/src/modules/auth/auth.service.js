import mongoose from 'mongoose';
import argon2 from '@node-rs/argon2';
import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import { User, EMAIL_REGEX } from '../users/user.model.js';
import { createError } from '../../utils/createError.js';
import { isDuplicateKeyError, toDuplicateKeyError } from '../../utils/duplicateKeyError.js';
import { loginKeyHash, reserveLoginAttempt, clearLoginAttempts } from './loginLockout.js';
import { normalizeIndianMobile } from '../../utils/phone.js';
import { issueCode, consumeCode } from './verificationCodes.js';
import { sendEmail } from '../notifications/email.service.js';

// Precomputed Argon2id hash used to prevent timing-based user enumeration when an account is not found.
const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$1Usl7sWFpKXxPiUpeyHZRQ$nd7xCriQcTxrulC9o/siaIPgkD8b3fMv8OdKU3QK8Ag';

/**
 * Hash a password using Argon2id with secure defaults.
 */
export async function hashPassword(password) {
  return argon2.hash(password);
}

/**
 * Verify a password against an Argon2id hash safely.
 */
export async function verifyPassword(hash, password) {
  try {
    if (typeof hash !== 'string' || typeof password !== 'string') return false;
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Sign a short-lived JWT access token with expected claims.
 */
export function signAccessToken(user) {
  const userId = user._id ? user._id.toString() : user.id;
  const payload = {
    sub: userId,
    role: user.role,
    type: 'access',
    tv: Number.isInteger(user.tokenVersion) ? user.tokenVersion : 0,
  };

  return jwt.sign(payload, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtAccessExpiresIn,
  });
}

/**
 * Verify a JWT access token, enforcing algorithm, signature, and claim types.
 */
export function verifyAccessToken(token) {
  const decoded = jwt.verify(token, env.jwtSecret, {
    algorithms: ['HS256'],
  });

  if (decoded.type !== 'access' || typeof decoded.sub !== 'string' || !decoded.sub) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid access token claims.');
  }
  // Tokens issued before token versioning have no `tv` and count as version 0.
  if (decoded.tv !== undefined && !(Number.isInteger(decoded.tv) && decoded.tv >= 0)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid access token claims.');
  }

  return decoded;
}

/**
 * Normalize and validate an email address.
 */
export function normalizeEmail(email) {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 254) return null;
  if (!EMAIL_REGEX.test(normalized)) return null;
  return normalized;
}

/**
 * Validate user registration inputs.
 */
function validateRegistrationInput({ name, email, password, phone }) {
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) {
    throw createError(400, 'VALIDATION_ERROR', 'Name must be between 2 and 60 characters.');
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw createError(400, 'VALIDATION_ERROR', 'A valid email address is required.');
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw createError(400, 'VALIDATION_ERROR', 'Password must be between 8 and 128 characters.');
  }

  let normalizedPhone;
  if (phone !== undefined && phone !== null && phone !== '') {
    normalizedPhone = normalizeIndianMobile(phone);
    if (!normalizedPhone) {
      throw createError(400, 'VALIDATION_ERROR', 'Enter a valid Indian mobile number, or leave it blank.');
    }
  }

  return { trimmedName: name.trim(), normalizedEmail, password, normalizedPhone };
}

/**
 * Register a new user with safe defaults (role: customer).
 */
export async function registerUser({ name, email, password, phone }) {
  const { trimmedName, normalizedEmail, password: validPassword, normalizedPhone } = validateRegistrationInput({
    name,
    email,
    password,
    phone,
  });

  const passwordHash = await hashPassword(validPassword);

  let user;
  try {
    user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      role: 'customer', // strictly enforce customer role, ignore any caller role
      emailVerified: false,
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw toDuplicateKeyError(err);
    }
    throw err;
  }

  // No session until the email is verified. If sending fails the account is kept and the
  // customer can request a new code.
  const code = await issueCode(user._id, 'verify_email');
  const { delivered } = code
    ? await sendEmail({ to: user.email, template: 'verify_email', data: { code } })
    : { delivered: false };

  return {
    user: toProfile(user),
    verificationRequired: true,
    // Machine-readable twin of the message, so clients don't have to parse text.
    emailSent: Boolean(delivered),
    message: delivered
      ? 'Account created. Enter the code we emailed you to verify your address.'
      : 'Account created, but we could not send the verification email. Please request a new code.',
  };
}

const GENERIC_CODE_SENT = 'If an account with that email needs it, a code has been sent. Please check your inbox.';
const INVALID_CODE = () => createError(400, 'INVALID_OR_EXPIRED_CODE', 'The code is invalid or has expired.');

function requireEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw createError(400, 'VALIDATION_ERROR', 'A valid email address is required.');
  return normalizedEmail;
}

function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw createError(400, 'VALIDATION_ERROR', 'Password must be between 8 and 128 characters.');
  }
}

/**
 * Verify an email address with its emailed code and start a session.
 * Unknown emails, already-verified accounts, wrong, expired, used or exhausted codes all give
 * the same 400 INVALID_OR_EXPIRED_CODE.
 */
export async function verifyEmail({ email, code }) {
  const normalizedEmail = requireEmail(email);
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || user.emailVerified !== false || user.status === 'disabled') throw INVALID_CODE();
  if (!(await consumeCode(user._id, 'verify_email', typeof code === 'string' ? code.trim() : code))) throw INVALID_CODE();

  const verified = await User.findOneAndUpdate(
    { _id: user._id, emailVerified: false },
    { $set: { emailVerified: true, emailVerifiedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!verified) throw INVALID_CODE();

  return { user: toProfile(verified), accessToken: signAccessToken(verified) };
}

/**
 * Send a new verification code. Always returns the same generic message, whether or not the
 * account exists, is already verified, or sending was throttled.
 */
export async function resendVerification({ email }) {
  const normalizedEmail = requireEmail(email);
  const user = await User.findOne({ email: normalizedEmail });
  if (user && user.emailVerified === false && user.status !== 'disabled') {
    const code = await issueCode(user._id, 'verify_email');
    if (code) await sendEmail({ to: user.email, template: 'verify_email', data: { code } });
  }
  return { message: GENERIC_CODE_SENT };
}

/**
 * Start a password reset. Always returns the same generic message.
 */
export async function forgotPassword({ email }) {
  const normalizedEmail = requireEmail(email);
  const user = await User.findOne({ email: normalizedEmail });
  if (user && user.status !== 'disabled') {
    const code = await issueCode(user._id, 'password_reset');
    if (code) await sendEmail({ to: user.email, template: 'password_reset', data: { code } });
  }
  return { message: GENERIC_CODE_SENT };
}

/**
 * Complete a password reset with the emailed code. Ends every existing session (token version
 * bump); the user then logs in with the new password. Receiving the code also proves the email.
 */
export async function resetPassword({ email, code, newPassword }) {
  const normalizedEmail = requireEmail(email);
  validateNewPassword(newPassword);
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || user.status === 'disabled') throw INVALID_CODE();
  if (!(await consumeCode(user._id, 'password_reset', typeof code === 'string' ? code.trim() : code))) throw INVALID_CODE();

  const passwordHash = await hashPassword(newPassword);
  await User.updateOne(
    { _id: user._id },
    {
      $set: { passwordHash, ...(user.emailVerified === false ? { emailVerified: true, emailVerifiedAt: new Date() } : {}) },
      $inc: { tokenVersion: 1 },
    }
  );
  await clearLoginAttempts(loginKeyHash(normalizedEmail));
  await sendEmail({ to: user.email, template: 'password_changed' });
  return { message: 'Your password has been reset. Please log in with your new password.' };
}

/**
 * Change the password of the logged-in user. Requires the current password (counted by the
 * per-account lockout), ends every other session and returns a fresh token for this one.
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 128) {
    throw createError(400, 'VALIDATION_ERROR', 'Current password is required.');
  }
  validateNewPassword(newPassword);
  if (newPassword === currentPassword) {
    throw createError(400, 'VALIDATION_ERROR', 'The new password must be different from the current one.');
  }

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw createError(401, 'USER_NOT_FOUND', 'User account no longer exists.');

  const lockKey = loginKeyHash(user.email);
  await reserveLoginAttempt(lockKey);
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw createError(400, 'INVALID_CURRENT_PASSWORD', 'The current password is incorrect.');
  }
  await clearLoginAttempts(lockKey);

  const passwordHash = await hashPassword(newPassword);
  const updated = await User.findOneAndUpdate(
    { _id: user._id },
    { $set: { passwordHash }, $inc: { tokenVersion: 1 } },
    { returnDocument: 'after' }
  );
  await sendEmail({ to: user.email, template: 'password_changed' });
  return { message: 'Password changed. Other sessions have been signed out.', accessToken: signAccessToken(updated) };
}

/**
 * Login a user by email and password, returning generic error on failure.
 */
export async function loginUser({ email, password }) {
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw createError(400, 'VALIDATION_ERROR', 'Email and password are required.');
  }

  if (password.length > 128) {
    throw createError(400, 'VALIDATION_ERROR', 'Password cannot exceed 128 characters.');
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    // Equalize timing even if email format is invalid
    await verifyPassword(DUMMY_HASH, password);
    throw createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  // Per-account lockout (counted for unknown emails too, so it reveals nothing): 429 while locked.
  const lockKey = loginKeyHash(normalizedEmail);
  await reserveLoginAttempt(lockKey);

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) {
    // Equalize timing when user is not found to prevent account enumeration
    await verifyPassword(DUMMY_HASH, password);
    throw createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const isValid = await verifyPassword(user.passwordHash, password);
  if (!isValid) {
    throw createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  // Only reported after a correct password, so it reveals nothing to someone guessing.
  if (user.status === 'disabled') {
    throw createError(403, 'ACCOUNT_DISABLED', 'This account has been disabled.');
  }

  // Password proven, so this is not guessing: reset the counter, but issue no session yet.
  if (user.emailVerified === false) {
    await clearLoginAttempts(lockKey);
    throw createError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email address before logging in.');
  }

  await clearLoginAttempts(lockKey);
  const accessToken = signAccessToken(user);

  return {
    user: toProfile(user),
    accessToken,
  };
}

/** The user's own profile as returned to them (never status, token version or hashes). */
export function toProfile(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
  };
}

/**
 * Load what authentication needs for a user: the public profile plus the token version and
 * account status (the latter two are never part of the profile returned to clients).
 */
export async function getAuthState(userId) {
  if (typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  }

  let user;
  try {
    user = await User.findById(userId).select('_id name email phone role status tokenVersion emailVerified');
  } catch {
    throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  }

  if (!user) {
    throw createError(401, 'USER_NOT_FOUND', 'User account no longer exists.');
  }

  return {
    user: toProfile(user),
    tokenVersion: user.tokenVersion ?? 0,
    status: user.status ?? 'active',
    emailVerified: user.emailVerified !== false,
  };
}

/**
 * Fetch a user profile by ID for authenticated requests.
 */
export async function getUserProfile(userId) {
  return (await getAuthState(userId)).user;
}

/**
 * Log out everywhere: bump the token version so every access token issued so far is rejected.
 */
export async function logoutUser(userId) {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  return { message: 'Logged out. All sessions for this account have ended.' };
}
