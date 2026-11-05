import { createError } from '../../utils/createError.js';
import { MAIN_CATEGORIES, isMainCategorySlug } from './cataloguePolicy.js';

export const CSV_COLUMNS = [
  'name',
  'slug',
  'shortName',
  'tagline',
  'description',
  'parentSlug',
  'displayOrder',
  'imageUrl',
  'visibleInShop',
];

const CANONICAL_ROOTS_MAP = new Map(MAIN_CATEGORIES.map((m) => [m.slug, m.name]));

/**
 * Parse a CSV string into an array of row objects.
 * Handles quoted fields with embedded commas, quotes, and newlines.
 */
export function parseCategoryCsv(text) {
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

  if (!headerMap.has('name') || !headerMap.has('slug')) {
    throw createError(
      400,
      'INVALID_CSV_HEADERS',
      'CSV must include at least "name" and "slug" columns. Expected: name,slug,shortName,tagline,description,parentSlug,displayOrder,imageUrl,visibleInShop'
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
    const shortName = getVal('shortName');
    const tagline = getVal('tagline');
    const description = getVal('description');
    const parentSlug = getVal('parentSlug');
    const displayOrderRaw = getVal('displayOrder');
    const imageUrl = getVal('imageUrl');
    const visibleRaw = getVal('visibleInShop');

    // Skip completely empty lines
    if (!name && !slug && !parentSlug && !description) continue;

    let visibleInShop = true;
    let visibleInShopValid = true;
    if (visibleRaw !== '') {
      const lower = visibleRaw.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(lower)) {
        visibleInShop = true;
      } else if (['false', '0', 'no', 'off'].includes(lower)) {
        visibleInShop = false;
      } else {
        visibleInShopValid = false;
      }
    }

    let displayOrder = 0;
    let displayOrderValid = true;
    if (displayOrderRaw !== '') {
      if (/^\d+$/.test(displayOrderRaw)) {
        displayOrder = parseInt(displayOrderRaw, 10);
        if (displayOrder > 10000) {
          displayOrderValid = false;
        }
      } else {
        displayOrderValid = false;
      }
    }

    rows.push({
      _rowNumber: rIdx + 1,
      name,
      slug,
      shortName: shortName || name,
      tagline,
      description,
      parentSlug,
      displayOrder,
      displayOrderValid,
      displayOrderRaw,
      imageUrl,
      visibleInShop,
      visibleInShopValid,
      visibleInShopRaw: visibleRaw,
    });
  }

  if (rows.length === 0) {
    throw createError(400, 'CSV_EMPTY', 'No data rows found in the CSV.');
  }

  const MAX_IMPORT_ROWS = 500;
  if (rows.length > MAX_IMPORT_ROWS) {
    throw createError(400, 'CSV_TOO_LARGE', `CSV exceeds maximum limit of ${MAX_IMPORT_ROWS} rows.`);
  }

  return rows;
}

/**
 * Validate a batch of category rows against existing DB categories.
 * Enforces:
 * - Field formats & lengths
 * - Canonical root requirement for Level 1 (Plants, Tools, Seeds, Natural Products)
 * - Duplicate slug detection (within CSV & vs database)
 * - Parent slug existence (in CSV or in DB)
 * - Cycle detection
 * - Exactly 3-level depth limit:
 *     Level 1: Main category (root)
 *     Level 2: Subcategory
 *     Level 3: Second-level subcategory
 * - Level 4+ is rejected
 * - Topological level ordering (parents before children)
 */
