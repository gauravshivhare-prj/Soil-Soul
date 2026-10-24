# Security Requirements

Security is part of every phase, not a final polish task.

## 1. Secrets and environment variables

- Keep `.env` files out of Git.
- Commit only `.env.example` with placeholder values.
- Never place private keys in frontend source or `NEXT_PUBLIC_` variables.
- Never log tokens, passwords, API keys, payment secrets, or full sensitive payloads.
- Store production secrets in the hosting provider's secret/environment manager.
- If a secret is exposed, revoke/rotate it; deleting it from the latest commit is insufficient.

## 2. Authentication

Choose and document the authentication/session design before implementing login. Use a reputable password-hashing algorithm and secure session handling.

If using cookies:
- Set `HttpOnly`, `Secure` in HTTPS production, and an appropriate `SameSite` policy.
- Assess CSRF risk and apply protection where required.
- Configure cookie domain/path carefully.

If using bearer tokens:
- Avoid storing long-lived sensitive tokens in browser-accessible persistent storage where possible.
- Define expiration, refresh, revocation, and logout behavior.
- Validate tokens server-side.

Do not mix multiple authentication patterns without a clear reason.

## 3. Authorization

- Enforce role checks in Express.
- Enforce resource ownership on every customer-specific endpoint.
- Do not trust a role sent in a request body.
- Restrict administrative operations and sensitive customer data.
- Hide UI controls as a usability measure only, never as the security boundary.

## 4. Input validation

Validate path parameters, query strings, request bodies, and uploaded files at the server boundary. Set length and numeric bounds. Allowlist sort fields and filters. Avoid unsafe MongoDB query construction from raw user input.

## 5. Web application protections

- Use Helmet with an appropriate configuration.
- Configure CORS for known origins; do not use permissive wildcard CORS with credentials.
- Apply rate limits to login, registration, coupon validation, and AI endpoints.
- Set request-body size limits.
- Use HTTPS in production.
- Keep dependencies patched and audit them regularly.
- Return safe errors without internal stack traces in production.

## 6. Payments

- Create payment orders server-side.
- Recalculate totals on the server.
- Verify provider signatures on the server.
- Verify webhook authenticity.
- Process webhook events idempotently.
- Never mark an order paid solely because the browser reports success.
- Never store card numbers or CVV data.

## 7. OpenAI assistant

- Integrate only in the final phase.
- Keep the API key server-side.
- Limit input length, request rate, response size, and timeouts.
- Do not let model output directly authorize discounts, change stock, or reveal private orders.
- Ground product claims in the catalog and policy data.
- Verify user identity and authorization before returning order-specific information.
- Do not log full private conversations unnecessarily.

## 8. Images and uploads

Use controlled image types, file-size limits, and a safe storage strategy for user/admin uploads. Do not trust filenames or client-provided MIME types alone. The initial local public images are static assets, not a general-purpose upload endpoint.

## 9. Release checklist

Before deployment:
- Check Git status and history for accidental secrets.
- Verify environment configuration.
- Run tests, lint, and build.
- Confirm production CORS and cookie settings.
- Confirm no debug endpoints or verbose errors are exposed.
- Confirm authorization tests cover customer/admin boundaries.

## 10. Implemented session controls (backend)

- Access tokens: HS256, 15-minute default lifetime, `type: access`, and a per-user token version (`tv`) checked on every authenticated request together with the account `status`.
- Logout increments the token version, revoking every session for that user (there is no per-device logout yet).
- A disabled account is refused on every request (`403 ACCOUNT_DISABLED`) and cannot obtain new tokens. There is no admin endpoint to disable accounts yet (planned in P8); today it is a database change.
- Per-account login lockout: 5 attempts per 15-minute window per account key, then a 15-minute lock (`429 TOO_MANY_ATTEMPTS` with `Retry-After` and `retryAfterSeconds`). The key is an HMAC-SHA256 of the normalized email (keyed with `JWT_SECRET`); emails are never stored. Unknown and existing emails are counted identically, so the lockout reveals nothing. Each attempt is reserved atomically **before** the password is checked, so concurrent attempts cannot verify more passwords than the limit; a successful login clears the record (a disabled-account login does not). Records live in `login_attempts` with a TTL index, so the lockout works across instances. The unique `keyHash` index is required for that guarantee: run `npm run db:index` before deploying (production does not auto-create indexes).
- The per-IP auth limiter (in memory, single instance, ADR-009) still applies on top of the account lockout.
