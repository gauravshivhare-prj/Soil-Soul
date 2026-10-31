# Soil & Soul

Soil & Soul is a full-stack e-commerce application organized around four catalogue categories:

1. Plants.
2. Tools.
3. Seeds.
4. Natural Products.

## Technology

- Frontend: Next.js App Router, JavaScript, React, Tailwind CSS.
- Backend: Node.js, Express.js, JavaScript ES modules.
- Database: MongoDB with Mongoose.
- Checkout: Cash on Delivery; coupon redemption requires a transaction-capable MongoDB deployment. No external payment gateway is enabled.
- AI assistant: mock responses first; OpenAI API integration in the final phase.
- Images: local files under `client/public/images/` during initial development.

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
