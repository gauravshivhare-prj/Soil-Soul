import { createError } from '../../utils/createError.js';
import { imageSrc } from '../../utils/input.js';
import { getCategoryRoot, isMainCategorySlug } from '../categories/cataloguePolicy.js';

export const PRODUCT_CSV_COLUMNS = [
  'name',
  'slug',
  'categorySlug',
  'price',
  'mrp',
  'stock',
  'status',
  'sku',
  'summary',
  'description',
  'tags',
  'light',
  'size',
  'isFeatured',
  'imageUrl',
  'imageAlt',
];

export const VALID_STATUSES = ['active', 'draft', 'inactive'];
export const VALID_LIGHTS = ['low', 'bright-indirect', 'full-sun'];
export const VALID_SIZES = ['small', 'medium', 'large'];

export function toSlug(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Returns a ready-to-use CSV template for product imports with sample rows.
 */
export function getProductCsvTemplate() {
  const header = PRODUCT_CSV_COLUMNS.join(',');
  const sampleRows = [
    'Snake Plant,snake-plant,plants,499,699,25,active,PLANT-SNK-01,"Hardy indoor plant that purifies air.","A resilient and elegant snake plant perfect for bedrooms and offices. Requires minimal watering.",indoor;air-purifying,low,medium,true,/images/products/snake-plant.jpg,Vibrant Snake Plant in Ceramic Pot',
    'Monstera Deliciosa,monstera-deliciosa,plants,799,999,15,active,PLANT-MON-01,"Iconic split-leaf tropical houseplant.","Known for its dramatic perforated leaves that make a bold statement in living spaces.",indoor;tropical,bright-indirect,large,false,/images/products/monstera.jpg,Lush Monstera Deliciosa with Broad Green Leaves',
    'Bypass Pruning Shears,bypass-pruning-shears,tools,349,499,50,active,TOOL-PRN-01,"High-carbon steel garden pruners.","Ergonomic bypass pruning shears designed for clean cuts on stems and branches up to 20mm.",gardening;pruning,,,false,/images/products/pruners.jpg,Stainless Steel Garden Pruning Shears',
  ];
  return [header, ...sampleRows].join('\n');
}

/**
 * Parse a CSV string into an array of product row objects.
 * Handles quoted fields, embedded commas, newlines, and UTF-8 BOM.
 */
export function parseProductCsv(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw createError(400, 'CSV_EMPTY', 'The uploaded CSV file is empty.');
  }

  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const lines = [];
  let row = [];
  let inQuotes = false;
  let field = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field.trim());
        field = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        row.push(field.trim());
        if (row.some((f) => f.length > 0)) lines.push(row);
        row = [];
        field = '';
      } else if (char === '\n') {
        row.push(field.trim());
        if (row.some((f) => f.length > 0)) lines.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
  }

  if (inQuotes) {
    throw createError(400, 'MALFORMED_CSV', 'Malformed CSV: unclosed quote detected.');
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((f) => f.length > 0)) lines.push(row);
  }

  if (lines.length === 0) {
    throw createError(400, 'CSV_EMPTY', 'The uploaded CSV file has no content.');
  }

  // Normalize header names (lowercase, trimmed)
  const rawHeaders = lines[0].map((h) => h.trim());
  const headerMap = new Map(rawHeaders.map((h, idx) => [h.toLowerCase(), idx]));

  if (!headerMap.has('name') || !headerMap.has('categoryslug')) {
    throw createError(
      400,
      'INVALID_CSV_HEADERS',
      'CSV must include at least "name" and "categorySlug" columns. Expected: ' + PRODUCT_CSV_COLUMNS.join(',')
    );
  }

  const rows = [];
  for (let rIdx = 1; rIdx < lines.length; rIdx++) {
    const rawRow = lines[rIdx];
    const getVal = (col) => {
      const colIdx = headerMap.get(col.toLowerCase());
      if (colIdx === undefined || rawRow[colIdx] === undefined) return '';
      return String(rawRow[colIdx]).trim();
    };

    const name = getVal('name');
    const slug = getVal('slug');
    const categorySlug = getVal('categoryslug');
    const priceRaw = getVal('price');
    const mrpRaw = getVal('mrp');
    const stockRaw = getVal('stock');
    const statusRaw = getVal('status');
    const skuRaw = getVal('sku');
    const summary = getVal('summary');
    const description = getVal('description');
    const tagsRaw = getVal('tags');
    const lightRaw = getVal('light');
    const sizeRaw = getVal('size');
    const isFeaturedRaw = getVal('isfeatured');
    const imageUrl = getVal('imageurl');
    const imageAlt = getVal('imagealt');

    // Skip blank lines
    if (!name && !slug && !categorySlug && !priceRaw && !description) continue;

    rows.push({
      _rowNumber: rIdx + 1,
      name,
      slug,
      categorySlug,
      priceRaw,
      mrpRaw,
      stockRaw,
      statusRaw,
      skuRaw,
      summary,
      description,
      tagsRaw,
      lightRaw,
      sizeRaw,
      isFeaturedRaw,
      imageUrl,
      imageAlt,
    });
  }

  if (rows.length === 0) {
    throw createError(400, 'CSV_EMPTY', 'No product data rows found in the CSV.');
  }

  const MAX_IMPORT_ROWS = 500;
  if (rows.length > MAX_IMPORT_ROWS) {
    throw createError(400, 'CSV_TOO_LARGE', `CSV exceeds maximum limit of ${MAX_IMPORT_ROWS} rows.`);
  }

  return rows;
}