export function validateCategoryBatch(rawRows, existingCategories = []) {
  const existingBySlug = new Map(existingCategories.map((c) => [c.slug.toLowerCase(), c]));
  const seenSlugsInCsv = new Map(); // slug -> firstRowNumber

  const validatedRows = [];
  const validCandidates = [];

  // Pass 1: Syntax, field lengths, and duplicate checks
  for (const row of rawRows) {
    const errors = [];
    let isDuplicate = false;

    // Name check
    const rawName = row.name !== undefined && row.name !== null ? String(row.name) : '';
    const trimmedName = rawName.trim();
    if (!trimmedName) {
      errors.push('Category name is required.');
    } else if (trimmedName.length < 2) {
      errors.push('Category name must be at least 2 characters.');
    } else if (trimmedName.length > 60) {
      errors.push('Category name cannot exceed 60 characters.');
    }

    // Slug check
    const rawSlug = row.slug !== undefined && row.slug !== null ? String(row.slug) : '';
    const trimmedSlug = rawSlug.trim();
    const normalizedSlug = trimmedSlug.toLowerCase();

    if (!trimmedSlug) {
      errors.push('Category slug is required.');
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)) {
      errors.push('Slug must be lowercase alphanumeric with hyphens (e.g. "indoor-plants").');
    } else if (trimmedSlug.length > 80) {
      errors.push('Slug cannot exceed 80 characters.');
    } else {
      // In-CSV duplicate slug check
      if (seenSlugsInCsv.has(normalizedSlug)) {
        errors.push(`Duplicate slug "${trimmedSlug}" found in CSV (first seen at row ${seenSlugsInCsv.get(normalizedSlug)}).`);
        isDuplicate = true;
      } else {
        seenSlugsInCsv.set(normalizedSlug, row._rowNumber);
      }

      // Existing DB duplicate slug check
      if (existingBySlug.has(normalizedSlug)) {
        errors.push(`Category with slug "${trimmedSlug}" already exists in the database.`);
        isDuplicate = true;
      }
    }

    // Parent slug check
    const rawParentSlug = row.parentSlug !== undefined && row.parentSlug !== null ? String(row.parentSlug) : '';
    const trimmedParentSlug = rawParentSlug.trim();
    const normalizedParentSlug = trimmedParentSlug.toLowerCase();

    // Self-parent check
    if (trimmedParentSlug && trimmedSlug && normalizedParentSlug === normalizedSlug) {
      errors.push('A category cannot be its own parent.');
    }

    // Level 1 Canonical Root validation
    if (!trimmedParentSlug) {
      if (trimmedSlug && !CANONICAL_ROOTS_MAP.has(normalizedSlug)) {
        errors.push(
          'Only canonical roots ("plants", "tools", "seeds", "natural-products") can be main categories without a parent.'
        );
      } else if (trimmedSlug && CANONICAL_ROOTS_MAP.get(normalizedSlug) !== trimmedName) {
        errors.push(
          `Canonical root "${trimmedSlug}" must have exact name "${CANONICAL_ROOTS_MAP.get(normalizedSlug)}".`
        );
      }
    } else {
      // If it HAS a parent, it CANNOT be a canonical root
      if (trimmedSlug && CANONICAL_ROOTS_MAP.has(normalizedSlug)) {
        errors.push(
          `Canonical root "${trimmedSlug}" cannot have a parent category or be placed under another category.`
        );
      }
    }

    // Display order check
    if (row.displayOrderValid === false) {
      errors.push('Display order must be a valid integer between 0 and 10000.');
    } else if (typeof row.displayOrder === 'number' && (!Number.isInteger(row.displayOrder) || row.displayOrder < 0 || row.displayOrder > 10000)) {
      errors.push('Display order must be a valid integer between 0 and 10000.');
    } else if (typeof row.displayOrder === 'string' && row.displayOrder.trim() !== '') {
      if (!/^\d+$/.test(row.displayOrder.trim()) || parseInt(row.displayOrder.trim(), 10) > 10000) {
        errors.push('Display order must be a valid integer between 0 and 10000.');
      }
    }

    // visibleInShop boolean check
    if (row.visibleInShopValid === false) {
      errors.push('visibleInShop must be a valid boolean ("true", "false", "yes", "no", "1", "0") or empty.');
    } else if (typeof row.visibleInShop === 'string' && row.visibleInShop.trim() !== '') {
      const lower = row.visibleInShop.trim().toLowerCase();
      if (!['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(lower)) {
        errors.push('visibleInShop must be a valid boolean ("true", "false", "yes", "no", "1", "0") or empty.');
      }
    } else if (typeof row.visibleInShop !== 'boolean' && row.visibleInShop !== undefined && row.visibleInShop !== null) {
      errors.push('visibleInShop must be a valid boolean ("true", "false", "yes", "no", "1", "0") or empty.');
    }

    // Other field bounds
    if (row.shortName && row.shortName.length > 40) errors.push('Short name cannot exceed 40 characters.');
    if (row.tagline && row.tagline.length > 120) errors.push('Tagline cannot exceed 120 characters.');
    if (row.description && row.description.length > 1000) errors.push('Description cannot exceed 1000 characters.');

    let finalDisplayOrder = 0;
    if (typeof row.displayOrder === 'number' && Number.isInteger(row.displayOrder)) {
      finalDisplayOrder = row.displayOrder;
    } else if (typeof row.displayOrder === 'string' && /^\d+$/.test(row.displayOrder.trim())) {
      finalDisplayOrder = parseInt(row.displayOrder.trim(), 10);
    }

    const validatedRow = {
      rowNumber: row._rowNumber,
      name: trimmedName,
      slug: trimmedSlug,
      shortName: row.shortName || trimmedName,
      tagline: row.tagline || '',
      description: row.description || '',
      parentSlug: trimmedParentSlug,
      displayOrder: finalDisplayOrder,
      imageUrl: row.imageUrl || '',
      visibleInShop: row.visibleInShop !== false,
      level: trimmedParentSlug ? 2 : 1, // initial estimate, refined in Pass 2
      hierarchyPath: trimmedName,
      status: errors.length > 0 ? (isDuplicate ? 'duplicate' : 'error') : 'valid',
      errors,
    };

    validatedRows.push(validatedRow);
    if (errors.length === 0) {
      validCandidates.push(validatedRow);
    }
  }

  // Pass 2: Parent resolution, cycle detection, and exact 3-level depth calculation
  const candidateBySlug = new Map(validCandidates.map((r) => [r.slug.toLowerCase(), r]));
  const allCsvBySlug = new Map(rawRows.filter((r) => r.slug).map((r) => [String(r.slug).trim().toLowerCase(), r]));

  // Helper to trace parent chain for a candidate row
  function traceHierarchy(r) {
    const chain = [r];
    const visited = new Set([r.slug.toLowerCase()]);
    let current = r;

    while (current.parentSlug) {
      const pSlug = current.parentSlug.toLowerCase();

      if (visited.has(pSlug)) {
        return { error: `Cyclic hierarchy detected involving "${current.slug}" and "${pSlug}".` };
      }
      visited.add(pSlug);

      // Check if parent is in CSV candidate batch
      if (candidateBySlug.has(pSlug)) {
        current = candidateBySlug.get(pSlug);
        chain.unshift(current);
        continue;
      }

      // Check if parent is in DB
      if (existingBySlug.has(pSlug)) {
        const dbParent = existingBySlug.get(pSlug);
        if (!dbParent.isActive || dbParent.archivedAt) {
          return { error: `Parent category "${pSlug}" exists in database but is archived or inactive.` };
        }

        // Trace DB parent ancestors up to root
        let dbCurr = dbParent;
        const dbChain = [];
        const dbVisited = new Set();
        while (dbCurr) {
          const dbId = String(dbCurr._id || dbCurr.id);
          if (dbVisited.has(dbId)) {
            return { error: `Cyclic parent relationship found in database for "${pSlug}".` };
          }
          dbVisited.add(dbId);
          dbChain.unshift(dbCurr);
          dbCurr = dbCurr.parent ? existingCategories.find((c) => String(c._id || c.id) === String(dbCurr.parent?._id || dbCurr.parent)) : null;
        }

        return { chain: [...dbChain, ...chain], rootSlug: dbChain[0]?.slug };
      }

      // If parent is present in CSV but had errors
      if (allCsvBySlug.has(pSlug)) {
        return { error: `Parent category with slug "${pSlug}" has validation errors and cannot be used as a parent.` };
      }

      // Parent missing everywhere
      return { error: `Parent category with slug "${pSlug}" was not found in the database or in this CSV.` };
    }

    return { chain, rootSlug: chain[0]?.slug };
  }

  for (const r of validCandidates) {
    if (!r.parentSlug) {
      r.level = 1;
      r.hierarchyPath = r.name;
      continue;
    }

    const result = traceHierarchy(r);
    if (result.error) {
      r.status = 'error';
      r.errors.push(result.error);
      continue;
    }

    const depth = result.chain.length;
    r.level = depth;
    r.hierarchyPath = result.chain.map((c) => c.name).join(' → ');

    // Canonical root verification
    if (!isMainCategorySlug(result.rootSlug?.toLowerCase())) {
      r.status = 'error';
      r.errors.push(`Hierarchy must trace back to a canonical root (Plants, Tools, Seeds, Natural Products). Found root: "${result.rootSlug}".`);
      continue;
    }

    // 3-Level Depth Limit Enforced
    if (depth > 3) {
      r.status = 'error';
      r.errors.push(
        `Cannot create "${r.name}": hierarchy depth of ${depth} exceeds the 3-level limit (Main category → Subcategory → Second-level subcategory).`
      );
    }
  }

  // Count summaries
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  const finalValidRows = [];

  for (const r of validatedRows) {
    if (r.errors.length === 0) {
      r.status = 'valid';
      validCount++;
      finalValidRows.push(r);
    } else if (r.status === 'duplicate') {
      duplicateCount++;
    } else {
      r.status = 'error';
      invalidCount++;
    }
  }

  // Topological sorting: Level 1 rows first, then Level 2, then Level 3
  const sortedValidRows = [...finalValidRows].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.displayOrder - b.displayOrder || a.name.localeCompare(b.name);
  });

  return {
    totalRows: validatedRows.length,
    validCount,
    invalidCount,
    duplicateCount,
    canImport: validCount > 0 && invalidCount === 0 && duplicateCount === 0,
    rows: validatedRows,
    sortedValidRows,
  };
}

