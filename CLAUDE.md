# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typedate     # Regenerate Supabase TypeScript types from remote schema
npm run release      # Patch version release
npm run release:minor
npm run release:major
```

There is no test suite configured.

## Architecture

**Menengai Cloud** is a multi-tenant SaaS e-commerce platform for Kenyan/African businesses. Stores are accessible via subdomain (`{slug}.menengai.cloud`) or custom domains.

### Multi-Tenant Routing

The core of the system is `proxy.ts` + `middleware.ts`. Every incoming request is inspected:
- Custom domain → rewrites to `/store/[slug]` (public storefront)
- Subdomain → checks Auth0 session, then rewrites or redirects
- Main domain → serves marketing pages

This means a single Next.js app serves both the marketing site and all customer storefronts.

### Authentication Flow

Auth is handled by **Auth0** (`@auth0/nextjs-auth0`). The callback at `/api/auth/[auth0]` upserts the user into Supabase, checks store membership, then redirects to either `/store/[slug]/settings/general` or `/onboarding`.

Two Supabase clients exist:
- `lib/client.ts` — browser client (`createBrowserClient`)
- `lib/server.ts` — server client (`createServerClient`) for Server Components/Route Handlers

### Theme System

Storefronts support three themes: `classic`, `noir`, `minimal`. Theme components live in `src/themes/`. The resolver at `src/themes/resolver.ts` dynamically selects the right theme components based on store settings. Theme prop types are shared in `src/themes/types.ts`.

### Route Groups

- `app/(marketing)/` — Public marketing pages (homepage, support, changelog)
- `app/store/[slug]/` — Store owner settings dashboard (authenticated)
- `app/store/[slug]/products/`, `app/store/[slug]/blog/`, etc. — Public storefront pages served via the proxy rewrite
- `app/auth/` — Auth pages (login, signup, password reset)
- `app/onboarding/` — New store creation flow

### Cart

Shopping cart state is managed client-side via `contexts/CartContext.tsx` using `localStorage`. Checkout flows through `/api/payments/paypal/` which handles KES → USD conversion before sending to PayPal.

### Database Types

Supabase types are generated and live in `app/types/database.types.ts`. Run `npm run typedate` after schema changes.

### Key env vars

`AUTH0_*`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `RESEND_API_KEY`
