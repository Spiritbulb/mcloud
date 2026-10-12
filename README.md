# Menengai Cloud

A platform for Kenyan merchants, NGOs and creators to build and run an online presence:
a hosted storefront or site, a settings area to manage it, payments (M-PESA, PayPal),
and companion mobile apps. Built by [Spiritbulb](https://spiritb.uk). Status: beta,
actively developed.

## What's in the repo

| Path | What it is |
|---|---|
| [`apps/web`](apps/web) | The platform site at `mcloud.co.ke`: marketing, login, org hub, billing, servers/wallet, admin, and the mobile and partner APIs. |
| [`apps/storefront`](apps/storefront) | `app.mcloud.co.ke` and merchants' custom domains: public stores plus the signed-in store settings. |
| [`apps/mobile`](apps/mobile) | Expo (React Native) merchant app. |
| [`apps/nuru`](apps/nuru) | Expo notes/chat app. |
| [`packages/*`](packages) | Shared code: auth, db, merchant logic, liquid templates, themes, verticals, UI. |
| [`migrations`](migrations) | Hand-written SQL migrations for Supabase. |
| [`docs`](docs) | Architecture, API, payments, environment, and the cleanup log. |

`apps/web` and `apps/storefront` are Next.js 16 (App Router) apps in an npm-workspaces +
Turborepo monorepo. The mobile apps are Expo projects with their own lockfiles.

## Quick start

Requirements: Node 24, npm 12.

```sh
npm install
npm run dev                           # web on :3000, storefront on :3001
```

You need a `.env.local` in `apps/web` and `apps/storefront` (Supabase, WorkOS and the other
variables in [docs/environment.md](docs/environment.md)). Pull them from Vercel with
`vercel env pull` if you have access.

## Everyday commands

```sh
npx turbo run typecheck lint test    # what CI runs
npx turbo run build                  # production builds (needs network for fonts, and env)
npm test -w @mcloud/storefront       # one workspace's tests
```

Mobile: `cd apps/mobile && npm install && npx expo start` (same for `apps/nuru`).

## Documentation

Start with [docs/README.md](docs/README.md).

- [Architecture](docs/architecture.md): apps, hosts, request flow, auth, data
- [API](docs/api.md): route kinds, conventions, how to add a route
- [Payments](docs/payments.md): M-PESA and PayPal flows and their invariants
- [Environment](docs/environment.md): every variable, by app
- [Cleanup log](docs/CLEANUP.md): known debt and what has been fixed
- [AGENTS.md](AGENTS.md): rules for AI coding agents (useful for humans too)

## Deployment

Both Next.js apps deploy to Vercel (separate projects). `apps/*/Dockerfile` exist for a
future self-hosted setup and are not the production path. Mobile builds run through EAS
(`apps/mobile/eas.json`) and `.github/workflows/android-build.yml`.