/**
 * Execute the bulk import of validated category rows into MongoDB Atlas.
 */
export async function importCategoryBatch(rows, { Category, withOptionalTransaction }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw createError(400, 'VALIDATION_ERROR', 'No category rows provided for import.');
  }

  // Re-fetch current database state to ensure absolute integrity
  const existingCategories = await Category.find({}).select('_id name slug parent isActive archivedAt').lean();
  const validation = validateCategoryBatch(rows, existingCategories);

  if (validation.invalidCount > 0 || validation.duplicateCount > 0 || validation.sortedValidRows.length === 0) {
    const errorDetails = validation.rows
      .filter((r) => r.errors.length > 0)
      .map((r) => `Row ${r.rowNumber} (${r.slug || r.name}): ${r.errors.join('; ')}`)
      .slice(0, 5)
      .join(' | ');

    throw createError(
      400,
      'IMPORT_VALIDATION_FAILED',
      `Cannot import categories with validation errors (${validation.invalidCount} invalid, ${validation.duplicateCount} duplicate). ${errorDetails}`
    );
  }

  return withOptionalTransaction(async (session) => {
    // Map slugs to ObjectIds
    const slugToId = new Map(existingCategories.map((c) => [c.slug.toLowerCase(), c._id]));
    const createdDocs = [];

    try {
      // Insert level-by-level (Level 1, then Level 2, then Level 3)
      for (const r of validation.sortedValidRows) {
        const parentId = r.parentSlug ? slugToId.get(r.parentSlug.toLowerCase()) : null;

        if (r.parentSlug && !parentId) {
          throw createError(
            500,
            'IMPORT_DEPENDENCY_ERROR',
            `Could not resolve parent ObjectId for slug "${r.parentSlug}" while importing "${r.slug}".`
          );
        }

        const docData = {
          name: r.name,
          slug: r.slug,
          shortName: r.shortName || r.name,
          tagline: r.tagline || undefined,
          description: r.description || undefined,
          displayOrder: r.displayOrder ?? 0,
          parent: parentId || null,
          image: r.imageUrl ? { src: r.imageUrl, alt: r.name } : undefined,
          isActive: r.visibleInShop !== false,
        };

        const [created] = await Category.create([docData], session ? { session } : {});
        slugToId.set(r.slug.toLowerCase(), created._id);
        createdDocs.push({
          id: String(created._id),
          name: created.name,
          slug: created.slug,
          level: r.level,
          hierarchyPath: r.hierarchyPath,
          parentSlug: r.parentSlug || null,
        });
      }

      return {
        success: true,
        count: createdDocs.length,
        categories: createdDocs,
      };
    } catch (err) {
      if (!session && createdDocs.length > 0) {
        const createdIds = createdDocs.map((d) => d.id);
        try {
          await Category.deleteMany({ _id: { $in: createdIds } });
        } catch (rollbackErr) {
          err.rollbackError = rollbackErr;
          console.error('[categoryImport] Standalone rollback cleanup failed:', rollbackErr);
        }
      }
      throw err;
    }
  });
}

