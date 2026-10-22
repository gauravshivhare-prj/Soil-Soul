/**
 * Product catalog — temporary local mock data.
 *
 * Single source of truth for products across Shop, Product Details, Cart,
 * Wishlist, Account and Admin. Components read it through
 * services/catalog.js, never directly, so this file can later be replaced
 * by API calls.
 *
 * Shape (mirrors the planned backend response):
 *   id, slug, name, categorySlug,
 *   price, mrp (original price or null), rating, reviewCount, soldCount,
 *   stock (0 = out of stock), tags (filterable attributes),
 *   light, size, summary, description, highlights[], care[], specs[[label, value]],
 *   options ({ label, choices: [{ id, name, detail, priceDelta }] } | null),
 *   image (null until real photos are added → blank placeholder),
 *   isFeatured
 *
 * Prices are whole rupees, inclusive of taxes. Ratings/reviews are demo values.
 */

/* Attribute tags used by the Shop filters. */
export const PRODUCT_TAGS = [
  { id: "indoor", label: "Indoor Plants" },
  { id: "outdoor", label: "Outdoor Plants" },
  { id: "low-maintenance", label: "Low Maintenance" },
  { id: "air-purifying", label: "Air Purifying" },
  { id: "flowering", label: "Flowering Plants" },
  { id: "pet-friendly", label: "Pet Friendly" },
];

export const LIGHT_LEVELS = [
  { id: "low", label: "Low light" },
  { id: "bright-indirect", label: "Bright, indirect" },
  { id: "full-sun", label: "Full sun" },
];

export const SIZES = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

/* Pot add-on offered on live plants. */
const POT_OPTIONS = {
  label: "Select Pot (Optional)",
  choices: [
    { id: "no-pot", name: "No Pot", detail: "Plant only", priceDelta: 0 },
    { id: "plastic-pot", name: "Plastic Pot", detail: "12 cm · Black", priceDelta: 50 },
    { id: "ceramic-pot", name: "Ceramic Pot", detail: "15 cm · White", priceDelta: 200 },
  ],
};

const PLANT_CARE = (light, water) => [
  { title: "Light", text: light },
  { title: "Water", text: water },
  { title: "Soil", text: "Well-draining potting mix with added compost." },
  { title: "Feeding", text: "Feed once a month in spring and summer with organic fertilizer." },
];

const GENERAL_CARE = [
  { title: "Storage", text: "Keep in a cool, dry place away from direct sunlight." },
  { title: "Usage", text: "Follow the instructions on the pack for best results." },
];

const PERSONAL_CARE = [
  { title: "How to use", text: "Apply a small amount and massage gently. Rinse if required." },
  { title: "Patch test", text: "Do a patch test before first use. Discontinue if irritation occurs." },
  { title: "Storage", text: "Store below 30°C, away from direct sunlight." },
];

