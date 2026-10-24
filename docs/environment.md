# Environment variables

Names and purposes only. Never commit values. Locally they live in `apps/<app>/.env.local`
(gitignored; `vercel env pull` fetches them). In production they are Vercel project
settings. The list is generated from `process.env.*` usage, so if you add a variable,
add it here.

`NEXT_PUBLIC_*` values are **inlined at build time**: changing one needs a redeploy.
`turbo.json` runs in strict env mode: a non-`NEXT_PUBLIC_` variable that code reads **during
`next build`** must be listed in `tasks.build.env`, or it is invisible to the build.

## Shared by both apps

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server only; bypasses RLS) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` | Public anon key for browser clients. Two names are in use (`packages/db`); set both. |
| `WORKOS_API_KEY`, `WORKOS_CLIENT_ID` | WorkOS AuthKit |
| `WORKOS_COOKIE_PASSWORD` | Seals the session cookie. **Must be identical in web and storefront.** |
| `WORKOS_COOKIE_DOMAIN` | `.mcloud.co.ke`, so the session is shared across subdomains |
| `NEXT_PUBLIC_SITE_ORIGIN` | Display/canonical origin for stores, e.g. `https://app.mcloud.co.ke` |
| `PREVIEW_SECRET` | Signs Editor preview tokens. **Must match in both apps.** |
| `REVALIDATE_SECRET` | Authorises web's calls to the storefront's `/api/revalidate` (cache purge). **Must match in both apps.** Without it web's edits show on public pages only at the next hourly refresh. |
| `RESEND_API_KEY` | Transactional email (invites, notifications, waitlist) |
| `DARAJA_ENV` | `production` for live M-PESA, otherwise sandbox |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE` | PayPal (`live` or sandbox) |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_STORE_NAME` | Used to build payment return URLs and client calls to the provider endpoints |
| `NEXT_PUBLIC_STOREFRONT_ORIGIN` | Where web redirects store traffic |

## `apps/web` only

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GA_ID` | Optional. Overrides the built-in production GA4 property (e.g. a staging property). Inlined at build, so changing it needs a redeploy. |
| `HANDOFF_ENC_KEY` | Encrypts mobile → web SSO handoff tickets |
| `NEXT_PUBLIC_ADMIN_ORIGIN` | Web's own public origin (`https://www.mcloud.co.ke`): SSO handoff redirects and payment return URLs (wallet top-up, Reach orders). The storefront no longer reads it. |
| `PARTNER_AUTH_SECRET` | `x-partner-secret` for `/api/partner/*` |
| `CRON_SECRET` | Authenticates Vercel cron calls |
| `REVIEW_ACCOUNT_EMAIL`, `REVIEW_ACCOUNT_PASSWORD` | Store-review test login for the mobile app |
| `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`, `GOOGLE_ADMIN_SUBJECT` | Google service account (adds testers to the beta Google Group) |
| `BETA_GROUP_EMAIL`, `BETA_PLAY_OPT_IN_URL` | Closed-testing group and opt-in link |
| `PALPLUSS_API_KEY`, `PALPLUSS_BASE_URL` | PalPluss (wallet top-ups, Reach payments) |
| `UPCLOUD_API_TOKEN` | UpCloud (servers) |
| `TRADING_VERCEL_TOKEN`, `TRADING_VERCEL_PROJECT_ID`, `TRADING_VERCEL_TEAM_ID` | Domain management for trading apps |
| `ANTHROPIC_API_KEY` | Nuru chat (Anthropic path) |
| `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_CHAT_DEPLOYMENT`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | Nuru chat and embeddings (Azure path) |
| `AZURE_VISION_ENDPOINT`, `AZURE_VISION_API_KEY` | OCR for Nuru note ingest |

## `apps/storefront` only

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_WEB_ORIGIN` | Where login, the org hub and billing live (`https://mcloud.co.ke`) |
| `R2_WORKER_URL`, `R2_AUTH_SECRET` | The Cloudflare R2 upload worker and its bearer secret |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | Custom-domain management (`/api/store/domain`); the project id is the **storefront** project |

`apps/storefront/ENV.md` is the older per-app checklist; this file supersedes it where they differ.

## Retired

`AUTH0_*` is gone (Auth0 was removed). `GOOGLE_PLAY_HOBBY_SKU` and `GOOGLE_PLAY_PRO_SKU` (and the mobile `EXPO_PUBLIC_PLAY_*_SKU`) are gone with Google Play billing. Delete any remaining copies from Vercel and local files.