/**
 * Downloadable CSV Template text matching the exact specification.
 */
export function getCategoryCsvTemplate() {
  return [
    'name,slug,shortName,tagline,description,parentSlug,displayOrder,imageUrl,visibleInShop',
    'Plants,plants,Plants,Fresh plants for home and garden,Explore our collection of indoor and outdoor plants,,1,https://ik.imagekit.io/animate20/Soil%20&%20Soul/Soil%20&%20Soul%20Desk%20Plant%20Combo.png,true',
    'Indoor Plants,indoor-plants,Indoor Plants,Thriving indoor greenery,Hardy houseplants for your living spaces,plants,1,https://ik.imagekit.io/animate20/Soil%20&%20Soul/Soil%20&%20Soul%20Desk%20Plant%20Combo.png,true',
    'Flowering Indoor Plants,flowering-indoor-plants,Flowering Plants,Vibrant blooms indoors,Indoor plants that produce beautiful flowers,indoor-plants,1,https://ik.imagekit.io/animate20/Soil%20&%20Soul/Soil%20&%20Soul%20Desk%20Plant%20Combo.png,true',
    'Outdoor Plants,outdoor-plants,Outdoor Plants,Garden and patio plants,Hardy greenery and flowering plants for open air,plants,2,,true',
    'Garden Shrubs,garden-shrubs,Garden Shrubs,Lush decorative garden bushes,Perennial outdoor shrubs and bushes,outdoor-plants,1,,true',
    'Tools,tools,Tools,Essential gardening tools,High quality tools for planting and garden maintenance,,2,,true',
    'Watering Tools,watering-tools,Watering Tools,Watering cans and sprayers,Keep your plants hydrated with the right gear,tools,1,,true',
    'Watering Cans,watering-cans,Watering Cans,Classic and precision watering cans,Gentle watering cans for seedlings and houseplants,watering-tools,1,,true',
    'Seeds,seeds,Seeds,Premium seeds for flowering and herbs,Start your garden from seed with tested varieties,,3,,true',
    'Flower Seeds,flower-seeds,Flower Seeds,Vibrant seasonal flower seeds,Easy to grow flower seeds for pots and beds,seeds,1,,true',
    'Annual Flower Seeds,annual-flower-seeds,Annuals,Year-round seasonal blooms,Beautiful annual flowering varieties,flower-seeds,1,,true',
    'Natural Products,natural-products,Natural Products,Pure plant-based care and wellness,Handcrafted natural care products,,4,,true',
    'Skin Care,skin-care,Skin Care,Gentle natural skin treatments,Botanical face and body care formulations,natural-products,1,,true',
    'Aloe Vera Products,aloe-vera-products,Aloe Vera,Soothing aloe vera skin care,Pure organic aloe vera gels and creams,skin-care,1,,true',
  ].join('\n');
}

