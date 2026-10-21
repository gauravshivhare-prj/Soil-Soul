# Deployment Plan

Deployment is a later phase. Do not deploy an incomplete app with secrets or test data.

## 1. Services

- Frontend: a hosting service compatible with the chosen Next.js features.
- Backend: a Node.js hosting service that runs the Express server.
- Database: managed MongoDB with access restrictions and backups.
- Images: local assets initially; managed object/image storage can be added when product uploads and scale justify it.

## 2. Environment separation

Maintain separate development, test, and production settings. Use hosting-provider secret managers for private values. `.env.example` documents names and safe placeholders only.

Potential settings, added only when needed:
- `NODE_ENV`
- `PORT`
- `CORS_ORIGIN`
- `MONGODB_URI` when database integration is implemented
- Authentication/session secret when authentication is implemented
- Razorpay credentials in the payment phase
- OpenAI API key in the final assistant phase

Do not create or populate unnecessary settings before their features exist.

## 3. Server readiness

Before release:
- The process starts through `server.js`.
- The app listens on the configured port.
- The health endpoint returns a successful response.
- Shutdown closes the HTTP server and database connections where applicable.
- Logs do not include secrets.
- Errors are safe in production.
- CORS allows only expected origins.

## 4. Frontend configuration

The frontend should use the configured public API base URL. Public environment variables are visible to browsers; they must contain only public configuration, never private keys.

Verify image paths, route behavior, error states, metadata, and production build.

## 5. Database

- Restrict database network access.
- Use a least-privilege database user.
- Configure backups and test restoration procedures where available.
- Create indexes based on the application's query patterns.
- Do not expose database credentials to the frontend.

## 6. Release checklist

- [ ] Frontend build passes.
- [ ] Backend tests pass.
- [ ] Health endpoint passes.
- [ ] Authentication and authorization are tested.
- [ ] Environment values are configured in the host.
- [ ] No secrets are present in Git history or client bundles.
- [ ] CORS and cookie settings are correct for production.
- [ ] Database backup/recovery approach is known.
- [ ] Critical customer journeys work in the deployed environment.
- [ ] Rollback procedure is documented.
