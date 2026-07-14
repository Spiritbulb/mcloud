# Nuru App — Auth Scaffold (Slice 1) Design

**Date:** 2026-07-02
**Status:** Approved (brainstorming)
**Scope:** Stand up `apps/nuru` in the mcloud monorepo with WorkOS magic-code login working end-to-end against the existing `/api/mobile/*` endpoints. No notes/chat data work in this slice.

## Context

Nuru is a student "chat with your notes" mobile app. A standalone Expo Router UI scaffold already exists (dark theme, Fraunces serif wordmark, sunburst logo, drawer navigation, mock `services/*` behind a frozen contract). Its backend and deployment will live in the **mcloud-1 monorepo** (Menengai Cloud — npm workspaces + turbo), which already runs a merchant platform with:

- **WorkOS** identity (AuthKit), verified server-side via JWKS.
- **Supabase** with a service-role client (`@mcloud/db/server`, server-only) and an anon/publishable client (`@mcloud/db/client`, browser-safe).
- A production `/api/mobile/*` surface consumed by `apps/mobile` (the merchant app), including magic-code auth endpoints.

This slice makes Nuru a second consumer app riding on that shared spine (one identity pool, one database, one API surface, shared `packages/`).

## Decisions (locked during brainstorming)

1. **Frontend home:** new `apps/nuru` workspace app (own SDK 57 UI + drawer nav), sharing the monorepo's `packages/` and `/api/mobile/*` backend. Not merged into `apps/mobile` (that is the merchant app, SDK 56).
2. **WorkOS client:** **shared** with mcloud (same client id, same user pool). Fastest to stand up; can split later.
3. **Login flow:** **native magic-code** (`send-code` / `verify`), NOT browser PKCE. A shared WorkOS client means a shared `mcloud://auth` redirect scheme, which two apps cannot both register on one device without collision. Magic-code has no browser and no deep-link scheme, so there is no collision. The token pair it returns is identical to the OAuth flow, so `/me` and everything downstream is unchanged.
4. **Backend:** **no new server code this slice.** `POST /api/mobile/auth/send-code`, `POST /api/mobile/auth/verify`, and `GET /api/mobile/me` already exist and are production-tested. `verify` provisions the `users` row via `ensureUserRow` and is rate-limited.
5. **Data separation:** Nuru shares mcloud's Supabase DB. Identity uses the **shared `users` table** (WorkOS id is the PK, already provisioned by `verify`). Future Nuru tables (`notes`, `messages`) carry a `user_id` FK and are tagged/named so Nuru data is identifiably separate. No new tables in this slice.
6. **Dev target:** Expo web (`apps/nuru` on :8081) against a locally-running `apps/web` (:3000). Drivable headless for verification.
7. **Branch:** implementation lands on `main` (per user); this slice is on the `main` line, not the current `feat/storefront-liquid-pipeline` branch.

## Architecture

### New app: `apps/nuru`
- Lives at `apps/nuru`, a **standalone npm project** inside the monorepo — NOT added to the root `workspaces` array. This matches `apps/mobile`, which is also standalone (root workspaces is `['apps/web', 'apps/storefront', 'packages/*']`). Rationale: the Expo/React Native SDK-57 dependency tree conflicts with the Next.js apps' hoisted tree; keeping it out of the workspace avoids React/RN version clashes. It installs its own `node_modules`.
- Because it is standalone, `apps/nuru` talks to `apps/web` only over HTTP; it cannot and does not import the `@mcloud/*` server packages.
- The existing Nuru scaffold is **copied** into `apps/nuru` (the standalone `c:\Users\busie\nuru` repo is left intact as the source; it is not deleted or git-moved): dark theme tokens, Fraunces font, `Logo`/`Brand`/`ThinkingIndicator`/drawer components, and the Chat/Notes/Profile screens — visually unchanged.
- SDK 57 (as the scaffold is). It does NOT import the server packages (`@mcloud/db`, `@mcloud/auth` are Next.js server-only); it talks to `apps/web` over HTTP.

