import { fileURLToPath } from 'node:url';

// Load server/.env if present; variables already set in the environment win.
// Skipped under NODE_ENV=test, and when SKIP_DOTENV=1 (set by tests that spawn development or
// production processes), so test runs are hermetic: they never inherit a developer's .env (email
// provider, database URI, keys) and rely only on the variables they set.
if (process.env.NODE_ENV !== 'test' && process.env.SKIP_DOTENV !== '1') {
  try {
    process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

// Errors name the variable but never echo its value.
function int(name, fallback, min, max) {
  const raw = process.env[name];
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Invalid ${name}: must be an integer between ${min} and ${max}.`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('Invalid NODE_ENV: expected development, test or production.');
}
const isProduction = nodeEnv === 'production';

if (isProduction && !process.env.CORS_ORIGIN) {
  throw new Error('Missing CORS_ORIGIN: production requires explicit https origins.');
}
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim()).filter(Boolean);
for (const origin of corsOrigins) {
  // No wildcard (credentials are enabled), no paths, https only in production.
  if (!(isProduction ? /^https:\/\/[^\s/]+$/ : /^https?:\/\/[^\s/]+$/).test(origin)) {
    throw new Error(`Invalid CORS_ORIGIN: use ${isProduction ? 'https' : 'http(s)'}://host[:port] origins, comma-separated.`);
  }
}

const mongoUri = (process.env.MONGODB_URI || '').trim();
if (!mongoUri && nodeEnv !== 'test') {
  throw new Error('Missing MONGODB_URI. Copy server/.env.example to server/.env and set it.');
}
if (mongoUri && !/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
  throw new Error('Invalid MONGODB_URI: it must start with mongodb:// or mongodb+srv://');
}
// mongodb+srv enables TLS by default; plain mongodb:// must opt in.
if (isProduction && (/[?&](tls|ssl)=false\b/i.test(mongoUri) || !/^mongodb\+srv:\/\/|[?&](tls|ssl)=true\b/i.test(mongoUri))) {
  throw new Error('Invalid MONGODB_URI: production requires TLS (mongodb+srv:// or tls=true).');
}
// These keep encryption but skip certificate/hostname checks (allows MITM).
if (isProduction && /[?&](tlsInsecure|tlsAllowInvalidCertificates|tlsAllowInvalidHostnames)=true\b/i.test(mongoUri)) {
  throw new Error('Invalid MONGODB_URI: production must not disable TLS certificate or hostname checks.');
}

// JWT signing secret: minimum 32 characters required for secure HS256 operations.
const jwtSecret = (process.env.JWT_SECRET || (nodeEnv === 'test' ? 'test_jwt_secret_min_32_characters_long_for_testing_purposes_only' : '')).trim();
if (!jwtSecret) {
  throw new Error('Missing JWT_SECRET. Copy server/.env.example to server/.env and set it.');
}
if (jwtSecret.length < 32) {
  throw new Error('Invalid JWT_SECRET: must be at least 32 characters long for secure HS256 signing.');
}

const jwtAccessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN || '15m').trim();

// Refresh sessions (httpOnly cookie): renew short-lived access tokens without signing in again.
// The lifetime slides: each renewal extends it. SameSite must be "none" (with HTTPS) only when the
// shop and the API are served from different sites; "lax" works when they share a site.
const authCookieSameSite = (process.env.AUTH_COOKIE_SAMESITE || 'lax').trim().toLowerCase();
if (!['lax', 'strict', 'none'].includes(authCookieSameSite)) {
  throw new Error('Invalid AUTH_COOKIE_SAMESITE: expected lax, strict or none.');
}

// Transactional email (verification and password-reset codes).
// disabled: nothing is sent (codes cannot be delivered); test: in-memory outbox for automated tests;
// resend: Resend web API (needs a verified sending domain); gmail_smtp: Gmail SMTP with TLS.
const emailProvider = (process.env.EMAIL_PROVIDER || (nodeEnv === 'test' ? 'test' : 'disabled')).trim().toLowerCase();
if (!['disabled', 'test', 'resend', 'gmail_smtp'].includes(emailProvider)) {
  throw new Error('Invalid EMAIL_PROVIDER: expected disabled, test, resend or gmail_smtp.');
}
if (emailProvider === 'test' && isProduction) {
  throw new Error('Invalid EMAIL_PROVIDER: the test provider cannot be used in production.');
}
const emailFrom = (process.env.EMAIL_FROM || '').trim();
const emailApiKey = (process.env.EMAIL_API_KEY || '').trim();
if (emailProvider === 'resend' && (!emailFrom || !emailApiKey)) {
  throw new Error('Missing EMAIL_FROM or EMAIL_API_KEY: both are required when EMAIL_PROVIDER=resend.');
}
const smtpUser = (process.env.SMTP_USER || '').trim();
const smtpAppPassword = (process.env.SMTP_APP_PASSWORD || '').trim();
if (emailProvider === 'gmail_smtp' && (!emailFrom || !smtpUser || !smtpAppPassword)) {
  throw new Error('Missing EMAIL_FROM, SMTP_USER or SMTP_APP_PASSWORD: all are required when EMAIL_PROVIDER=gmail_smtp.');
}

export const env = Object.freeze({
  env: nodeEnv,
  isProduction,
  port: int('PORT', 5000, 1, 65535),
  corsOrigins,
  mongoUri,
  jwtSecret,
  jwtAccessExpiresIn,
  refreshTokenTtlDays: int('REFRESH_TOKEN_TTL_DAYS', 7, 1, 90),
  authCookieSameSite,
  emailProvider,
  emailFrom,
  emailApiKey,
  smtpUser,
  smtpAppPassword,
  // Max auth requests per client IP per 15 minutes.
  authRateLimitMax: int('AUTH_RATE_LIMIT_MAX', 20, 1, 10000),
  // Max API requests per client IP per 15 minutes.
  rateLimitMax: int('RATE_LIMIT_MAX', 300, 1, 100000),
  // Trusted reverse-proxy hops; only honoured in production so X-Forwarded-For can't be spoofed.
  trustProxyHops: isProduction ? int('TRUST_PROXY', 0, 0, 10) : 0,
});

export default env;
