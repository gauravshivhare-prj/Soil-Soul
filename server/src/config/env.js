import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates and exposes safe environment configurations.
 * Fails fast if configuration is invalid without exposing sensitive values.
 */
function validateEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const allowedEnvs = ['development', 'test', 'production'];

  if (!allowedEnvs.includes(nodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV "${nodeEnv}". Expected one of: ${allowedEnvs.join(', ')}`
    );
  }

  const rawPort = process.env.PORT || '5000';
  const port = Number.parseInt(rawPort, 10);

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      'Invalid PORT configuration: PORT must be an integer between 1 and 65535.'
    );
  }

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

  return Object.freeze({
    env: nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
    port,
    cors: Object.freeze({
      origin: corsOrigin,
    }),
  });
}

export const env = validateEnv();
export default env;
