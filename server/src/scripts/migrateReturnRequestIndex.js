import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

export const OLD_RETURN_INDEX = Object.freeze({
  name: 'order_1_itemIndex_1',
  key: Object.freeze({ order: 1, itemIndex: 1 }),
  unique: true,
});

export const NEW_RETURN_INDEX = Object.freeze({
  name: 'order_1_itemIndex_1_createdAt_-1',
  key: Object.freeze({ order: 1, itemIndex: 1, createdAt: -1 }),
  unique: false,
});

const ALLOWED_DATABASE = 'soilsoul_dev';
const COLLECTION = 'returnrequests';

export function readArgs(args) {
  const options = { direction: null, database: null, uriEnv: null, apply: false, confirm: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--direction') options.direction = args[++index] ?? null;
    else if (arg === '--database') options.database = args[++index] ?? null;
    else if (arg === '--uri-env') options.uriEnv = args[++index] ?? null;
    else if (arg === '--apply') options.apply = true;
    else if (arg === '--confirm-index-change') options.confirm = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!['up', 'down'].includes(options.direction)) throw new Error('Specify --direction up or --direction down.');
  if (options.database !== ALLOWED_DATABASE) throw new Error(`Target must be explicitly set to ${ALLOWED_DATABASE}.`);
  if (!options.uriEnv || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(options.uriEnv)) throw new Error('Specify --uri-env with the name of an already-set process environment variable.');
  if (options.apply && !options.confirm) throw new Error('Writes require --confirm-index-change.');
  if (!options.apply && options.confirm) throw new Error('--confirm-index-change is valid only with --apply.');
  return options;
}

export function assertLocalUri(uri, database) {
  let parsed;
  try { parsed = new URL(uri); } catch { throw new Error('The selected environment variable does not contain a valid MongoDB URI.'); }
  if (parsed.protocol !== 'mongodb:' || !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname.toLowerCase())) {
    throw new Error('Only a mongodb:// URI targeting localhost, 127.0.0.1 or ::1 is permitted.');
  }
  const uriDatabase = decodeURIComponent(parsed.pathname.replace(/^\//, '').split('/')[0] ?? '');
  if (uriDatabase !== database) throw new Error('The database name in the local URI must exactly match --database.');
}

const sameKey = (left, right) => {
  const a = Object.entries(left ?? {});
  const b = Object.entries(right ?? {});
  return a.length === b.length && a.every(([key, value], index) => b[index]?.[0] === key && b[index]?.[1] === value);
};

export function countIncompatibleReturnKeys(collection) {
  return collection.aggregate([
    { $match: { $expr: { $switch: {
      branches: [{
        case: { $and: [
          { $eq: [{ $type: '$order' }, 'objectId'] },
          { $isNumber: '$itemIndex' },
          { $isNumber: '$quantity' },
          { $eq: [{ $type: '$status' }, 'string'] },
        ] },
        then: { $or: [
          { $lt: ['$itemIndex', 0] },
          { $ne: [{ $mod: ['$itemIndex', 1] }, 0] },
          { $lt: ['$quantity', 1] },
          { $gt: ['$quantity', 10] },
          { $ne: [{ $mod: ['$quantity', 1] }, 0] },
          { $not: [{ $in: ['$status', ['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED']] }] },
        ] },
      }],
      default: true,
    } } } },
    { $count: 'count' },
  ]).toArray().then((rows) => rows[0]?.count ?? 0);
}

async function inspectCollection(db) {
  const exists = await db.listCollections({ name: COLLECTION }, { nameOnly: true }).hasNext();
  if (!exists) return { exists: false, indexes: [], duplicates: 0, incompatible: 0 };
  const collection = db.collection(COLLECTION);
  const indexes = await collection.indexes();
  const duplicates = await collection.aggregate([
    { $group: { _id: { order: '$order', itemIndex: '$itemIndex' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: 'count' },
  ]).toArray().then((rows) => rows[0]?.count ?? 0);
  const incompatible = await countIncompatibleReturnKeys(collection);
  return { exists: true, collection, indexes, duplicates, incompatible };
}

function findKey(indexes, key) {
  return indexes.find((index) => sameKey(index.key, key)) ?? null;
}

export function verifyCollectionState(state, direction) {
  if (state.incompatible > 0) throw new Error(`${state.incompatible} record(s) have a missing/invalid order or non-integer itemIndex; migration refused.`);
  const old = findKey(state.indexes, OLD_RETURN_INDEX.key);
  const next = findKey(state.indexes, NEW_RETURN_INDEX.key);
  const allowedIndexOptions = new Set(['v', 'ns', 'key', 'name', 'unique', 'background']);
  if (old && (old.name !== OLD_RETURN_INDEX.name || old.unique !== true || Object.keys(old).some((key) => !allowedIndexOptions.has(key)))) throw new Error('An incompatible index exists for the old {order,itemIndex} key. Inspect it manually; migration refused.');
  if (next && (next.name !== NEW_RETURN_INDEX.name || next.unique === true || Object.keys(next).some((key) => !allowedIndexOptions.has(key)))) {
    throw new Error('An incompatible index exists for the new {order,itemIndex,createdAt} key. Inspect it manually; migration refused.');
  }
  if (direction === 'down' && state.duplicates > 0) throw new Error(`${state.duplicates} duplicate order/itemIndex group(s) prevent restoring the old unique index; no changes made.`);
  return { old, next };
}

async function migrate(db, direction, state, indexes) {
  if (!state.exists) return 'Collection does not exist; no index changes are needed.';
  const { old, next } = indexes;
  if (direction === 'up') {
    if (!next) await state.collection.createIndex(NEW_RETURN_INDEX.key, { name: NEW_RETURN_INDEX.name });
    if (old) await state.collection.dropIndex(old.name);
    return 'New non-unique return index is present; the old unique index was removed if present.';
  }
  if (!old) await state.collection.createIndex(OLD_RETURN_INDEX.key, { name: OLD_RETURN_INDEX.name, unique: true });
  if (next) await state.collection.dropIndex(next.name);
  return 'Old unique return index is present; the new non-unique index was removed if present.';
}

export async function runCli(args = process.argv.slice(2)) {
  let client;
  try {
    const options = readArgs(args);
    const uri = process.env[options.uriEnv];
    if (!uri) throw new Error(`Environment variable ${options.uriEnv} is not set. No .env file is read by this script.`);
    assertLocalUri(uri, options.database);
    client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const db = client.db();
    if (db.databaseName !== options.database) throw new Error('Connected database name did not match the explicit target.');
    const state = await inspectCollection(db);
    const indexes = verifyCollectionState(state, options.direction);
    console.log(`[return-index] target=${options.database} collection=${COLLECTION} exists=${state.exists}`);
    console.log(`[return-index] oldIndex=${JSON.stringify(OLD_RETURN_INDEX)} newIndex=${JSON.stringify(NEW_RETURN_INDEX)}`);
    console.log(`[return-index] duplicateGroups=${state.duplicates} incompatibleKeyRecords=${state.incompatible}`);
    if (!options.apply) {
      console.log(`[return-index] Preflight only. No index changes made. Proposed ${options.direction} is safe against the inspected metadata and records.`);
      return;
    }
    console.log(`[return-index] ${await migrate(db, options.direction, state, indexes)}`);
  } catch (error) {
    const safeMessage = error?.name === 'Error' ? error.message : 'Database operation failed; details are suppressed to protect connection information.';
    console.error(`[return-index] Refused or failed (${error?.name ?? 'Error'}). ${safeMessage}`);
    process.exitCode = 1;
  } finally {
    await client?.close().catch(() => {});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) await runCli();
