# Soil & Soul — Botanical Living & Gardening E-Commerce Platform

> **Nurturing greener homes, living soils, and flourishing spaces.**  
> Soil & Soul is a modern, full-stack botanical e-commerce platform dedicated to urban gardeners and plant enthusiasts. From nursery-grown houseplants and heirloom seeds to bio-active living potting mixes and handcrafted tools, Soil & Soul delivers botanical living straight to doorsteps.

---

## 🌿 Storefront & Customer Experience

### 1. Curated Botanical Catalog
- **Living Plants**: Healthy, acclimated indoor and outdoor plants (Monstera, Peace Lily, Areca Palm, Snake Plant, Jade Plant, etc.) featuring detailed light, watering, and pet-safety badges.
- **Garden Tools**: Ergonomic bypass shears, brass & stainless steel watering cans, coco coir plant stakes, and precision trowels.
- **Heirloom Seeds**: Organic vegetable varieties, culinary herbs, and vibrant seasonal blooms with germination tips.
- **Living Soil & Nutrition**: Bio-active potting mixes, slow-cured vermicompost, liquid seaweed fertilizer, and compressed coco coir blocks.

### 2. Interactive Shopping & Discovery
- **Single-Line Featured Showcase**: Sleek horizontal slider with navigation buttons highlighting bestsellers and seasonal arrivals.
- **Dynamic Shop by Category**: Intuitive category cards with visual department previews across Plants, Tools, Seeds, and Soil & Care.
- **Instant Search & Deep Filtering**: Real-time attribute search (light levels, maintenance difficulty, pet friendliness) and sorting.

### 3. Customer Account & Address Book
- **Multi-Address Book (Up to 3 Addresses)**: Customers can save up to 3 addresses (Home, Work, Other) with custom labels and default address management.
- **1-Click Checkout Confirmation**:
  - Automatically loads and selects the customer's default address.
  - One-click **"Deliver to this Address"** button eliminates repetitive typing.
  - Easy switcher to toggle between saved addresses or add a new one-time delivery destination.
- **Order Tracking & Real-Time Progress**:
  - Transparent 4-stage tracking timeline: `Placed` → `Packing (Nursery Check)` → `Shipped (Eco-Courier)` → `Delivered (Doorstep)`.
  - Guaranteed standard botanical transit with estimated 7-day doorstep delivery.

### 4. Sprout — The AI Botanical Concierge
- Built-in botanical care assistant available 24/7 across every storefront page.
- Diagnoses common plant symptoms (yellow leaves, under-watering, root-bound signs).
- Recommends tailored plants for specific indoor environments (low light, north-facing rooms, pet households).
- Answers order and shipping policy inquiries with smart fallback heuristics.

### 5. Transparent Reviews & Trust
- Verified purchase badges on customer reviews.
- Photo gallery testimonials from real urban gardeners.
- Integrated customer wishlist and instant notification toasts.

---

## 🪴 Merchant & Nursery Operations

- **3-Level Nested Category Hierarchy**: Tree taxonomy with L1 root categories, L2 subcategories, and L3 nested sub-departments.
- **Safe Archival & Deletion Protections**: Protected canonical roots with cascade checks, in-place archiving, and restore workflows.
- **Inventory & Stock Management**:
  - Real-time stock level monitoring with low-stock alerts.
  - Direct stock adjustments and quick increment/decrement controls.
  - Complete historical stock movement audit logs.
- **Order Fulfillment & COD Operations**: Cash on Delivery (COD) processing with concurrency-safe stock deduction and idempotency safeguards.

---

## 🏗️ Technical Architecture & Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack) & [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom botanical design tokens (Forest `#24452a`, Sand `#f6f4ee`, Sage `#8da68f`)
- **Typography**: Playfair Display / Cormorant serif accents paired with modern sans-serif body typography
- **State & Data**: Modular Context Providers (`AuthProvider`, `CartProvider`, `ToastProvider`) with resilient fetch hooks (`useAuthedResource`)

### Backend
- **Runtime & Server**: Node.js & [Express.js](https://expressjs.com/) (Modular MVC / Service-Repository pattern, native ES modules)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose ODM](https://mongoosejs.com/) (11 optimized relational schemas)
- **AI Engine**: Google Gemini API (`gemini-1.5-flash`) with offline rule-based knowledge engine
- **Security & Reliability**:
  - JWT authentication stored in secure HttpOnly cookies
  - Role-Based Access Control (`customer`, `admin`)
  - Helmet HTTP security headers, CORS origin whitelisting, rate limiting, and NoSQL injection sanitization
  - Idempotency key headers to prevent duplicate order placements

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- MongoDB instance (Local or MongoDB Atlas)
- npm or yarn

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/gauravshivhare-prj/Soil-Soul.git
cd Soil-Soul

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `server` directory:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/soil_and_soul
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key_optional
```

Create a `.env.local` file in the `client` directory (optional for local defaults):

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### 3. Running in Development

In two separate terminals:

```bash
# Terminal 1 — Start the Backend Server
cd server
npm run dev
# Server runs on http://localhost:5000
```

```bash
# Terminal 2 — Start the Storefront Frontend
cd client
npm run dev
# Storefront live on http://localhost:3000
```

---

## 🧪 Testing & Code Quality

The platform includes comprehensive test suites across both layers:

```bash
# Run Backend Test Suite (102 automated tests)
cd server
npm test

# Run Storefront Test Suite (17 automated tests)
cd client
npm test

# Run ESLint Quality Check (0 warnings, 0 errors)
cd client
npm run lint
```

---

## 📍 Soil & Soul Nursery & Customer Care

- **Nursery & Flagship Store**: Soil & Soul Nursery, Bhopal, Madhya Pradesh, India
- **Customer Care Line**: +91 98741 512xx
- **Email Inquiries**: `soil&soul@gmail.com`
- **Shipping**: Plastic-free, breathable botanical transit (Estimated 7-day door delivery across India)

---

## 📄 License

This software and brand assets are distributed under the [MIT License](LICENSE).  
*Good Choices, Greener Tomorrows.*
