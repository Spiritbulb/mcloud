# Moving the storefront to its own domain

Today the storefront (`apps/storefront`) is served at `app.mcloud.co.ke` and signs people in through the
web app. This page lists what ties it to `mcloud.co.ke` so the later move to a domain of its own is a
checklist, not a hunt. Nothing here is done yet except step 0.

User-facing explanation: `/moving` on the storefront (`app/(marketing)/moving`). The web app shows a banner
(`apps/web/.../org/[orgSlug]/storefront-move-banner.tsx`) linking to it. Update both when a date is known.

## What couples the two today

| Coupling | Where | On a new domain |
|---|---|---|
| Shared session cookie, scoped to `.mcloud.co.ke` | `WORKOS_COOKIE_DOMAIN` (both apps, same `WORKOS_COOKIE_PASSWORD`) | A cookie cannot cross to another registrable domain. The storefront needs its own session. |
| Sign-in screens live on web | `apps/storefront/lib/auth-urls.ts` (`loginHref`, `signupHref`, `authOrigin()`), used by `proxy.ts`, `/login`, `/signup`, `/start` | Point `NEXT_PUBLIC_AUTH_ORIGIN` at the storefront once it serves `/auth/*`. This file is the only place to change. |
| Return path after sign-in is app-relative | web forwards `/start` and `/org/*/settings` back (`apps/web/proxy.ts`) | Becomes unnecessary once sign-in is on the storefront origin. Remove the forwards after the old links stop arriving. |
| "Platform host" = `mcloud.co.ke` family | `lib/host.ts` `PLATFORM_APEX_DOMAINS` (and the same list in `apps/web/proxy.ts`) | Add the new apex. Keep `mcloud.co.ke` while old links exist. |
| Link origins | `NEXT_PUBLIC_SITE_ORIGIN` (`storefrontUrl`, `storeSettingsUrl`, `storefrontSiteUrl`), `NEXT_PUBLIC_WEB_ORIGIN` | Change the env, redeploy (build-time values). `shop.` and `app.` must keep resolving. |
| Editor preview framing | `NEXT_PUBLIC_ADMIN_ORIGIN` and CSP `frame-ancestors` in `next.config.ts` | Must name whichever origin hosts the editor. |
| WorkOS redirect URI | WorkOS dashboard, `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | Register the new origin's `/callback`. The storefront has no callback route yet; web's is `apps/web/app/callback/route.ts`. |

## Checklist

0. Done: every sign-in link goes through `lib/auth-urls.ts`; `/login` and `/signup` are stable entry points;
   `?returnTo` is sanitised to an app-relative path by `sanitizeRelativePath` (`@mcloud/auth/routes`).
1. Add `app/auth/*` and `app/callback` to the storefront (login form, `/api/auth/send-code` and `verify`,
   `handleAuth`), reusing `@mcloud/auth`. Magic-code verify sets the cookie, so it must be same-origin.
2. Add a storefront `/auth/handoff` that redeems tickets (`apps/web/app/api/_handoff/tickets.ts`) so a user who
   is signed in on web can arrive signed in. Decide which app owns the ticket table.
3. Register the new redirect URI in WorkOS and set `NEXT_PUBLIC_AUTH_ORIGIN`, `NEXT_PUBLIC_SITE_ORIGIN`,
   `WORKOS_COOKIE_DOMAIN` (new apex) in the storefront project.
4. Add the apex to `PLATFORM_APEX_DOMAINS` in the storefront; update `NEXT_PUBLIC_STOREFRONT_ORIGIN` on web.
5. Expect a one-time sign-in for existing merchants (cookies are per domain). `/moving` already says so.
6. Keep the redirects: `app.` and `shop.` URLs, web's `/org/*/settings` and `/start` forwards, custom domains.