export const PRODUCTS = [
  /* ── Live plants ─────────────────────────────────────────────── */
  {
    id: "p-monstera", slug: "monstera-deliciosa", name: "Monstera Deliciosa", categorySlug: "live-plants",
    price: 699, mrp: 899, rating: 4.5, reviewCount: 126, soldCount: 540, stock: 24,
    tags: ["indoor", "air-purifying"], light: "bright-indirect", size: "medium",
    summary: "Iconic split-leaf plant that brings a tropical feel to any room.",
    description:
      "The Monstera Deliciosa is a popular indoor plant known for its large, glossy, split leaves. It adds a tropical touch to your home and is easy to care for, making it perfect for beginners and plant lovers alike.",
    highlights: ["Air purifying", "Low maintenance", "Suitable for indoor spaces", "Bright, indirect light preferred"],
    care: PLANT_CARE("Bright, indirect light. Avoid harsh afternoon sun.", "Water when the top 2–3 cm of soil feels dry."),
    specs: [["Plant Height", "30–45 cm (approx.)"], ["Pot Size", "12–15 cm (optional)"], ["Plant Type", "Indoor, Foliage Plant"], ["Pet Friendly", "No (keep away from pets)"]],
    options: POT_OPTIONS, image: null, isFeatured: true,
  },
  {
    id: "p-snake", slug: "snake-plant", name: "Snake Plant", categorySlug: "live-plants",
    price: 499, mrp: 599, rating: 4.5, reviewCount: 98, soldCount: 410, stock: 3,
    tags: ["indoor", "low-maintenance", "air-purifying"], light: "low", size: "medium",
    summary: "Hardy, upright foliage that thrives on neglect.",
    description:
      "The Snake Plant (Sansevieria) is one of the hardiest houseplants around. Its upright, variegated leaves suit modern interiors, and it tolerates low light and irregular watering.",
    highlights: ["Tolerates low light", "Water every 2–3 weeks", "Known for air purification", "Ideal for bedrooms"],
    care: PLANT_CARE("Low to bright, indirect light.", "Let the soil dry out completely between waterings."),
    specs: [["Plant Height", "35–45 cm (approx.)"], ["Pot Size", "12 cm (optional)"], ["Plant Type", "Indoor, Succulent"], ["Pet Friendly", "No (keep away from pets)"]],
    options: POT_OPTIONS, image: null, isFeatured: false,
  },
  {
    id: "p-peace-lily", slug: "peace-lily", name: "Peace Lily", categorySlug: "live-plants",
    price: 399, mrp: null, rating: 4.6, reviewCount: 64, soldCount: 260, stock: 18,
    tags: ["indoor", "flowering", "air-purifying"], light: "low", size: "small",
    summary: "Elegant white blooms and deep green leaves.",
    description:
      "The Peace Lily brings graceful white blooms and lush leaves to shaded corners. It droops slightly when thirsty, so you always know when to water.",
    highlights: ["Blooms indoors", "Shows when it needs water", "Thrives in shade", "Compact size"],
    care: PLANT_CARE("Medium to low, indirect light.", "Keep the soil lightly moist; water when leaves begin to droop."),
    specs: [["Plant Height", "25–35 cm (approx.)"], ["Pot Size", "10–12 cm (optional)"], ["Plant Type", "Indoor, Flowering"], ["Pet Friendly", "No (keep away from pets)"]],
    options: POT_OPTIONS, image: null, isFeatured: false,
  },
  {
    id: "p-areca", slug: "areca-palm", name: "Areca Palm", categorySlug: "live-plants",
    price: 599, mrp: 749, rating: 4.3, reviewCount: 52, soldCount: 190, stock: 12,
    tags: ["indoor", "air-purifying", "pet-friendly"], light: "bright-indirect", size: "large",
    summary: "Feathery fronds for a relaxed, resort-like feel.",
    description:
      "The Areca Palm's soft, arching fronds add height and movement to living rooms and balconies. It's non-toxic, making it a great choice for homes with pets.",
    highlights: ["Pet friendly", "Adds height", "Air purifying", "Indoor or shaded balcony"],
    care: PLANT_CARE("Bright, indirect light.", "Water when the top layer of soil is dry. Mist in dry weather."),
    specs: [["Plant Height", "60–80 cm (approx.)"], ["Pot Size", "15 cm (optional)"], ["Plant Type", "Indoor, Palm"], ["Pet Friendly", "Yes"]],
    options: POT_OPTIONS, image: null, isFeatured: false,
  },
  {
    id: "p-zz", slug: "zz-plant", name: "ZZ Plant", categorySlug: "live-plants",
    price: 449, mrp: null, rating: 4.5, reviewCount: 71, soldCount: 230, stock: 15,
    tags: ["indoor", "low-maintenance"], light: "low", size: "small",
    summary: "Glossy leaves that stay green with minimal care.",
    description:
      "The ZZ Plant stores water in its roots, so it forgives missed waterings. Its glossy, waxy leaves look polished on desks and shelves.",
    highlights: ["Very low maintenance", "Handles low light", "Glossy foliage", "Great for offices"],
    care: PLANT_CARE("Low to bright, indirect light.", "Water every 2–3 weeks; allow soil to dry fully."),
    specs: [["Plant Height", "30–40 cm (approx.)"], ["Pot Size", "12 cm (optional)"], ["Plant Type", "Indoor, Foliage Plant"], ["Pet Friendly", "No (keep away from pets)"]],
    options: POT_OPTIONS, image: null, isFeatured: false,
  },
  {
    id: "p-fiddle", slug: "fiddle-leaf-fig", name: "Fiddle Leaf Fig", categorySlug: "live-plants",
    price: 699, mrp: 849, rating: 4.4, reviewCount: 58, soldCount: 150, stock: 0,
    tags: ["indoor"], light: "bright-indirect", size: "large",
    summary: "Statement plant with large violin-shaped leaves.",
    description:
      "The Fiddle Leaf Fig is a designer favourite with large, violin-shaped leaves. It loves a bright spot near a window and rewards steady care with new growth.",
    highlights: ["Statement plant", "Loves bright light", "Upright growth", "Rotate monthly for even growth"],
    care: PLANT_CARE("Bright, filtered light near a window.", "Water when the top 5 cm of soil is dry."),
    specs: [["Plant Height", "60–75 cm (approx.)"], ["Pot Size", "15 cm (optional)"], ["Plant Type", "Indoor, Tree"], ["Pet Friendly", "No (keep away from pets)"]],
    options: POT_OPTIONS, image: null, isFeatured: false,
  },
  {
    id: "p-aloe-plant", slug: "aloe-vera-plant", name: "Aloe Vera Plant", categorySlug: "live-plants",
    price: 349, mrp: null, rating: 4.4, reviewCount: 76, soldCount: 320, stock: 30,
    tags: ["outdoor", "low-maintenance"], light: "full-sun", size: "small",
    summary: "Sun-loving succulent with soothing gel-filled leaves.",
    description:
      "A sunny windowsill favourite, the Aloe Vera plant needs little water and grows thick, gel-filled leaves.",
    highlights: ["Loves sunlight", "Drought tolerant", "Compact", "Easy to propagate"],
    care: PLANT_CARE("Full sun to bright light.", "Water deeply every 2–3 weeks; avoid waterlogging."),
    specs: [["Plant Height", "20–30 cm (approx.)"], ["Pot Size", "10 cm (optional)"], ["Plant Type", "Outdoor, Succulent"], ["Pet Friendly", "No (keep away from pets)"]],
    options: POT_OPTIONS, image: null, isFeatured: false,
  },

  /* ── Pots & planters ─────────────────────────────────────────── */
  {
    id: "p-terracotta", slug: "terracotta-plant-pot", name: "Terracotta Plant Pot", categorySlug: "pots-planters",
    price: 249, mrp: 299, rating: 4.4, reviewCount: 86, soldCount: 380, stock: 4,
    tags: ["indoor", "outdoor"], light: null, size: "medium",
    summary: "Classic breathable clay pot with drainage hole.",
    description:
      "Hand-finished terracotta pot that lets roots breathe and helps prevent overwatering. Comes with a drainage hole and matching saucer.",
    highlights: ["Breathable clay", "Drainage hole", "Includes saucer", "Indoor & outdoor use"],
    care: GENERAL_CARE,
    specs: [["Material", "Terracotta clay"], ["Diameter", "15 cm (Medium)"], ["Drainage", "Yes, with saucer"], ["Finish", "Natural, unglazed"]],
    options: {
      label: "Select Size",
      choices: [
        { id: "s", name: "Small", detail: "10 cm", priceDelta: -50 },
        { id: "m", name: "Medium", detail: "15 cm", priceDelta: 0 },
        { id: "l", name: "Large", detail: "20 cm", priceDelta: 120 },
      ],
    },
    image: null, isFeatured: true,
  },
  {
    id: "p-ceramic", slug: "ceramic-planter-white", name: "Ceramic Planter – White", categorySlug: "pots-planters",
    price: 599, mrp: 699, rating: 4.6, reviewCount: 40, soldCount: 120, stock: 9,
    tags: ["indoor"], light: null, size: "medium",
    summary: "Minimal glazed planter for tabletop plants.",
    description: "A smooth, matte-glazed ceramic planter that suits modern interiors. Includes a drainage hole and cork plug.",
    highlights: ["Matte glaze", "Drainage hole with plug", "Tabletop size", "Easy to clean"],
    care: GENERAL_CARE,
    specs: [["Material", "Ceramic"], ["Diameter", "15 cm"], ["Drainage", "Yes, with plug"], ["Finish", "Matte white"]],
    options: null, image: null, isFeatured: false,
  },
  {
    id: "p-macrame", slug: "hanging-macrame-planter", name: "Hanging Macramé Planter", categorySlug: "pots-planters",
    price: 349, mrp: null, rating: 4.2, reviewCount: 33, soldCount: 90, stock: 0,
    tags: ["indoor"], light: null, size: "small",
    summary: "Hand-knotted cotton hanger for trailing plants.",
    description: "Hand-knotted cotton macramé hanger that holds pots up to 15 cm. Perfect for pothos and other trailing plants.",
    highlights: ["Hand-knotted cotton", "Fits pots up to 15 cm", "Includes hook", "Space saving"],
    care: GENERAL_CARE,
    specs: [["Material", "Cotton rope"], ["Length", "90 cm"], ["Fits", "Pots up to 15 cm"], ["Includes", "Wooden ring & hook"]],
    options: null, image: null, isFeatured: false,
  },

  /* ── Soil & fertilizers ──────────────────────────────────────── */
  {
    id: "p-potting-soil", slug: "organic-potting-soil-5kg", name: "Organic Potting Soil (5kg)", categorySlug: "soil-fertilizers",
    price: 349, mrp: 399, rating: 4.6, reviewCount: 98, soldCount: 600, stock: 2,
    tags: [], light: null, size: "large",
    summary: "Ready-to-use, nutrient-rich mix for all plants.",
    description:
      "A balanced blend of cocopeat, compost and perlite for healthy roots. Ready to use for indoor plants, balcony gardens and seedlings.",
    highlights: ["100% organic", "Nutrient rich", "Chemical free", "Ready to use"],
    care: GENERAL_CARE,
    specs: [["Weight", "5 kg"], ["Contents", "Cocopeat, compost, perlite"], ["Suitable for", "All plants"], ["Organic", "Yes"]],
    options: null, image: null, isFeatured: true,
  },
  {
    id: "p-vermicompost", slug: "vermicompost-2kg", name: "Vermicompost (2kg)", categorySlug: "soil-fertilizers",
    price: 199, mrp: null, rating: 4.5, reviewCount: 61, soldCount: 300, stock: 40,
    tags: [], light: null, size: "small",
    summary: "Earthworm compost to enrich tired soil.",
    description: "Fine, odourless vermicompost that improves soil structure and feeds plants slowly and naturally.",
    highlights: ["Slow-release nutrition", "Odourless", "Improves soil", "Safe for edibles"],
    care: GENERAL_CARE,
    specs: [["Weight", "2 kg"], ["Contents", "Vermicompost"], ["Suitable for", "All plants"], ["Organic", "Yes"]],
    options: null, image: null, isFeatured: false,
  },
  {
    id: "p-neem-cake", slug: "neem-cake-fertilizer", name: "Neem Cake Fertilizer (1kg)", categorySlug: "soil-fertilizers",
    price: 179, mrp: null, rating: 4.3, reviewCount: 28, soldCount: 110, stock: 22,
    tags: [], light: null, size: "small",
    summary: "Natural fertilizer that also deters soil pests.",
    description: "Cold-pressed neem cake powder that feeds plants and naturally discourages soil pests.",
    highlights: ["Natural pest deterrent", "Organic nitrogen", "Mix into topsoil", "Monthly use"],
    care: GENERAL_CARE,
    specs: [["Weight", "1 kg"], ["Contents", "Neem cake powder"], ["Suitable for", "Pots & garden beds"], ["Organic", "Yes"]],
    options: null, image: null, isFeatured: false,
  },

  /* ── Seeds & tools ───────────────────────────────────────────── */
  {
    id: "p-basil", slug: "basil-seeds", name: "Basil Seeds", categorySlug: "seeds-tools",
    price: 149, mrp: null, rating: 4.3, reviewCount: 72, soldCount: 450, stock: 6,
    tags: ["outdoor"], light: "full-sun", size: "small",
    summary: "Grow fragrant sweet basil at home.",
    description: "High-germination sweet basil seeds for pots and kitchen gardens. Harvest fresh leaves in 6–8 weeks.",
    highlights: ["High germination", "Kitchen garden favourite", "Harvest in 6–8 weeks", "Approx. 100 seeds"],
    care: [{ title: "Sowing", text: "Sow 0.5 cm deep in moist seed-starting mix." }, { title: "Light", text: "Full sun, 6+ hours a day." }, { title: "Water", text: "Keep soil evenly moist until seedlings establish." }],
    specs: [["Seeds per pack", "Approx. 100"], ["Germination", "7–10 days"], ["Season", "Spring – Monsoon"], ["Organic", "Yes"]],
    options: null, image: null, isFeatured: true,
  },
  {
    id: "p-tool-set", slug: "gardening-tool-set", name: "Gardening Tool Set", categorySlug: "seeds-tools",
    price: 299, mrp: 399, rating: 4.4, reviewCount: 54, soldCount: 210, stock: 14,
    tags: [], light: null, size: "small",
    summary: "Trowel, fork and transplanter for everyday gardening.",
    description: "A three-piece hand tool set with rust-resistant steel heads and comfortable wooden handles.",
    highlights: ["3-piece set", "Rust-resistant steel", "Wooden handles", "Hanging loops"],
    care: GENERAL_CARE,
    specs: [["Includes", "Trowel, fork, transplanter"], ["Material", "Steel & wood"], ["Length", "28 cm (approx.)"], ["Warranty", "6 months"]],
    options: null, image: null, isFeatured: false,
  },
  {
    id: "p-watering-can", slug: "watering-can", name: "Metal Watering Can (2L)", categorySlug: "seeds-tools",
    price: 449, mrp: null, rating: 4.5, reviewCount: 37, soldCount: 95, stock: 11,
    tags: [], light: null, size: "medium",
    summary: "Long-spout can for precise indoor watering.",
    description: "Powder-coated metal watering can with a long spout that reaches under foliage without splashing.",
    highlights: ["2 litre capacity", "Long precision spout", "Powder-coated", "Indoor & balcony use"],
    care: GENERAL_CARE,
    specs: [["Capacity", "2 L"], ["Material", "Powder-coated steel"], ["Colour", "Forest green"], ["Spout", "Long, narrow"]],
    options: null, image: null, isFeatured: false,
  },

  /* ── Natural skincare ────────────────────────────────────────── */
  {
    id: "p-aloe-gel", slug: "aloe-vera-gel", name: "Aloe Vera Gel", categorySlug: "natural-skincare",
    price: 399, mrp: 449, rating: 4.7, reviewCount: 156, soldCount: 820, stock: 5,
    tags: [], light: null, size: "small",
    benefits: ["Soothes", "Hydrates", "Repairs"],
    summary: "Pure, soothing gel for skin and hair.",
    description: "Cold-processed aloe vera gel that soothes, hydrates and calms skin. Lightweight and non-sticky for daily use.",
    highlights: ["Soothes & hydrates", "Non-sticky", "For face, body & hair", "No added colour"],
    care: PERSONAL_CARE,
    specs: [["Net Quantity", "200 g"], ["Skin Type", "All skin types"], ["Key Ingredient", "Aloe barbadensis leaf juice"], ["Shelf Life", "24 months"]],
    options: null, image: null, isFeatured: true,
  },
  {
    id: "p-neem-wash", slug: "neem-face-wash", name: "Neem Face Wash", categorySlug: "natural-skincare",
    price: 249, mrp: null, rating: 4.6, reviewCount: 65, soldCount: 400, stock: 20,
    tags: [], light: null, size: "small",
    benefits: ["Purifies", "Refreshes", "Balances"],
    summary: "Gentle daily cleanser with neem and tulsi.",
    description: "A gentle foaming face wash with neem and tulsi extracts that cleanses without stripping moisture.",
    highlights: ["Purifies & refreshes", "Soap free", "Daily use", "For oily & combination skin"],
    care: PERSONAL_CARE,
    specs: [["Net Quantity", "150 ml"], ["Skin Type", "Oily & combination"], ["Key Ingredient", "Neem & tulsi extracts"], ["Shelf Life", "24 months"]],
    options: null, image: null, isFeatured: false,
  },
  {
    id: "p-face-cream", slug: "moisturising-face-cream", name: "Moisturising Face Cream", categorySlug: "natural-skincare",
    price: 449, mrp: 499, rating: 4.5, reviewCount: 49, soldCount: 180, stock: 13,
    tags: [], light: null, size: "small",
    benefits: ["Nourishes", "Rejuvenates", "Softens"],
    summary: "Light, nourishing cream with natural botanicals.",
    description: "A lightweight daily moisturiser with shea butter and botanical oils that leaves skin soft and nourished.",
    highlights: ["Nourishes & rejuvenates", "Lightweight", "Shea butter", "Day & night"],
    care: PERSONAL_CARE,
    specs: [["Net Quantity", "50 g"], ["Skin Type", "Normal to dry"], ["Key Ingredient", "Shea butter, almond oil"], ["Shelf Life", "18 months"]],
    options: null, image: null, isFeatured: false,
  },

  /* ── Hair & body care ────────────────────────────────────────── */
  {
    id: "p-shampoo", slug: "herbal-shampoo", name: "Herbal Shampoo", categorySlug: "hair-body-care",
    price: 349, mrp: null, rating: 4.6, reviewCount: 65, soldCount: 350, stock: 17,
    tags: [], light: null, size: "small",
    benefits: ["Strengthens", "Nourishes", "Adds Shine"],
    summary: "Sulphate-free shampoo with hibiscus and amla.",
    description: "A mild, sulphate-free herbal shampoo with hibiscus, amla and reetha that cleans gently and adds natural shine.",
    highlights: ["Sulphate free", "Strengthens hair", "Adds shine", "For all hair types"],
    care: PERSONAL_CARE,
    specs: [["Net Quantity", "200 ml"], ["Hair Type", "All hair types"], ["Key Ingredient", "Hibiscus, amla, reetha"], ["Shelf Life", "24 months"]],
    options: null, image: null, isFeatured: true,
  },
  {
    id: "p-hair-oil", slug: "bhringraj-hair-oil", name: "Bhringraj Hair Oil", categorySlug: "hair-body-care",
    price: 299, mrp: 349, rating: 4.4, reviewCount: 41, soldCount: 160, stock: 19,
    tags: [], light: null, size: "small",
    benefits: ["Nourishes", "Strengthens", "Calms"],
    summary: "Traditional herbal oil for scalp nourishment.",
    description: "Cold-pressed coconut oil infused with bhringraj and brahmi for a calming, nourishing scalp massage.",
    highlights: ["Herbal infusion", "Cold-pressed base", "Scalp massage", "Non-greasy finish"],
    care: PERSONAL_CARE,
    specs: [["Net Quantity", "100 ml"], ["Hair Type", "All hair types"], ["Key Ingredient", "Bhringraj, brahmi"], ["Shelf Life", "18 months"]],
    options: null, image: null, isFeatured: false,
  },
  {
    id: "p-soap", slug: "herbal-soap-bar", name: "Herbal Soap Bar", categorySlug: "hair-body-care",
    price: 129, mrp: null, rating: 4.5, reviewCount: 88, soldCount: 700, stock: 50,
    tags: [], light: null, size: "small",
    benefits: ["Cleanses", "Moisturises", "Gentle"],
    summary: "Handmade cold-process soap with turmeric.",
    description: "Handmade cold-process soap with turmeric and sandalwood that cleanses gently without drying.",
    highlights: ["Handmade", "Cold process", "Turmeric & sandalwood", "Plastic-free wrap"],
    care: PERSONAL_CARE,
    specs: [["Net Weight", "100 g"], ["Skin Type", "All skin types"], ["Key Ingredient", "Turmeric, sandalwood"], ["Shelf Life", "24 months"]],
    options: null, image: null, isFeatured: false,
  },
];

/* Homepage "Featured Products" order. */
export const FEATURED_SLUGS = [
  "monstera-deliciosa",
  "terracotta-plant-pot",
  "organic-potting-soil-5kg",
  "basil-seeds",
  "aloe-vera-gel",
  "herbal-shampoo",
];

/* Homepage "Natural Care, Rooted in Plants" order. */
export const NATURAL_CARE_SLUGS = ["aloe-vera-gel", "neem-face-wash", "herbal-shampoo"];

/* Navbar collections → category groups (used by /plants, /gardening, /natural-care). */
export const COLLECTIONS = {
  plants: {
    title: "Live Plants",
    description: "Indoor and outdoor plants, hand-picked and carefully packed.",
    categories: ["live-plants"],
  },
  gardening: {
    title: "Gardening Essentials",
    description: "Pots, soil, seeds and tools to help your plants thrive.",
    categories: ["pots-planters", "soil-fertilizers", "seeds-tools"],
  },
  "natural-care": {
    title: "Natural Care",
    description: "Skincare and personal care powered by nature's best.",
    categories: ["natural-skincare", "hair-body-care"],
  },
};
