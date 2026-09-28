# Local Docker deployment

The Compose stack runs the API in production mode, so it requires separate secrets for JWT authentication and report integrity. The repository does not include usable default secrets.

1. Copy `.env.example` to `.env`.
2. Generate two independent random secrets of at least 32 characters and put one in each secret field. For example, in PowerShell:

   ```powershell
   [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
   ```

   Run it twice. Do not use the same value for both secrets, and do not commit `.env`.
3. Set `CLIENT_ORIGIN` and `PUBLIC_APP_URL` to the addresses used by your deployment.
4. Run `docker compose up --build` from the repository root.

The report secret currently protects an HMAC integrity tag. It is not a PKI certificate or a detached digital signature; production PKI/HSM signing remains an outstanding requirement.
