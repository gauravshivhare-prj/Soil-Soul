import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { Category } from '../modules/categories/category.model.js';
import { Product } from '../modules/products/product.model.js';

/**
 * Draft catalogue seed: 15 categories (3 groups + 12 subcategories) and 88 draft products with no
 * price, stock or images (status "draft", inactive, never purchasable until completed in admin).
 * Idempotent by slug: existing categories/products are never modified or overwritten.
 *
 *   npm run catalog:seed                                  # dry run (read-only): reports what would be inserted
 *   npm run catalog:seed -- --apply --database <name>     # WRITES to the database named <name>
 *
 * --apply refuses to run unless the connected database name equals --database.
 */

const slugify = (value) => value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const categoryGroups = [
  {
    name: 'Plants & Gardening',
    slug: 'plants-gardening',
    children: {
      'Live Plants': ['Money Plant', 'Snake Plant', 'Peace Lily', 'Areca Palm', 'Spider Plant', 'Jade Plant', 'Aloe Vera Plant', 'ZZ Plant', 'Monstera', 'Syngonium'],
      'Pots & Planters': ['Ceramic Pots', 'Terracotta Pots', 'Plastic Nursery Pots', 'Self-Watering Pots', 'Hanging Planters', 'Decorative Planters', 'Grow Bags', 'Plant Stands'],
      'Soil & Growing Media': ['Potting Mix', 'Garden Soil', 'Cocopeat', 'Vermicompost', 'Perlite', 'Vermiculite', 'Seed Starting Mix', 'Orchid Potting Mix'],
      'Seeds & Bulbs': ['Vegetable Seeds', 'Herb Seeds', 'Flower Seeds', 'Microgreen Seeds', 'Flower Bulbs', 'Seed Starter Kits'],
      'Gardening Tools & Accessories': ['Gardening Hand Trowel', 'Pruning Shears', 'Watering Can', 'Spray Bottle', 'Gardening Gloves', 'Hand Cultivator', 'Garden Hose', 'Plant Labels', 'Seedling Trays', 'Plant Support Stakes'],
      'Fertilizers & Plant Care': ['Organic Plant Fertilizer', 'Neem Cake', 'Seaweed Fertilizer', 'Liquid Plant Nutrients', 'Root Growth Support', 'Plant Leaf Cleaner'],
      'Plant Gifts & Combos': ['Plant Gift Set', 'Desk Plant Combo', 'Plant & Planter Combo', 'Gardening Starter Kit', 'Seed Growing Kit', 'Housewarming Plant Gift'],
    },
  },
  {
    name: 'Natural Personal Care, Fragrance & Wellness',
    slug: 'natural-personal-care-fragrance-wellness',
    children: {
      'Natural Skin Care': ['Face Cleansers', 'Face Care', 'Moisturizers', 'Face Masks', 'Exfoliation', 'Lip Care', 'Sun Care', 'Body Skin Care'],
      'Natural Hair Care': ['Hair Oils', 'Shampoo', 'Conditioner', 'Hair Masks', 'Hair Serums', 'Scalp Care', 'Hair Styling & Care', 'Hair Cleansing'],
      'Natural Body Care': ['Body Wash', 'Soaps', 'Body Moisturizers', 'Body Exfoliation', 'Hand Care', 'Foot Care', 'Bath Essentials', 'Deodorants'],
      'Fragrance & Wellness': ['Essential Oils', 'Fragrance', 'Home Fragrance', 'Aromatherapy'],
    },
  },
  {
    name: 'Gifts & Combos',
    slug: 'gifts-combos',
    children: {
      'Gifts & Combos': ['Plant Gifts', 'Gardening Kits', 'Skin Care Combos', 'Hair Care Combos', 'Body Care Combos', 'Gift Hampers'],
    },
  },
];

const livePlantVariants = {
  'money-plant': ['Small', 'Medium', 'Large'],
  'snake-plant': ['Small', 'Medium', 'Large'],
  'peace-lily': ['Small', 'Large'],
  'areca-palm': ['Small', 'Large'],
  'spider-plant': ['Small', 'Large'],
  'jade-plant': ['Small', 'Medium'],
  'aloe-vera-plant': ['Small', 'Large'],
  'zz-plant': ['Small', 'Large'],
  monstera: ['Medium', 'Large'],
  syngonium: ['Small', 'Medium'],
};

function choicesFor(name) {
  const labels = livePlantVariants[slugify(name)];
  if (!labels) return undefined;
  return {
    label: 'Size',
    choices: labels.map((label) => ({
      id: slugify(label),
      name: label,
      detail: 'Commercial details to be supplied',
      price: null,
      mrp: null,
      stock: null,
      isActive: false,
    })),
  };
}

