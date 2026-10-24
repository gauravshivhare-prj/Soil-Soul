import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import env from '../config/env.js';
import { User } from '../modules/users/user.model.js';
import { hashPassword, normalizeEmail } from '../modules/auth/auth.service.js';
import { createError } from '../utils/createError.js';
import { isDuplicateKeyError } from '../utils/duplicateKeyError.js';

/**
 * Create the first (and only) administrator account — there is no public admin registration.
 *
 *   npm run admin:bootstrap -- --name "Store Owner"
 *
 * The email and password may be read from ADMIN_EMAIL and ADMIN_PASSWORD. The password
 * may also be read from a hidden prompt (or ADMIN_BOOTSTRAP_PASSWORD when not interactive)
 * and is never printed. Refuses to run if any admin exists, if the email is already registered,
 * or if MONGODB_URI does not point at a local database (127.0.0.1, localhost or ::1).
 * Creating the first admin on a remote/production database is not supported by this tool.
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
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email') out.email = args[++i];
    else if (args[i] === '--name') out.name = args[++i];
  }
  return out;
}

function configuredAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim() || '';
}

/** Read a password without echoing it (TTY), confirmed twice. */
async function promptHidden(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = (text) => {
    if (text.startsWith(question)) process.stdout.write(question);
  };
  try {
    return await new Promise((resolve) => rl.question(question, resolve));
  } finally {
    rl.close();
    process.stdout.write('\n');
  }
}

async function readPassword() {
  if (process.stdin.isTTY) {
    const first = await promptHidden('Admin password: ');
    const second = await promptHidden('Repeat password: ');
    if (first !== second) throw createError(400, 'VALIDATION_ERROR', 'Passwords do not match.');
    return first;
  }
  const fromEnv = process.env.ADMIN_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!fromEnv) throw createError(400, 'VALIDATION_ERROR', 'No terminal: set ADMIN_PASSWORD or ADMIN_BOOTSTRAP_PASSWORD to provide the password.');
  return fromEnv;
}

export async function runCli(args = process.argv.slice(2)) {
  if (!isLocalMongoUri(env.mongoUri)) {
    console.error('[admin:bootstrap] Refusing to run: MONGODB_URI must point at a local database (127.0.0.1, localhost or ::1).');
    process.exitCode = 1;
    return;
  }
  const parsed = parseArgs(args);
  const email = parsed.email || configuredAdminEmail();
  const name = parsed.name || 'Store Administrator';
  if (!email) {
    console.error('[admin:bootstrap] Usage: set ADMIN_EMAIL or provide --email <email>; optionally provide --name "<full name>".');
    process.exitCode = 1;
    return;
  }

  try {
    const password = await readPassword();
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log(`[admin:bootstrap] Connected to local database "${mongoose.connection.name}".`);
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
