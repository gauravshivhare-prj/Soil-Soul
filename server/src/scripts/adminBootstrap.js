import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import env from '../config/env.js';
import { connectDatabase } from '../config/db.js';
import { User } from '../modules/users/user.model.js';
import { hashPassword, normalizeEmail } from '../modules/auth/auth.service.js';
import { createError } from '../utils/createError.js';
import { isDuplicateKeyError } from '../utils/duplicateKeyError.js';

/**
 * Create the first (and only) administrator account — there is no public admin registration.
 *
 *   npm run admin:bootstrap -- --name "Store Owner"
 *
 * The email and password are read from ADMIN_EMAIL and ADMIN_PASSWORD and are never printed.
 * Refuses to run if any admin exists, if the email is already registered,
 * Remote/Atlas databases require the explicit --atlas flag. Atlas writes additionally require
 * --apply and --database <name>; without --apply the command performs a metadata-only diagnosis.
 */

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

/** True only for plain mongodb:// URIs whose every host is loopback. */
export function isLocalMongoUri(uri) {
  const match = String(uri ?? '').trim().match(/^mongodb:\/\/(?:[^@/]*@)?([^/?#@]+)\/[^/?#]+(?:\?[^#]*)?$/);
  if (!match) return false;
  return match[1].split(',').every((entry) => {
    const host = entry.trim().match(/^\[([^\]]+)\](?::\d+)?$/)?.[1] ?? entry.trim().match(/^([^:[\]]+)(?::\d+)?$/)?.[1];
    return Boolean(host) && LOCAL_HOSTS.has(host.toLowerCase());
  });
}

/** Admin passwords: 12–128 characters with at least one letter and one digit. */
function validateAdminPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw createError(400, 'WEAK_PASSWORD', 'Admin password must be 12–128 characters and include a letter and a digit.');
  }
}

/**
 * Core logic (no prompts, no process exit) so it can be tested directly.
 * @returns {Promise<{ id: string, email: string }>}
 */
export async function bootstrapAdmin({ name, email, password }) {
  const cleanName = typeof name === 'string' ? name.trim() : '';
  if (cleanName.length < 2 || cleanName.length > 60) {
    throw createError(400, 'VALIDATION_ERROR', 'Name must be between 2 and 60 characters.');
  }
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) throw createError(400, 'VALIDATION_ERROR', 'A valid email address is required.');
  validateAdminPassword(password);

  if (await User.exists({ role: 'admin' })) {
    throw createError(409, 'ADMIN_EXISTS', 'An administrator already exists. This tool only creates the first admin.');
  }
  if (await User.exists({ email: cleanEmail })) {
    throw createError(409, 'EMAIL_EXISTS', 'An account with this email already exists; existing accounts are never promoted.');
  }

  try {
    const admin = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash: await hashPassword(password),
      role: 'admin',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    return { id: admin._id.toString(), email: admin.email };
  } catch (err) {
    if (isDuplicateKeyError(err)) throw createError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
    throw err;
  }
}

function parseArgs(args) {
  const out = { atlas: false, apply: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email') out.email = args[++i];
    else if (args[i] === '--name') out.name = args[++i];
    else if (args[i] === '--atlas') out.atlas = true;
    else if (args[i] === '--apply') out.apply = true;
    else if (args[i] === '--database') out.database = args[++i];
  }
  return out;
}

function configuredAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim() || '';
}

async function readPassword() {
  // ADMIN_BOOTSTRAP_PASSWORD is the earlier documented name and is still accepted as a fallback.
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (typeof password !== 'string' || password.length === 0) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      'ADMIN_PASSWORD (or ADMIN_BOOTSTRAP_PASSWORD) must be configured in server/.env before running admin bootstrap.'
    );
  }
  return password;
}

function safeStatus(user) {
  return user
    ? {
        exists: true,
        role: user.role,
        status: user.status ?? 'active',
        emailVerified: user.emailVerified !== false,
      }
    : { exists: false };
}

export async function runCli(args = process.argv.slice(2)) {
  const parsed = parseArgs(args);
  const isLocal = isLocalMongoUri(env.mongoUri);
  if (!isLocal && !parsed.atlas) {
    console.error('[admin:bootstrap] Refusing to run: MONGODB_URI must point at a local database (127.0.0.1, localhost or ::1).');
    process.exitCode = 1;
    return;
  }
  const email = parsed.email || configuredAdminEmail();
  const name = parsed.name || 'Store Administrator';
  if (!email) {
    console.error('[admin:bootstrap] Usage: set ADMIN_EMAIL or provide --email <email>; optionally provide --name "<full name>".');
    process.exitCode = 1;
    return;
  }

  if (!isLocal && parsed.apply && (!parsed.database || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(parsed.database))) {
    console.error('[admin:bootstrap] Atlas writes require --database <database-name> as an explicit target.');
    process.exitCode = 1;
    return;
  }

  try {
    await connectDatabase();
    const targetDatabase = mongoose.connection.name;
    console.log(`[admin:bootstrap] Connected to database "${targetDatabase}".`);
    if (!isLocal && parsed.apply && targetDatabase !== parsed.database) {
      console.error('[admin:bootstrap] Refusing to write: connected database does not match --database.');
      process.exitCode = 1;
      return;
    }

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      throw createError(400, 'VALIDATION_ERROR', 'A valid email address is required.');
    }
    const existingAdmin = await User.findOne({ role: 'admin' }).select('role status emailVerified');
    const matchingAccount = await User.findOne({ email: cleanEmail }).select('role status emailVerified');

    if (!isLocal && !parsed.apply) {
      console.log(`[admin:bootstrap] Diagnosis: admin account ${safeStatus(existingAdmin).exists ? 'exists' : 'does not exist'}; configured email account ${safeStatus(matchingAccount).exists ? 'exists' : 'does not exist'}.`);
      if (existingAdmin) console.log(`[admin:bootstrap] Existing admin status: role=${existingAdmin.role}, status=${existingAdmin.status ?? 'active'}, emailVerified=${existingAdmin.emailVerified !== false}.`);
      if (matchingAccount) console.log(`[admin:bootstrap] Configured email status: role=${matchingAccount.role}, status=${matchingAccount.status ?? 'active'}, emailVerified=${matchingAccount.emailVerified !== false}.`);
      console.log('[admin:bootstrap] No database write performed. Re-run with --atlas --apply --database <name> only after reviewing the target.');
      return;
    }

    const password = await readPassword();
    await bootstrapAdmin({ name, email, password });
    console.log('[admin:bootstrap] Administrator created successfully.');
  } catch (err) {
    const known = err?.expose === true && err.status < 500;
    console.error(`[admin:bootstrap] ${known ? err.message : `Failed (${err?.name ?? 'Error'}).`}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

const isDirectRun = Boolean(
  process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()
);
if (isDirectRun) runCli();
