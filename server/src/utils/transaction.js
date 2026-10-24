import mongoose from 'mongoose';

/** True when the connected MongoDB deployment supports multi-document transactions. */
export function supportsTransactions() {
  const type = mongoose.connection.getClient?.()?.topology?.description?.type;
  return type === 'ReplicaSetWithPrimary' || type === 'Sharded';
}

/**
 * Run `work(session)` in a transaction when supported (retried by the driver on transient errors),
 * otherwise run `work(null)` directly. Callers must keep standalone behaviour safe on their own.
 */
export async function withOptionalTransaction(work) {
  if (!supportsTransactions()) return work(null);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