/**
 * Helper to resolve the canonical root category in memory without hitting the DB repeatedly.
 */
function resolveRootInMemory(category, catById) {
  if (!category) return null;
  let curr = category;
  const seen = new Set();
  for (let depth = 0; curr && depth <= 10; depth++) {
    const id = String(curr._id || curr.id);
    if (seen.has(id) || curr.isActive === false || curr.archivedAt) return null;
    seen.add(id);
    const parentId = curr.parent ? String(curr.parent.id || curr.parent._id || curr.parent) : null;
    if (!parentId) {
      return isMainCategorySlug(curr.slug) ? curr : null;
    }
    curr = catById.get(parentId);
  }
  return null;
}

/**
 * Validate a batch of product rows against existing categories and products in the database.
 */
export async function validateProductBatch(rawRows, { existingProducts = [], existingCategories = [] } = {}) {
  const categoryBySlug = new Map(
    existingCategories.map((c) => [c.slug.toLowerCase(), c])
  );
  const categoryById = new Map(
    existingCategories.map((c) => [String(c._id || c.id), c])
  );
  const existingProductSlugs = new Set(
    existingProducts.map((p) => p.slug.toLowerCase())
  );
  const existingSkus = new Set(
    existingProducts
      .filter((p) => p.sku)
      .map((p) => p.sku.toUpperCase())
  );

  // Count existing active Natural Products
  let existingActiveNaturalCount = 0;
  for (const p of existingProducts) {
    if (p.isActive !== false && (p.status === 'active' || p.status === null)) {
      const cat = categoryBySlug.get(p.categorySlug?.toLowerCase());
      if (cat) {
        const root = resolveRootInMemory(cat, categoryById);
        if (root?.slug === 'natural-products') {
          existingActiveNaturalCount++;
        }
      }
    }
  }

  let activeNaturalInBatch = 0;
  const seenSlugsInCsv = new Map(); // slug -> rowNumber
  const seenSkusInCsv = new Map(); // sku -> rowNumber

  const validatedRows = [];

  for (const row of rawRows) {
    const errors = [];
    const warnings = [];

    // 1. Name validation
    const trimmedName = (row.name || '').trim();
    if (!trimmedName) {
      errors.push('Product name is required.');
    } else if (trimmedName.length < 2) {
      errors.push('Product name must be at least 2 characters.');
    } else if (trimmedName.length > 120) {
      errors.push('Product name cannot exceed 120 characters.');
    }

    // 2. Slug validation
    let resolvedSlug = (row.slug || '').trim().toLowerCase();
    if (!resolvedSlug && trimmedName) {
      resolvedSlug = toSlug(trimmedName);
    }

    if (!resolvedSlug) {
      errors.push('Slug is required or must be derivable from product name.');
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resolvedSlug)) {
      errors.push('Slug must be lowercase alphanumeric with hyphens (e.g. "snake-plant").');
    } else if (resolvedSlug.length > 140) {
      errors.push('Slug cannot exceed 140 characters.');
    } else {
      if (seenSlugsInCsv.has(resolvedSlug)) {
        errors.push(`Duplicate slug "${resolvedSlug}" in CSV (first seen at row ${seenSlugsInCsv.get(resolvedSlug)}).`);
      } else {
        seenSlugsInCsv.set(resolvedSlug, row._rowNumber);
      }

      if (existingProductSlugs.has(resolvedSlug)) {
        errors.push(`Product with slug "${resolvedSlug}" already exists in the database.`);
      }
    }

    // 3. Category validation
    const trimmedCatSlug = (row.categorySlug || '').trim().toLowerCase();
    let resolvedCategory = null;
    let isNaturalProduct = false;

    if (!trimmedCatSlug) {
      errors.push('Category slug is required.');
    } else {
      resolvedCategory = categoryBySlug.get(trimmedCatSlug);
      if (!resolvedCategory) {
        errors.push(`Category "${trimmedCatSlug}" does not exist in the database.`);
      } else if (resolvedCategory.isActive === false || resolvedCategory.archivedAt) {
        errors.push(`Category "${trimmedCatSlug}" is archived or inactive.`);
      } else {
        const root = resolveRootInMemory(resolvedCategory, categoryById);
        if (!root || !isMainCategorySlug(root.slug)) {
          errors.push(`Category "${trimmedCatSlug}" does not belong to a valid main category (Plants, Tools, Seeds, Natural Products).`);
        } else if (root.slug === 'natural-products') {
          isNaturalProduct = true;
        }
      }
    }

    // 4. Status validation
    let resolvedStatus = 'active';
    if (row.statusRaw) {
      const lowerStatus = row.statusRaw.trim().toLowerCase();
      if (!VALID_STATUSES.includes(lowerStatus)) {
        errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);
      } else {
        resolvedStatus = lowerStatus;
      }
    }

    // Natural products capacity check
    if (isNaturalProduct && resolvedStatus === 'active') {
      if (existingActiveNaturalCount + activeNaturalInBatch >= 5) {
        errors.push('Natural Products can contain no more than 5 active products. Capacity reached.');
      } else {
        activeNaturalInBatch++;
      }
    }

    // 5. Price validation
    let resolvedPrice = null;
    if (row.priceRaw !== '' && row.priceRaw !== undefined && row.priceRaw !== null) {
      const parsedPrice = Number(row.priceRaw);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || parsedPrice > 1000000) {
        errors.push('Price must be a number between 0.01 and 1,000,000.');
      } else {
        resolvedPrice = Math.round(parsedPrice * 100) / 100;
      }
    } else if (resolvedStatus !== 'draft') {
      errors.push('Price is required for active or inactive products.');
    }

    // 6. MRP validation
    let resolvedMrp = null;
    if (row.mrpRaw !== '' && row.mrpRaw !== undefined && row.mrpRaw !== null) {
      const parsedMrp = Number(row.mrpRaw);
      if (!Number.isFinite(parsedMrp) || parsedMrp <= 0 || parsedMrp > 1000000) {
        errors.push('MRP must be a number between 0.01 and 1,000,000.');
      } else if (resolvedPrice !== null && parsedMrp < resolvedPrice) {
        errors.push('MRP cannot be lower than the selling price.');
      } else {
        resolvedMrp = Math.round(parsedMrp * 100) / 100;
      }
    }

    // 7. Stock validation
    let resolvedStock = 0;
    if (row.stockRaw !== '' && row.stockRaw !== undefined && row.stockRaw !== null) {
      if (!/^\d+$/.test(String(row.stockRaw).trim())) {
        errors.push('Stock must be a non-negative whole integer.');
      } else {
        const parsedStock = parseInt(String(row.stockRaw).trim(), 10);
        if (parsedStock > 100000) {
          errors.push('Stock cannot exceed 100,000.');
        } else {
          resolvedStock = parsedStock;
        }
      }
    }

    // 8. SKU validation
    let resolvedSku = null;
    if (row.skuRaw) {
      const upperSku = row.skuRaw.trim().toUpperCase();
      if (upperSku.length < 2 || upperSku.length > 40) {
        errors.push('SKU must be between 2 and 40 characters.');
      } else {
        if (seenSkusInCsv.has(upperSku)) {
          errors.push(`Duplicate SKU "${upperSku}" in CSV (first seen at row ${seenSkusInCsv.get(upperSku)}).`);
        } else {
          seenSkusInCsv.set(upperSku, row._rowNumber);
        }

        if (existingSkus.has(upperSku)) {
          errors.push(`SKU "${upperSku}" already exists in the database.`);
        }
        resolvedSku = upperSku;
      }
    }

    // 9. Summary & Description bounds
    const trimmedSummary = (row.summary || '').trim();
    if (trimmedSummary.length > 300) {
      errors.push('Summary cannot exceed 300 characters.');
    }

    const trimmedDescription = (row.description || '').trim();
    if (trimmedDescription.length > 5000) {
      errors.push('Description cannot exceed 5000 characters.');
    }

    // 10. Tags parsing
    let resolvedTags = [];
    if (row.tagsRaw) {
      const rawTagList = row.tagsRaw
        .split(/[;,]/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      resolvedTags = [...new Set(rawTagList)];
      if (resolvedTags.length > 20) {
        errors.push('Cannot specify more than 20 tags.');
      }
      for (const t of resolvedTags) {
        if (t.length > 40) {
          errors.push(`Tag "${t}" exceeds 40 characters.`);
          break;
        }
      }
    }

    // 11. Light & Size
    let resolvedLight = null;
    if (row.lightRaw) {
      const lowerLight = row.lightRaw.trim().toLowerCase();
      if (!VALID_LIGHTS.includes(lowerLight)) {
        errors.push(`Light must be one of: ${VALID_LIGHTS.join(', ')}.`);
      } else {
        resolvedLight = lowerLight;
      }
    }

    let resolvedSize = null;
    if (row.sizeRaw) {
      const lowerSize = row.sizeRaw.trim().toLowerCase();
      if (!VALID_SIZES.includes(lowerSize)) {
        errors.push(`Size must be one of: ${VALID_SIZES.join(', ')}.`);
      } else {
        resolvedSize = lowerSize;
      }
    }

    // 12. isFeatured
    let resolvedIsFeatured = false;
    if (row.isFeaturedRaw !== '' && row.isFeaturedRaw !== undefined && row.isFeaturedRaw !== null) {
      const lower = String(row.isFeaturedRaw).trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(lower)) {
        resolvedIsFeatured = true;
      } else if (['false', '0', 'no', 'off'].includes(lower)) {
        resolvedIsFeatured = false;
      } else {
        errors.push('isFeatured must be a boolean (true/false/yes/no).');
      }
    }

    // 13. Image validation
    let resolvedImages = [];
    const trimmedImgUrl = (row.imageUrl || '').trim();
    const trimmedImgAlt = (row.imageAlt || '').trim();

    if (trimmedImgUrl) {
      if (!/^(https:\/\/|\/images\/)/.test(trimmedImgUrl)) {
        errors.push('Image URL must start with https:// or /images/.');
      } else {
        try {
          const safeSrc = imageSrc(trimmedImgUrl, 'Image URL');
          if (!trimmedImgAlt || trimmedImgAlt.length < 2) {
            errors.push('Image description (imageAlt) must be at least 2 characters when imageUrl is provided.');
          } else if (trimmedImgAlt.length > 200) {
            errors.push('Image description cannot exceed 200 characters.');
          } else {
            resolvedImages.push({
              src: safeSrc,
              alt: trimmedImgAlt,
              isPrimary: true,
              sortOrder: 0,
            });
          }
        } catch (err) {
          errors.push(err.message || 'Image URL must start with https:// or /images/.');
        }
      }
    }

    const isValid = errors.length === 0;

    validatedRows.push({
      _rowNumber: row._rowNumber,
      isValid,
      errors,
      warnings,
      data: {
        name: trimmedName,
        slug: resolvedSlug,
        categorySlug: trimmedCatSlug,
        categoryId: resolvedCategory ? String(resolvedCategory._id) : null,
        categoryName: resolvedCategory ? resolvedCategory.name : null,
        price: resolvedPrice,
        mrp: resolvedMrp,
        stock: resolvedStock,
        status: resolvedStatus,
        sku: resolvedSku,
        summary: trimmedSummary,
        description: trimmedDescription,
        tags: resolvedTags,
        light: resolvedLight,
        size: resolvedSize,
        isFeatured: resolvedIsFeatured,
        images: resolvedImages,
        isNaturalProduct,
      },
    });
  }

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const invalidCount = validatedRows.filter((r) => !r.isValid).length;

  return {
    totalRows: validatedRows.length,
    validCount,
    invalidCount,
    rows: validatedRows,
  };
}

