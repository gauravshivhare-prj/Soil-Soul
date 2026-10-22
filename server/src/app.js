import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import env from './config/env.js';
import apiRouter from './routes/index.js';
import { logError } from './utils/logError.js';

const app = express();

// Query values stay flat strings (`?email[$ne]=x` can't become an object).
app.set('query parser', 'simple');
// Trust X-Forwarded-For only for configured proxy hops (always 0 outside production).
if (env.trustProxyHops > 0) app.set('trust proxy', env.trustProxyHops);

app.use(helmet());
app.use(cors({ origin: env.corsOrigins, credentials: true }));

app.use(
  '/api/v1',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req) => req.path === '/health' || req.path === '/health/ready', // load balancers / uptime checks
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
  })
);

// Reject `$`-prefixed keys in request bodies, so request data can never carry
// MongoDB operators into a filter. Operators written in code are unaffected.
const rejectOperatorKeys = (key, value) => {
  if (key.startsWith('$')) throw new SyntaxError('Disallowed key');
  return value;
};
app.use(express.json({ limit: '100kb', reviver: rejectOperatorKeys }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
// Form bodies are flat (extended: false), so checking their top-level keys is enough.
app.use((req, res, next) => {
  try {
    if (req.is('application/x-www-form-urlencoded')) Object.keys(req.body).forEach((key) => rejectOperatorKeys(key));
    next();
  } catch {
    next(Object.assign(new Error('Request body contains disallowed keys.'), { status: 400, expose: true, code: 'INVALID_BODY' }));
  }
});

app.use('/api/v1', apiRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Cannot ${req.method} ${req.path}` } });
});

const BODY_ERRORS = {
  'entity.parse.failed': { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' },
  'entity.too.large': { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' },
};

// Only 4xx errors marked `expose: true` (as body-parser does) show their message/code, e.g.
// throw Object.assign(new Error('Product not found'), { status: 404, expose: true, code: 'PRODUCT_NOT_FOUND' })
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const raw = Number(err.status ?? err.statusCode);
  const status = raw >= 400 && raw < 600 ? raw : 500;
  if (status >= 500) logError(`[error] ${req.method} ${req.path} ->`, err);

  const error =
    status < 500 && err.expose === true
      ? BODY_ERRORS[err.type] ?? { code: typeof err.code === 'string' ? err.code : 'REQUEST_ERROR', message: err.message }
      : status < 500
        ? { code: 'REQUEST_ERROR', message: 'The request could not be processed.' }
        : { code: 'INTERNAL_ERROR', message: 'Internal Server Error' };
  res.status(status).json({ success: false, error });
});

export default app;
