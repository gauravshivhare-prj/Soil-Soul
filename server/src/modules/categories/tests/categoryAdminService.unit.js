import assert from 'node:assert/strict';
import test from 'node:test';
import { Category } from '../category.model.js';
import { Product } from '../../products/product.model.js';
import { listCategoriesAdmin } from '../category.admin.service.js';

function emptyQuery(rows = []) {
  const query = {
    populate() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    select() { return this; },
    lean() { return this; },
    then(resolve, reject) { return Promise.resolve(rows).then(resolve, reject); },
  };
  return query;
}

test('admin category listing uses admin filters without public-catalogue filtering', async (t) => {
  const originalFind = Category.find;
  const originalCountDocuments = Category.countDocuments;
  const originalAggregate = Product.aggregate;
  const findFilters = [];

  t.after(() => {
    Category.find = originalFind;
    Category.countDocuments = originalCountDocuments;
    Product.aggregate = originalAggregate;
  });

  Category.find = (filter = {}) => {
    findFilters.push(filter);
    return emptyQuery();
  };
  Category.countDocuments = async () => 0;
  Product.aggregate = async () => [];

  const result = await listCategoriesAdmin();

  assert.deepEqual(result.categories, []);
  assert.equal(result.pagination.total, 0);
  assert.deepEqual(findFilters[0], {});
  assert.deepEqual(findFilters[1], {});
});

test('active admin category filter does not resolve or apply public category IDs', async (t) => {
  const originalFind = Category.find;
  const originalCountDocuments = Category.countDocuments;
  const originalAggregate = Product.aggregate;
  const findFilters = [];

  t.after(() => {
    Category.find = originalFind;
    Category.countDocuments = originalCountDocuments;
    Product.aggregate = originalAggregate;
  });

  Category.find = (filter = {}) => {
    findFilters.push(filter);
    return emptyQuery();
  };
  Category.countDocuments = async () => 0;
  Product.aggregate = async () => [];

  await listCategoriesAdmin({ status: 'active' });

  assert.deepEqual(findFilters[0], { isActive: true });
  assert.deepEqual(findFilters[1], {});
});
