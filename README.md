# Soil & Soul — Botanical E-Commerce Platform

Soil & Soul is an enterprise-grade full-stack botanical e-commerce application organized around four core departments:

1. **Plants** (Indoor, outdoor, low-light, pet-friendly)
2. **Tools** (Handcrafted gardening tools, watering cans)
3. **Seeds** (Organic vegetables, culinary herbs, seasonal blooms)
4. **Soil & Plant Care** (Bio-active potting mixes, vermicompost, seaweed fertiliser, cocopeat)

> 📘 **Stage 2 Assessment Documentation**: For the complete technical report, architecture breakdown, Mermaid ER diagram, and testing metrics, refer to [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md).

## Technology Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, Lucide Botanical Icons.
- **Backend**: Node.js, Express.js (Layered MVC/Service architecture, ES modules).
- **Database**: MongoDB Atlas with Mongoose ORM (11 relational schemas).
- **AI Concierge**: Sprout Botanical Assistant powered by Google Gemini API (`gemini-1.5-flash`) with offline rule fallback.
- **Checkout**: Cash on Delivery (COD) with concurrency-safe stock deduction.
- **Security & RBAC**: JWT with HttpOnly cookies, Role-Based Access Control (`customer` & `admin`), Helmet, Rate-Limiting, Mongo-Sanitize, Joi Validation.
- **Testing**: 119 automated tests (102 backend tests + 17 frontend tests), zero ESLint warnings/errors.

## Repository layout

```text
Soil&Soul/
├── client/       # Next.js frontend
├── server/       # Express API
├── docs/         # Architecture, setup, standards, testing, security
├── README.md
└── .gitignore
```

## Current development rule

Build in small, reviewable steps. After each meaningful change:

1. Inspect the diff.
2. Run the relevant checks.
3. Verify the behavior manually where appropriate.
4. Fix failures before starting another feature.
5. Commit a known-good milestone when Git is initialized.

Do not add real API keys, payment secrets, or production credentials to source control.

## Local setup

See [`docs/setup-guide.md`](docs/setup-guide.md).

## Architecture

See [`docs/architecture.md`](docs/architecture.md).

## Engineering standards

- [`docs/coding-standards.md`](docs/coding-standards.md)
- [`docs/code-documentation-standard.md`](docs/code-documentation-standard.md)
- [`docs/api-conventions.md`](docs/api-conventions.md)
- [`docs/database-design.md`](docs/database-design.md)
- [`docs/security.md`](docs/security.md)
- [`docs/testing-strategy.md`](docs/testing-strategy.md)
- [`docs/feature-workflow.md`](docs/feature-workflow.md)
- [`docs/deployment.md`](docs/deployment.md)
- [`docs/decisions.md`](docs/decisions.md)

## Current status

The repository contains implemented storefront and backend functionality, but a successful lint or source-test run does not establish live database or browser behavior. Verify the current working tree using the setup guide before relying on runtime status. Do not assume that database content, an external payment gateway, or a live OpenAI integration is configured.
