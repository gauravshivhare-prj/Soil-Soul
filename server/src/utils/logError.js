import env from '../config/env.js';

/**
 * Log an error without the error object, request data or connection strings.
 * Messages can contain user data (e.g. a duplicate-key email), so production
 * logs keep only the name, code and stack frames.
 */
export function logError(context, err) {
  const code = err?.code ? ` [${err.code}]` : '';
  const message = env.isProduction
    ? ''
    : `: ${String(err?.message ?? err)
        .replace(/mongodb(\+srv)?:\/\/\S+/gi, 'mongodb://[redacted]')
        .replace(/\/\/[^/\s:@]+:[^/\s@]+@/g, '//[redacted]@')}`;
  const frames = typeof err?.stack === 'string' ? `\n${err.stack.split('\n').slice(1, 6).join('\n')}` : '';
  console.error(`${context} ${err?.name ?? 'Error'}${code}${message}${frames}`);
}
