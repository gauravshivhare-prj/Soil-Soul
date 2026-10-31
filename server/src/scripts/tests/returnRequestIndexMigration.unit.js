import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalUri, NEW_RETURN_INDEX, OLD_RETURN_INDEX, readArgs, verifyCollectionState } from '../migrateReturnRequestIndex.js';
import { ReturnRequest } from '../../modules/orders/returnRequest.model.js';

test('migration index definitions match the old unique and current non-unique model keys', () => {
  assert.deepEqual(OLD_RETURN_INDEX, {
    name: 'order_1_itemIndex_1',
    key: { order: 1, itemIndex: 1 },
    unique: true,
  });
  assert.deepEqual(NEW_RETURN_INDEX, {
    name: 'order_1_itemIndex_1_createdAt_-1',
    key: { order: 1, itemIndex: 1, createdAt: -1 },
    unique: false,
  });
  const declared = ReturnRequest.schema.indexes();
  assert.ok(declared.some(([key, options]) => JSON.stringify(key) === JSON.stringify(NEW_RETURN_INDEX.key) && options.unique !== true));
  assert.ok(!declared.some(([key]) => JSON.stringify(key) === JSON.stringify(OLD_RETURN_INDEX.key)));
});

test('up preflight accepts the expected old index and down refuses duplicate lines', () => {
  const state = { indexes: [{ ...OLD_RETURN_INDEX }], incompatible: 0, duplicates: 0 };
  assert.equal(verifyCollectionState(state, 'up').old.name, OLD_RETURN_INDEX.name);
  assert.throws(() => verifyCollectionState({ ...state, duplicates: 1 }, 'down'), /duplicate order\/itemIndex group/);
});

test('preflight rejects incompatible index options and malformed return keys', () => {
  assert.throws(() => verifyCollectionState({ indexes: [{ ...OLD_RETURN_INDEX, sparse: true }], incompatible: 0, duplicates: 0 }, 'up'), /incompatible index/);
  assert.throws(() => verifyCollectionState({ indexes: [], incompatible: 1, duplicates: 0 }, 'up'), /invalid order/);
});

test('migration requires explicit local target and separate apply confirmation', () => {
  assert.equal(readArgs(['--direction', 'up', '--database', 'soilsoul_dev', '--uri-env', 'SOILSOUL_LOCAL_MONGODB_URI']).apply, false);
  assert.throws(() => readArgs(['--direction', 'up', '--database', 'production', '--uri-env', 'LOCAL_URI']), /must be explicitly set/);
  assert.throws(() => readArgs(['--direction', 'up', '--database', 'soilsoul_dev', '--uri-env', 'LOCAL_URI', '--apply']), /confirm-index-change/);
  assert.doesNotThrow(() => assertLocalUri('mongodb://localhost:27017/soilsoul_dev', 'soilsoul_dev'));
  assert.throws(() => assertLocalUri('mongodb://db.example.net/soilsoul_dev', 'soilsoul_dev'), /Only a mongodb/);
});
