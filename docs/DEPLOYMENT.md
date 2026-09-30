# Local Docker deployment

The Compose stack runs the API in production mode, so it requires separate secrets for JWT authentication and report integrity plus an externally operated PKI signing service. The repository does not include usable default secrets or a signing key.

1. Copy `.env.example` to `.env`.
2. Generate two independent random secrets of at least 32 characters and put one in each secret field. For example, in PowerShell:

   ```powershell
   [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
   ```

   Run it twice. Do not use the same value for both secrets, and do not commit `.env`.
3. Provision an HSM or KMS backed signer adapter. Configure its HTTPS `REPORT_SIGNING_SERVICE_URL`, bearer token, and key ID. The API sends `POST` JSON `{ "digest": "<sha256 hex>", "algorithm": "RSA-SHA256", "keyId": "<configured key id>" }`; the signer returns `{ "signature": "<base64>", "algorithm": "RSA-SHA256", "keyId": "<configured key id>", "signedAt": "<ISO-8601 timestamp>" }`.
4. Set `REPORT_SIGNING_CERTIFICATE_B64` to the base64 encoded PEM signing certificate. Add its SHA-256 fingerprint to `REPORT_SIGNING_TRUSTED_FINGERPRINTS`; retain old fingerprints during key rotation so historic signatures remain verifiable.
5. Set `CLIENT_ORIGIN` and `PUBLIC_APP_URL` to the addresses used by your deployment.
6. Run `docker compose up --build` from the repository root.

The API never receives the signing private key. Production startup fails unless the separate signer service and certificate trust configuration are present. This repository supplies the adapter contract and verifies detached RSA-SHA256 signatures against pinned X.509 certificate fingerprints; deployment still requires an actual HSM/KMS signer, an approved certificate, and a trusted timestamp policy.

## Local development

Run the backend from `server/` with a local `.env` containing `NODE_ENV=development`, `MONGO_URI`, and `JWT_SECRET`. Copy `.env.example` as a starting point, replace the development secrets, and do not commit `.env`.

```powershell
cd server
npm install
npm run dev
```

The local API listens on port 5000. Run the frontend from `client/` in a second terminal; its Vite proxy sends `/api` requests to `http://localhost:5000`.

## Deploy the backend to Vercel

Deploy the backend as its own Vercel project with the repository's **Root Directory** set to `server`. Vercel detects the Express app exported from `src/app.js`; `server/vercel.json` allows up to 60 seconds for report generation and schedules rule activation once per hour. The selected Vercel plan must support the configured function duration. Do not run the local `npm start` command as a Vercel build command.

Set the following in the Vercel project's environment variables (Production, and Preview too if you deploy previews):

| Variable | Value |
| --- | --- |
| `MONGO_URI` | Production MongoDB Atlas connection string; allow the Vercel deployment to connect in Atlas network access settings. |
| `JWT_SECRET` | Independent random secret, at least 32 characters. |
| `REPORT_INTEGRITY_SECRET` | A different independent random secret, at least 32 characters. |
| `CRON_SECRET` | Random secret, at least 32 characters; Vercel sends it as a bearer token to the scheduled activation endpoint. |
| `CLIENT_ORIGIN` | Exact frontend origin(s), comma-separated, with no trailing slash (for example `https://your-frontend.vercel.app`). |
| `PUBLIC_APP_URL` | Frontend origin used to build report verification QR links. |
| `ENABLE_DEMO` | `false` for production. |
| `REPORT_SIGNING_SERVICE_URL` | HTTPS endpoint for the external RSA-SHA256 signing service. |
| `REPORT_SIGNING_SERVICE_TOKEN` | Secret bearer token for that signing service. |
| `REPORT_SIGNING_KEY_ID` | Key identifier configured in the signing service. |
| `REPORT_SIGNING_CERTIFICATE_B64` | Base64-encoded PEM certificate corresponding to the signer's public key. |
| `REPORT_SIGNING_TRUSTED_FINGERPRINTS` | Comma-separated SHA-256 certificate fingerprints trusted for verification. |

Vercel sets `NODE_ENV=production` for production deployments. Keep `NODE_ENV=development` in the local `server/.env`; do not copy local secrets into Vercel. Production startup intentionally rejects missing or weak secrets and missing/invalid PKI signer configuration.

Uploaded evidence and generated PDF/DOCX files use MongoDB GridFS on Vercel so they survive function invocations; local development continues storing them under `server/uploads/`. Vercel's function request-size limit means attachment uploads are capped at 4 MiB there (10 MiB locally). PDF generation uses the Vercel-compatible Chromium runtime in deployed functions and the regular Puppeteer installation locally.

Files already present only under a developer's `server/uploads/` are not included in deployment and are not migrated automatically. If you import existing report/attachment records into the production database, migrate their files into GridFS before expecting their download or integrity checks to work; otherwise use a fresh production database.

For a new, empty production database, provision its first administrator from a trusted local terminal before opening the app. From `server/`, set `MONGO_URI`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (12+ characters with upper/lowercase, number, and special character), and `BOOTSTRAP_ADMIN_CONFIRM=CREATE_FIRST_ADMIN`, then run `npm run bootstrap:admin`. The script refuses to run if the database already contains any users and writes an audit event. Supply these values through a secure, temporary environment—not a committed `.env`—and remove the bootstrap variables after it succeeds. Do not run the demo seeding pipeline against a live database.

After deployment, confirm `https://<backend-domain>/health` returns `{"status":"healthy",...}`. The readiness endpoint `/ready` additionally checks MongoDB.

## Deploy the frontend to Vercel

Create a separate Vercel project with **Root Directory** set to `client`. Vercel builds the Vite app to `dist`; `client/vercel.json` sends client-side routes to `index.html`. Set the frontend project's `VITE_API_URL` to the backend origin only, such as `https://your-backend.vercel.app` (do not append `/api`). This variable is embedded at build time. Add the frontend's production origin to the backend's `CLIENT_ORIGIN`, then redeploy the backend if that value changed.

For local development, leave `VITE_API_URL` unset. Vite then proxies API calls to the local backend, so local `.env` values and Vercel environment variables remain independent.
