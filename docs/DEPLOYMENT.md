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
