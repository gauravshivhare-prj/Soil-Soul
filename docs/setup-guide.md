# Local Setup and Verification

## 1. Prerequisites

Install a supported Node.js LTS release and npm. Use the versions recommended by the installed Next.js version. Verify:

```bash
node --version
npm --version
```

Run commands from the correct folder. `client/` and `server/` are separate npm projects and each has its own `package.json` and dependencies.

## 2. Install frontend dependencies

```bash
cd client
npm install
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

Stop it with `Ctrl+C`.

## 3. Verify the frontend

From `client/`:

```bash
npm run lint
npm run build
```

Only report a check as passed if the command exits successfully. If a script is missing, inspect `client/package.json` and add/configure the script intentionally rather than pretending it ran.

The production build currently uses `next/font/google` for Caveat, Geist, Geist Mono and Lora, so the build environment must be able to reach `fonts.googleapis.com`. If that network access is unavailable, use an approved proxy/network path or provide properly licensed local font files through `next/font/local`; do not remove the configured fonts just to bypass the build failure.

## 4. Install backend dependencies

Open a second terminal:

```bash
cd server
npm install
```

Start the API:

```bash
npm run dev
```

The initial setup is expected to use port `5000`, subject to the current validated environment configuration.

## 5. Verify the health endpoint

Open this URL in a browser or use curl:

```text
http://localhost:5000/api/v1/health
```

PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/health" -Method Get
```

A successful response should be HTTP 200 with a small JSON payload indicating that the service is healthy. Verify the actual response from the current code; do not rely only on an old report.

## 6. Environment files

Each app may provide `.env.example` as a template. When a feature requires local environment variables:

1. Read the relevant `.env.example`.
2. Create a local `.env` in the appropriate app folder.
3. Fill only values required for the current phase.
4. Never commit `.env`.
5. Never paste private credentials into chat or logs.

Do not add MongoDB, OpenAI, or Razorpay credentials before their corresponding integrations are implemented and needed.

## 7. MongoDB transactions for coupon checkout

Checkout that redeems a coupon requires MongoDB multi-document transaction support, provided by a replica set or sharded cluster. A standalone MongoDB server can support checkout without a coupon, but coupon redemption fails closed with `COUPON_REQUIRES_TRANSACTION`; do not remove this guard or redeem coupons through a non-transactional fallback. Configure the required topology separately for the intended environment. This project does not change local or production MongoDB topology automatically.

## 8. Common troubleshooting

### Port already in use
Stop the existing process or select a different port through the documented environment variable. Do not kill unrelated processes without identifying them.

### Dependency or build failure
Read the first meaningful error, inspect the affected package and lockfile, and fix the root cause. Avoid deleting lockfiles or upgrading every dependency as a first reaction.

### CORS failure
Confirm the exact frontend origin and the server CORS configuration. Do not use a permissive wildcard for credentialed production requests.

### Health endpoint returns 404
Confirm that the root router is mounted at `/api/v1` and the health route is registered at `/health`.

### Environment validation fails
Read the names of missing settings, not secret values. Add only the required setting to the local environment.

## 9. Before reporting a phase complete

Record:
- Commands executed.
- Pass/fail result.
- Any warnings.
- Manual browser/API checks.
- Known limitations.
- Files changed.