function productDocument(name, category) {
  const options = choicesFor(name);
  return {
    name,
    slug: slugify(name),
    summary: 'Draft catalogue listing. Commercial details and product content require completion.',
    description: 'This catalogue entry is intentionally incomplete and is not available for purchase until the product information is supplied and approved.',
    category: category._id,
    categorySlug: category.slug,
    price: null,
    mrp: null,
    stock: null,
    images: [],
    tags: [slugify(category.name)],
    status: 'draft',
    isActive: false,
    isFeatured: false,
    ...(options ? { options } : {}),
  };
}

async function ensureCategory(definition, parent = null, { apply = true } = {}) {
  const existing = await Category.findOne({ slug: definition.slug });
  if (existing) return { doc: existing, inserted: false };
  // Dry run: report the insert but write nothing (children of a not-yet-existing parent get a placeholder).
  if (!apply) return { doc: { _id: null, slug: definition.slug, name: definition.name }, inserted: true };
  try {
    const doc = await Category.create({
      name: definition.name,
      slug: definition.slug,
      // shortName allows 40 characters; longer names leave it unset (the UI falls back to the name).
      ...(definition.name.length <= 40 ? { shortName: definition.name } : {}),
      description: 'Catalogue category awaiting final merchandising content.',
      parent,
      displayOrder: 0,
      isActive: true,
    });
    return { doc, inserted: true };
  } catch (error) {
    // Created concurrently by another run: use that record.
    if (error?.code === 11000) return { doc: await Category.findOne({ slug: definition.slug }), inserted: false };
    throw error;
  }
}

async function ensureProduct(definition, { apply = true } = {}) {
  const existing = await Product.findOne({ slug: definition.slug }).select('_id');
  if (existing) return { inserted: false };
  if (!apply) return { inserted: true };
  try {
    await Product.create(definition);
    return { inserted: true };
  } catch (error) {
    if (error?.code === 11000) return { inserted: false };
    throw error;
  }
}

/** @param {{ apply?: boolean, log?: Function }} options  apply=false (default) is a read-only dry run. */
export async function seedCatalogue({ apply = false, log = console.log } = {}) {
  const counts = { categoriesInserted: 0, categoriesSkipped: 0, productsInserted: 0, productsSkipped: 0 };
  for (const group of categoryGroups) {
    const main = await ensureCategory({ name: group.name, slug: group.slug }, null, { apply });
    counts[main.inserted ? 'categoriesInserted' : 'categoriesSkipped']++;
    for (const [childName, productNames] of Object.entries(group.children)) {
      const child = await ensureCategory({ name: childName, slug: slugify(childName) }, main.doc._id, { apply });
      counts[child.inserted ? 'categoriesInserted' : 'categoriesSkipped']++;
      for (const productName of productNames) {
        const product = await ensureProduct(productDocument(productName, child.doc), { apply });
        counts[product.inserted ? 'productsInserted' : 'productsSkipped']++;
      }
    }
  }
  const verb = apply ? 'inserted' : 'would insert';
  log(`[catalog:seed] categories ${verb}=${counts.categoriesInserted} existing=${counts.categoriesSkipped}`);
  log(`[catalog:seed] draft products ${verb}=${counts.productsInserted} existing=${counts.productsSkipped}`);
  return counts;
}

function parseArgs(args) {
  const out = { apply: false, database: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') out.apply = true;
    else if (args[i] === '--database') out.database = args[++i] ?? null;
  }
  return out;
}

export async function runCli(args = process.argv.slice(2)) {
  const { apply, database } = parseArgs(args);
  if (apply && (!database || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(database))) {
    console.error('[catalog:seed] --apply requires --database <database-name> as an explicit target.');
    process.exitCode = 1;
    return;
  }
  if (!apply) {
    // Strictly read-only dry run: connectDatabase() enables autoIndex outside production, which
    // would build indexes (and can create collections) on connect. Schema-level options take
    // precedence over the connection's, so switch both off for every registered model first.
    for (const model of Object.values(mongoose.models)) {
      model.schema.set('autoIndex', false);
      model.schema.set('autoCreate', false);
    }
  }
  try {
    await connectDatabase();
    if (apply && mongoose.connection.name !== database) {
      console.error('[catalog:seed] Refusing to write: the connected database does not match --database.');
      process.exitCode = 1;
      return;
    }
    if (!apply) console.log('[catalog:seed] Dry run (read-only): nothing will be written. Re-run with --apply --database <name> to insert.');
    await seedCatalogue({ apply });
  } catch (err) {
    console.error(`[catalog:seed] Failed (${err?.name ?? 'Error'}).`);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase().catch(() => {});
  }
}

// Run only when executed directly (not when imported). Compares file paths, so it works on Windows;
// the previous file:// string comparison never matched there and the command silently did nothing.
const isDirectRun = Boolean(
  process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()
);
if (isDirectRun) await runCli();
