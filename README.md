# Soil & Soul

Soil & Soul is a full-stack e-commerce application for three product families:

1. Live plants.
2. Gardening and plant-care supplies, including pots, planters, soil, compost, fertilizers, seeds, and tools.
3. Plant-derived personal-care products, such as aloe vera gel, neem face wash, and herbal shampoo.

## Technology

- Frontend: Next.js App Router, JavaScript, React, Tailwind CSS.
- Backend: Node.js, Express.js, JavaScript ES modules.
- Database: MongoDB with Mongoose, planned for a later phase.
- Payments: Cash on Delivery first; Razorpay test mode after the core order flow is stable.
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

The initial project foundation is reported as created. Before relying on any status claim, rerun the commands in the setup guide on the current working tree. No database, real payment gateway, or live OpenAI integration should be assumed to exist until implemented and verified.
