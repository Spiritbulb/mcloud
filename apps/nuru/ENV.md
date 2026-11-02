# Nuru environment variables

Names only, never values. Set them in `.env.local` (gitignored) and in the host's settings.

- `DATABASE_URL` (Neon)
- `WORKOS_API_KEY`
- `WORKOS_CLIENT_ID`
- `WORKOS_COOKIE_PASSWORD`
- `NEXT_PUBLIC_WORKOS_REDIRECT_URI` (`https://nuru.spiritb.uk/callback`)
- `CRON_SECRET`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`
- `B2_ENDPOINT`
- `B2_REGION`
- `B2_BUCKET`
- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `IP_HASH_SALT` (waitlist rate limiting)

`WORKOS_COOKIE_DOMAIN` must be **unset**: Nuru has its own session on its own host and shares nothing with mcloud.

Anything read at build time must also be listed in the root `turbo.json` `tasks.build.env`.

## Outside settings

These live in the providers' dashboards, not in env vars.

- **B2 bucket CORS** (the browser PUTs uploads and pdf.js reads with range requests):
  - `allowedOrigins`: `http://localhost:3002`, `https://nuru.spiritb.uk`
  - `allowedOperations`: `s3_get`, `s3_head`, `s3_put`
  - `allowedHeaders`: `range`, `content-type`
  - `exposeHeaders`: `content-range`, `accept-ranges`, `content-length`, `etag`
- **WorkOS sign-out redirects** must include `https://nuru.spiritb.uk` (and `http://localhost:3002` for local work). Sign-out sends an absolute `returnTo` built from the request origin.

## Migrations

`migrations/*.sql` are applied by hand to the Neon database, in filename order. There is no runner.
