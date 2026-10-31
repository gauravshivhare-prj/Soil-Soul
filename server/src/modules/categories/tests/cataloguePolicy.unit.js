import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPublicCatalogueCategories } from '../cataloguePolicy.js';

test('public categories include only active categories rooted under canonical roots', () => {
  const categories = [
    { _id: 'plants', name: 'Plants', slug: 'plants', parent: null, isActive: true },
    { _id: 'tools', name: 'Tools', slug: 'tools', parent: null, isActive: true },
    { _id: 'seed-child', name: 'Herb Seeds', slug: 'herb-seeds', parent: 'seeds', isActive: true },
    { _id: 'seeds', name: 'Seeds', slug: 'seeds', parent: null, isActive: true },
    { _id: 'orphan-child', name: 'Orphan', slug: 'orphan', parent: 'arbitrary', isActive: true },
    { _id: 'arbitrary', name: 'Other', slug: 'other', parent: null, isActive: true },
    { _id: 'inactive-root', name: 'Inactive root', slug: 'inactive-root', parent: null, isActive: false },
    { _id: 'inactive-root-child', name: 'Invisible child', slug: 'invisible-child', parent: 'inactive-root', isActive: true },
    { _id: 'inactive-child', name: 'Archived child', slug: 'archived-child', parent: 'plants', isActive: false },
    { _id: 'natural-products', name: 'Natural Products', slug: 'natural-products', parent: null, isActive: true },
  ];

  const visible = filterPublicCatalogueCategories(categories);
  assert.deepEqual(visible.map(({ slug }) => slug).sort(), ['herb-seeds', 'natural-products', 'plants', 'seeds', 'tools']);
});

test('public category policy never uses arbitrary roots as a legacy fallback', () => {
  const visible = filterPublicCatalogueCategories([
    { _id: 'old-root', name: 'Old Store', slug: 'old-store', parent: null, isActive: true },
  ]);
  assert.deepEqual(visible, []);
});
