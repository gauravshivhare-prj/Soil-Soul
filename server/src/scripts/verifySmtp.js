import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import env from '../config/env.js';

/**
 * Safely verify Gmail SMTP connection and authentication credentials without sending an email.
 * Never prints or exposes secrets, passwords, or tokens.
 *
 * Usage:
 *   npm run smtp:verify
 */
export async function verifySmtpConnection() {
  if (env.emailProvider !== 'gmail_smtp') {
    console.warn(`[smtp:verify] Note: EMAIL_PROVIDER is currently '${env.emailProvider}' (expected 'gmail_smtp').`);
    console.warn('[smtp:verify] To test Gmail SMTP, set EMAIL_PROVIDER=gmail_smtp in server/.env.');
  }

  if (!env.smtpUser || !env.smtpAppPassword) {
    throw new Error('SMTP credentials missing: SMTP_USER and SMTP_APP_PASSWORD must be set in server/.env.');
  }

  console.log('[smtp:verify] Connecting to smtp.gmail.com:465 (TLS)...');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: env.smtpUser,
      pass: env.smtpAppPassword,
    },
  });

  try {
    await transporter.verify();
    console.log('[smtp:verify] SUCCESS: Gmail SMTP connection and credentials verified successfully.');
    console.log('[smtp:verify] No email was sent during this verification.');
    return true;
  } catch (err) {
    // Redact error: display only error code or name, never echoing passwords or auth payloads
    const safeMsg = err.response || err.code || err.name || 'Authentication failed';
    throw new Error(`SMTP verification failed (${safeMsg}). Check SMTP_USER and Google App Password.`);
  }
}

async function runCli() {
  try {
    await verifySmtpConnection();
  } catch (err) {
    console.error(`[smtp:verify] ERROR: ${err.message}`);
    process.exitCode = 1;
  }
}

const isDirectRun = Boolean(
  process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()
);
if (isDirectRun) runCli();

