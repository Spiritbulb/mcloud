# @mcloud/mobile

Lightweight Expo (React Native) merchant app for Menengai Cloud. **Thin by design:**
simple CRUD is native; anything complex deep-links to the web app (the same pattern as
auto-payments). Shares identity (WorkOS) and types (`@mcloud/db/types`) with the web app.

> **Toolchain:** Expo **SDK 56** (RN 0.85, React 19.2 — same React as the web app),
> runs on **Node 24**. This app is a **standalone** package with its own
> `package-lock.json` / `node_modules` and is intentionally **excluded from the npm
> workspaces** (root `package.json`). That isolation avoids Expo's native deps
> (react-native, react-native-screens, babel-preset-expo) being hoisted to the repo
> root, which breaks Metro. Install/run from inside `apps/mobile`, not the repo root.
> The only cross-package link is the **type-only** path alias `@mcloud/db/types` in
> `tsconfig.json` (compiles away; Metro never resolves it at runtime).

## Architecture

- **Data layer:** the app never touches Supabase directly. It calls `/api/mobile/*`
  routes in `apps/web` over HTTP, bearing a WorkOS access token. Those routes reuse the
  existing service-role db client + authorization logic (`apps/web/lib/merchant/*`).
- **Auth:** WorkOS AuthKit via OAuth2 + PKCE (`expo-auth-session`), tokens in
  `expo-secure-store`. The access token is the same WorkOS JWT that the API verifies
  via JWKS (`packages/auth` `getSessionFromToken`).
- **Native screens:** stores · products · orders · manual M-Pesa · account + danger
  zones · basic branding · a little analytics.
- **Deep-link to web:** auto-payments · domains · members · design editor · trading
  (via the `<ManageOnWeb>` component).

## Configure before running

`app.json` → `expo.extra` (already set for local dev):

- `apiBaseUrl` / `webBaseUrl` — `http://192.168.1.68:3000` (this machine's LAN IP, so a
  physical phone can reach the dev server; `localhost` would mean the phone itself).
  Update if your LAN IP changes.
- `workosClientId` — `client_01KR36PSYHBHBMG4ED4GSDM6DQ` (public AuthKit client id).

In the **WorkOS dashboard** → Redirects, register the native redirect URI:
`mcloud://auth` (alongside the web `http://localhost:3000/callback`). Native apps use
PKCE (no client secret), which WorkOS allows by default for the authorization-code grant.

## Run (dev client — required; Expo Go can't do the `mcloud://` deep-link login)

```bash
# One-time: build + install the dev client APK on your phone
npx eas-cli build --profile development --platform android   # let it auto-generate a DEV keystore

# Each session:
# Terminal 1 — the web app (hosts /api/mobile/*)
cd apps/web && npm run dev          # must be reachable at the LAN IP above

# Terminal 2 — Metro for the dev client
cd apps/mobile && npx expo start --dev-client
# scan the QR with the phone camera (opens in the dev client, not Expo Go)
```

## Release to the existing Play listing (critical)

The Play listing is `cloud.menengai.twa` (currently a PWABuilder TWA). To ship this
native app as an **update** to that same listing:

1. `android.package` **must** stay `cloud.menengai.twa` (set in `app.json`).
2. The AAB must be signed with the **same upload key** Google Play expects — the
   PWABuilder `signing.keystore`. Provide it to EAS:
   ```bash
   eas credentials   # Android → upload keystore → supply signing.keystore + alias/passwords
   ```
3. `versionCode` must increment (production profile uses `autoIncrement`).
4. Upload to the **internal testing** track first and confirm Play accepts it as an
   update (not a new app) before promoting.

```bash
eas-cli build -p android --profile preview      # APK smoke test
eas-cli build -p android --profile production    # AAB for Play
```