### Auth (ported from `apps/mobile/src/auth/AuthContext.tsx`, magic-code path only)
Copy the proven pattern; keep only what magic-code needs:
- `sendCode(email)` → `POST {apiBaseUrl}/api/mobile/auth/send-code`.
- `verifyCode(email, code)` → `POST .../verify`; on success persist `{accessToken, refreshToken, expiresAt}` to `expo-secure-store`, then `hydrate()`.
- `authedFetch(path, init)` → attaches bearer, refreshes once on 401, signs out if refresh fails.
- `hydrate()` → resolves the user from stored tokens via `/api/mobile/me`, distinguishing a rejected token (sign out) from a network failure (keep cached session). Proactively refreshes a near-expiry access token.
- `signOut()` → clears secure-store tokens.
- Token refresh via `AuthSession.refreshAsync` against the WorkOS token endpoint (shared `workosClientId`).

**Dropped from the mobile version:** browser PKCE (`AuthRequest`/`promptAsync`/`exchangeCodeAsync`), the single-use PKCE verifier claim, the `mcloud://auth` deep-link handling, and the `app/auth.tsx` redirect route. None apply to magic-code.

### Config: `apps/nuru/src/lib/config.ts`
Reads `Constants.expoConfig.extra`:
- `apiBaseUrl` (default `http://localhost:3000` = local `apps/web`; hosts `/api/mobile/*`).
- `workosClientId`, `workosDomain` (shared with mcloud; used by `refreshAsync`).

### Screens & flow
- **Login (magic-code):** Nuru's dark auth screen, two steps — email → "Send code" (`send-code`), then 6-digit code → "Verify" (`verify`). Fraunces wordmark, sunburst, amber accent. Inline error surface reused.
- **Guard:** root layout wraps `AuthProvider`; `useAuth()` replaces the scaffold's mock `useSession()`. No user → login; user → `(tabs)` drawer. Sign-out → login.
- **Chat / Notes / Profile:** UI unchanged; their mock `services/*` remain mocked THIS slice (only auth becomes real). This keeps the slice to "prove login," not "wire data."

### Error handling
- `verify` typed errors surface inline: invalid/expired code → message; 429 → "Too many attempts, wait a few minutes."
- `hydrate` network failure keeps the cached session (never bounces to login on a flaky launch); only a truly rejected+unrefreshable token signs out.

## Components / Units

| Unit | Responsibility | Depends on |
|---|---|---|
| `apps/nuru` (workspace) | The Nuru Expo app | monorepo workspaces, `/api/mobile/*` over HTTP |
| `src/auth/AuthContext.tsx` | Magic-code auth: sendCode/verifyCode, authedFetch, hydrate, signOut, token refresh | `expo-secure-store`, `expo-auth-session` (refresh only), `config` |
| `src/lib/config.ts` | Runtime config from `app.json` extra | `expo-constants` |
| Login screen | Two-step email → code UI, calls sendCode/verifyCode | `AuthContext`, theme |
| Root layout guard | Gate on `useAuth()` | `AuthContext` |

## Verification

- **Static:** `tsc --noEmit` green across `apps/nuru`.
- **Runtime (headless-driven):** run local `apps/web` (:3000) + `apps/nuru` on web (:8081). Drive the login screen: assert `send-code` returns 200 and the code-entry step + error states render. For the full token round-trip, the user relays the emailed 6-digit code; then confirm `verify` returns tokens, `hydrate` resolves `/me`, the session is set, and the app lands on the drawer. Confirm sign-out returns to login.
- No automated test suite is added this slice (consistent with the scaffold's "mocked behavior, tsc + manual click-through" approach). Tests arrive with real data endpoints.

## Out of scope (later slices)

- Notes/chat backend endpoints (`/api/mobile/notes/*`, `/api/mobile/chat/*`) and the `notes`/`messages` tables.
- Wiring Nuru's `services/*` to real endpoints (they stay mocked here).
- Real AI chat (LLM over notes).
- Separate WorkOS client / dedicated user pool.
- EAS build/deploy config for `apps/nuru` (dev-web only this slice).
- Push notifications, IAP, and other `apps/mobile` features not needed for auth.
