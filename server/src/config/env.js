import { fileURLToPath } from 'node:url';

// Load server/.env if present; variables already set in the environment win.
try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
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

export const env = Object.freeze({
  env: nodeEnv,
  isProduction,
  port: int('PORT', 5000, 1, 65535),
  corsOrigins,
  mongoUri,
  // Max API requests per client IP per 15 minutes.
  rateLimitMax: int('RATE_LIMIT_MAX', 300, 1, 100000),
  // Trusted reverse-proxy hops; only honoured in production so X-Forwarded-For can't be spoofed.
  trustProxyHops: isProduction ? int('TRUST_PROXY', 0, 0, 10) : 0,
});

export default env;
