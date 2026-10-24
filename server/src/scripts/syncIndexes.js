import path from 'node:path';
import { fileURLToPath } from 'node:url';
import env from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';

// Registered domain models whose indexes are managed by Mongoose
import { User } from '../modules/users/user.model.js';
import { Category } from '../modules/categories/category.model.js';
import { Product } from '../modules/products/product.model.js';
import { Cart } from '../modules/cart/cart.model.js';
import { Order } from '../modules/orders/order.model.js';
import { LoginAttempt } from '../modules/auth/loginAttempt.model.js';
import { VerificationCode } from '../modules/auth/verificationCode.model.js';
import { StockMovement } from '../modules/inventory/stockMovement.model.js';

/**
 * List of domain models registered for index management.
 */
export const MANAGED_MODELS = Object.freeze([
  { name: 'User', model: User },
  { name: 'Category', model: Category },
  { name: 'Product', model: Product },
  { name: 'Cart', model: Cart },
  { name: 'Order', model: Order },
  { name: 'LoginAttempt', model: LoginAttempt },
  { name: 'VerificationCode', model: VerificationCode },
  { name: 'StockMovement', model: StockMovement },
]);

/**
 * Describe an index error without echoing its message: duplicate-key messages
 * contain the duplicated field values (e.g. customer emails).
 */
export function describeIndexError(err) {
  const code = err?.code ? ` [${err.code}]` : '';
  const hint =
    err?.code === 11000
      ? ' Duplicate values exist for a unique index; resolve them manually (no data was modified).'
      : '';
  return `${err?.name ?? 'Error'}${code}.${hint}`;
}

/**
 * Create all schema-defined indexes for the registered models.
 *
 * Creation-only by design: uses `Model.createIndexes()`, never `syncIndexes()`,
 * so indexes that are not declared in the schemas (DBA, Atlas Search, TTL)
 * are never dropped. Never deletes documents; a unique index whose data has
 * duplicates fails and is reported instead.
 *
 * @param {Object} options
 * @param {boolean} [options.silent=false] - Suppress console output
 * @param {string} [options.mongoUri] - Configured connection string (precondition check only)
 * @returns {Promise<Array<{ model: string, success: boolean, count?: number, indexes?: string[], error?: string }>>}
 */
export async function syncDatabaseIndexes({ silent = false, mongoUri = env.mongoUri } = {}) {
  if (!mongoUri || typeof mongoUri !== 'string' || !mongoUri.trim()) {
    throw new Error('Database connection URI is not configured. Set MONGODB_URI before running index synchronization.');
  }

  const results = [];

  for (const { name, model } of MANAGED_MODELS) {
    try {
      if (!silent) console.log(`[db:index] Ensuring schema indexes for "${name}"...`);
      await model.createIndexes();

      const indexNames = (await model.collection.indexes()).map((idx) => idx.name);
      results.push({ model: name, success: true, count: indexNames.length, indexes: indexNames });
      if (!silent) console.log(`[db:index] OK: "${name}" (${indexNames.length} indexes: ${indexNames.join(', ')}).`);
    } catch (err) {
      const error = describeIndexError(err);
      results.push({ model: name, success: false, error });
      if (!silent) console.error(`[db:index] FAILED: "${name}": ${error}`);
    }
  }

  return results;
}

/**
 * CLI runner. Exits non-zero on any failure and always closes the connection.
 * In production an explicit `--yes` is required so it can't run by accident.
 */
export async function runCli(args = process.argv.slice(2)) {
  if (env.isProduction && !args.includes('--yes')) {
    console.error('[db:index] Refusing to run in production without --yes (npm run db:index -- --yes).');
    process.exitCode = 1;
    return;
  }

  console.log('[db:index] Creating schema-defined indexes (creation-only; existing indexes are never dropped)...');
  try {
    await connectDatabase();
    const results = await syncDatabaseIndexes();
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      console.error(`[db:index] Finished with ${failures.length} model error(s).`);
      process.exitCode = 1;
    } else {
      console.log(`[db:index] All ${results.length} models indexed.`);
    }
  } catch (err) {
    // Error name/code only: connection errors can include host details.
    console.error(`[db:index] Fatal error: ${describeIndexError(err)}`);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase().catch(() => {});
  }
}

const isDirectRun = Boolean(
  process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()
);

if (isDirectRun) {
  runCli();
}