/**
 * Execute import of product rows into the database with mandatory server-side revalidation.
 */
export async function importProductBatch(
  inputRows,
  actorId,
  { Product, Category, withOptionalTransaction, recordMovement }
) {
  if (!Array.isArray(inputRows) || inputRows.length === 0) {
    throw createError(400, 'VALIDATION_ERROR', 'No rows provided to import.');
  }

  // Pre-fetch fresh database state to ensure absolute integrity
  const existingCategories = await Category.find({}).select('_id slug parent name isActive archivedAt').lean();
  const existingProducts = await Product.find({}).select('_id slug sku category categorySlug status isActive naturalProductSlot').lean();

  // Normalize incoming rows: client can pass raw rows or preview rows with .data
  const rawRowsToValidate = inputRows.map((r, idx) => {
    const raw = r.data || r;
    return {
      _rowNumber: r._rowNumber || idx + 1,
      name: raw.name,
      slug: raw.slug,
      categorySlug: raw.categorySlug,
      priceRaw: raw.price !== undefined ? String(raw.price) : raw.priceRaw,
      mrpRaw: raw.mrp !== undefined && raw.mrp !== null ? String(raw.mrp) : raw.mrpRaw,
      stockRaw: raw.stock !== undefined && raw.stock !== null ? String(raw.stock) : raw.stockRaw,
      statusRaw: raw.status !== undefined ? raw.status : raw.statusRaw,
      skuRaw: raw.sku !== undefined ? raw.sku : raw.skuRaw,
      summary: raw.summary,
      description: raw.description,
      tagsRaw: Array.isArray(raw.tags) ? raw.tags.join(';') : raw.tagsRaw,
      lightRaw: raw.light !== undefined ? raw.light : raw.lightRaw,
      sizeRaw: raw.size !== undefined ? raw.size : raw.sizeRaw,
      isFeaturedRaw: raw.isFeatured !== undefined ? String(raw.isFeatured) : raw.isFeaturedRaw,
      imageUrl: raw.images?.[0]?.src || raw.imageUrl || '',
      imageAlt: raw.images?.[0]?.alt || raw.imageAlt || '',
    };
  });

  const validation = await validateProductBatch(rawRowsToValidate, { existingProducts, existingCategories });
  const validRows = validation.rows.filter((r) => r.isValid);

  if (validRows.length === 0) {
    throw createError(400, 'VALIDATION_ERROR', 'No valid rows to import after server-side validation.');
  }

  // Pre-load categories for fast lookup
  const categories = await Category.find({}).select('_id slug name').lean();
  const catMap = new Map(categories.map((c) => [c.slug.toLowerCase(), c]));

  // Find used natural product slots to allocate next slots
  const activeNatural = await Product.find({
    isActive: true,
    status: { $in: ['active', null] },
    naturalProductSlot: { $in: [1, 2, 3, 4, 5] },
  })
    .select('+naturalProductSlot')
    .lean();

  const usedSlots = new Set(activeNatural.map((p) => p.naturalProductSlot));
  const availableSlots = [1, 2, 3, 4, 5].filter((slot) => !usedSlots.has(slot));

  const createdProducts = [];

  const executeImport = async (session) => {
    for (const row of validRows) {
      const d = row.data;
      const cat = catMap.get(d.categorySlug.toLowerCase());
      if (!cat) {
        throw createError(404, 'CATEGORY_NOT_FOUND', `Category "${d.categorySlug}" not found during import.`);
      }

      let naturalProductSlot = null;
      if (d.isNaturalProduct && d.status === 'active') {
        if (availableSlots.length === 0) {
          throw createError(409, 'NATURAL_PRODUCTS_LIMIT', 'Natural Products limit exceeded.');
        }
        naturalProductSlot = availableSlots.shift();
      }

      const productDoc = {
        name: d.name,
        slug: d.slug,
        category: cat._id,
        categorySlug: cat.slug,
        price: d.price,
        mrp: d.mrp || undefined,
        stock: d.stock,
        status: d.status,
        sku: d.sku || undefined,
        summary: d.summary || undefined,
        description: d.description || undefined,
        tags: d.tags && d.tags.length ? d.tags : undefined,
        light: d.light || null,
        size: d.size || null,
        isFeatured: d.isFeatured,
        images: d.images && d.images.length ? d.images : undefined,
        isActive: d.status !== 'inactive',
        naturalProductSlot,
      };

      const [created] = await Product.create([productDoc], session ? { session } : {});
      createdProducts.push(created);

      if (d.stock > 0 && typeof recordMovement === 'function') {
        await recordMovement(
          {
            product: created._id,
            delta: d.stock,
            stockAfter: d.stock,
            reason: 'initial',
            actor: actorId || null,
          },
          session
        );
      }
    }
  };

  try {
    if (typeof withOptionalTransaction === 'function') {
      await withOptionalTransaction(async (session) => {
        await executeImport(session);
      });
    } else {
      await executeImport(null);
    }
  } catch (err) {
    // If standalone and without transaction, attempt cleanup of created documents
    if (createdProducts.length > 0) {
      try {
        const createdIds = createdProducts.map((p) => p._id);
        await Product.deleteMany({ _id: { $in: createdIds } });
      } catch (cleanupErr) {
        // secondary cleanup failure
      }
    }
    throw err;
  }

  return {
    importedCount: createdProducts.length,
    products: createdProducts.map((p) => ({
      id: String(p._id),
      name: p.name,
      slug: p.slug,
      categorySlug: p.categorySlug,
      price: p.price,
      stock: p.stock,
    })),
  };
}
