import mongoose from 'mongoose';
import argon2 from '@node-rs/argon2';
import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import { User, EMAIL_REGEX } from '../users/user.model.js';
import { createError } from '../../utils/createError.js';

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
function validateRegistrationInput({ name, email, password }) {
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

  return { trimmedName: name.trim(), normalizedEmail, password };
}

/**
 * Register a new user with safe defaults (role: customer).
 */
export async function registerUser({ name, email, password }) {
  const { trimmedName, normalizedEmail, password: validPassword } = validateRegistrationInput({
    name,
    email,
    password,
  });

  const passwordHash = await hashPassword(validPassword);

  let user;
  try {
    user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      role: 'customer', // strictly enforce customer role, ignore any caller role
    });
  } catch (err) {
    if (err.code === 11000) {
      throw createError(409, 'EMAIL_EXISTS', 'An account with this email address already exists.');
    }
    throw err;
  }

  const accessToken = signAccessToken(user);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
  };
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

  const accessToken = signAccessToken(user);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
  };
}

/**
 * Fetch a user profile by ID for authenticated requests.
 */
export async function getUserProfile(userId) {
  if (typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  }

  let user;
  try {
    user = await User.findById(userId).select('_id name email role');
  } catch {
    throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  }

  if (!user) {
    throw createError(401, 'USER_NOT_FOUND', 'User account no longer exists.');
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
