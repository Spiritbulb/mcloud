# Storefront environment

Names only, never values. Everything below is read at runtime from `.env.local` (dev) or Vercel project settings.

```sh
# Environment the storefront needs once it serves the merchant area (/org/*).
# Names only: copy to .env.local and fill in values. Never commit real values.

# --- Already required by the storefront ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_API_BASE_URL=            # web API base; webAppOrigin() derives the web origin from it
NEXT_PUBLIC_ADMIN_ORIGIN=
PREVIEW_SECRET=                      # must match apps/web

# --- Added for /org/* auth (WorkOS AuthKit) ---
WORKOS_API_KEY=
WORKOS_CLIENT_ID=
WORKOS_COOKIE_PASSWORD=              # MUST be identical to apps/web so each app can read the other's session
WORKOS_COOKIE_DOMAIN=.mcloud.co.ke   # share the session cookie across web + app.mcloud.co.ke
NEXT_PUBLIC_WORKOS_REDIRECT_URI=     # only if the storefront ever hosts the auth callback (currently web does)

# --- Added for settings features ---
RESEND_API_KEY=                      # team invites / notification emails
VERCEL_TOKEN=                        # custom-domain management (api/store/domain)
VERCEL_PROJECT_ID=                   # the STOREFRONT project: domains attach to the app serving them
VERCEL_TEAM_ID=
NEXT_PUBLIC_SITE_ORIGIN=             # storefrontUrl() display origin, e.g. https://app.mcloud.co.ke
NEXT_PUBLIC_STOREFRONT_ORIGIN=       # used by web redirects; listed here for parity

# --- Possibly needed (confirm during Phase 3) ---
# HANDOFF_ENC_KEY (only if settings code paths touch the SSO handoff). Auth0 is being removed; no AUTH0_* vars.
```
