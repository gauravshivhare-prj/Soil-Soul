import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Product catalogue seeding is intentionally disabled. Product details must be entered and
 * reviewed manually. Canonical category initialization is available separately through the
 * authenticated POST /api/v1/admin/categories/initialize endpoint.
 *
 * This script performs no database connection, reads, or writes.
 */
export async function runCli() {
  console.error('[catalog:seed] Disabled: product catalogue entries are managed manually.');
  console.error('[catalog:seed] Use the authenticated category initialization endpoint for the four canonical roots.');
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) await runCli();
