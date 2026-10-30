import nodemailer from 'nodemailer';
import env from '../../config/env.js';

/**
 * Transactional email with swappable providers (EMAIL_PROVIDER):
 * - disabled: nothing is sent; returns { delivered: false } so callers can report it safely.
 * - test: messages are kept in an in-memory outbox for automated tests (refused in production).
 * - resend: Resend web API over HTTPS via fetch (no SDK dependency).
 * - gmail_smtp: Gmail SMTP with TLS over nodemailer (port 465, secure: true).
 * Codes, recipients, passwords and API keys are never logged.
 */

const TEMPLATES = Object.freeze({
  verify_email: ({ code }) => ({
    subject: 'Verify your Soil & Soul email',
    text: `Your Soil & Soul verification code is ${code}. It expires in 10 minutes.\n\nIf you did not create an account, you can ignore this email.`,
  }),
  password_reset: ({ code }) => ({
    subject: 'Reset your Soil & Soul password',
    text: `Your Soil & Soul password reset code is ${code}. It expires in 10 minutes.\n\nIf you did not request a reset, you can ignore this email; your password has not changed.`,
  }),
  password_changed: () => ({
    subject: 'Your Soil & Soul password was changed',
    text: 'Your Soil & Soul password was just changed and all sessions were signed out.\n\nIf this was not you, reset your password immediately.',
  }),
});

const testOutbox = [];

/** Messages captured by the test provider (tests only). */
export function getTestOutbox() {
  return testOutbox;
}

async function sendViaResend(to, { subject, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.emailApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.emailFrom, to: [to], subject, text }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Email provider responded with HTTP ${res.status}`);
}

let activeGmailTransporter = null;
let activeProviderOverride = null;

/** Override provider for isolated testing. */
export function setProviderOverride(provider) {
  activeProviderOverride = provider;
}

/**
 * Create a Gmail SMTP transporter with TLS (port 465, secure: true).
 */
export function createGmailTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: env.smtpUser,
      pass: env.smtpAppPassword,
    },
  });
}

/** Set or override the active Gmail transporter (useful for tests and connection verification). */
export function setGmailTransporter(transporter) {
  activeGmailTransporter = transporter;
}

function getGmailTransporter() {
  if (!activeGmailTransporter) {
    activeGmailTransporter = createGmailTransporter();
  }
  return activeGmailTransporter;
}

async function sendViaGmail(to, { subject, text }) {
  const transporter = getGmailTransporter();
  await transporter.sendMail({
    from: env.emailFrom,
    to,
    subject,
    text,
  });
}

/**
 * @param {{ to: string, template: keyof TEMPLATES, data?: Object }} message
 * @returns {Promise<{ delivered: boolean }>} never throws
 */
export async function sendEmail({ to, template, data = {} }) {
  const render = TEMPLATES[template];
  if (!render) throw new Error(`Unknown email template: ${template}`);
  const content = render(data);

  const provider = activeProviderOverride || env.emailProvider;

  try {
    if (provider === 'test') {
      testOutbox.push({ to, template, data: { ...data }, ...content, sentAt: new Date() });
      return { delivered: true };
    }
    if (provider === 'resend') {
      await sendViaResend(to, content);
      return { delivered: true };
    }
    if (provider === 'gmail_smtp') {
      await sendViaGmail(to, content);
      return { delivered: true };
    }
    console.warn(`[email] Delivery is not configured (EMAIL_PROVIDER=disabled); "${template}" email not sent.`);
    return { delivered: false };
  } catch (err) {
    console.error(`[email] "${template}" email could not be sent (${err?.name ?? 'Error'}).`);
    return { delivered: false };
  }
}
