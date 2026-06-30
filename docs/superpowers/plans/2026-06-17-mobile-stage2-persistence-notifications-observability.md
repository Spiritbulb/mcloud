# Mobile Stage 2 — Persistence, Notification Rails, Observability & Auth Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land everything that requires a native rebuild in one pass: persist the react-query cache to AsyncStorage (offline-after-restart), capture Expo push tokens (device rails, no sender yet), add NetInfo + Haptics + Sentry, and fix the OAuth backgrounding by flipping the browser presentation flag.

**Architecture:** Builds on Stage 1 (react-query is already wired; QueryProvider is in-memory). This stage swaps the provider to a persisted one, adds device-side notification registration + a web endpoint/table, installs three native utility deps with concrete uses, and changes one auth flag. Everything here is **only verifiable on a physical device build** — there is no test harness in `apps/mobile`; verification is `npx tsc --noEmit` + explicit manual on-device checks after the rebuild.

**Tech Stack:** Expo SDK 56, `@tanstack/react-query` (already installed), `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, `@react-native-async-storage/async-storage`, `expo-notifications`, `expo-device`, `@react-native-community/netinfo`, `expo-haptics`, `@sentry/react-native`, Next.js (web API), Supabase (via MCP for the migration).

**Global constraints (these govern reviews):**
- NO automated test harness in `apps/mobile`. Verification = `npx tsc --noEmit` + manual on-device steps. Do NOT flag "missing tests" as a defect.
- This stage's native pieces CANNOT be runtime-verified until a new dev/prod build. tsc-clean + correct wiring is the gate at implement time; manual on-device verification is noted per task for AFTER the rebuild.
- Branch off the Stage 1 branch (or main after Stage 1 merges). Do NOT modify unrelated files (`packages/db/src/database.types.ts`, `apps/web/supabase/`).
- Supabase migration applied via the Supabase MCP (`apply_migration`), not hand-run SQL.

---

## File Structure

- Modify `apps/mobile/src/data/QueryProvider.tsx` — swap to PersistQueryClientProvider (AsyncStorage).
- Modify `apps/mobile/src/auth/AuthContext.tsx` — `showInRecents: false`.
- Modify `apps/mobile/app.json` — add `expo-notifications` plugin; (if needed) Android task config.
- Create `apps/mobile/src/notifications/registerPush.ts` — permission + token + POST.
- Create `apps/mobile/src/notifications/useNotificationRegistration.ts` — run after sign-in.
- Modify `apps/mobile/app/(app)/_layout.tsx` — call the registration hook.
- Modify `apps/mobile/src/lib/api.ts` — `registerPushToken` method.
- Create `apps/web/app/api/mobile/push-token/route.ts` — POST endpoint.
- Migration (Supabase MCP) — `device_push_tokens` table.
- Modify `apps/mobile/app/(app)/account.tsx` — notifications toggle row.
- Create `apps/mobile/src/lib/net.ts` — NetInfo hook (`useIsOnline`).
- Create `apps/mobile/src/lib/haptics.ts` — thin haptics helper.
- Modify `apps/mobile/src/data/queryClient.ts` — gate retry on connectivity is OUT of scope; NetInfo is wired for UI only this stage (see Task 8).
- Modify `apps/mobile/app/_layout.tsx` — Sentry init wrap.

---

## Task 1: Flip auth browser presentation flag

**Files:**
- Modify: `apps/mobile/src/auth/AuthContext.tsx`

- [ ] **Step 1: Set showInRecents to false**

In `apps/mobile/src/auth/AuthContext.tsx`, find the `promptAsync` call (~line 290):
```tsx
    const result = await request.promptAsync(discovery, { showInRecents: true })
```
Replace with:
```tsx
    // showInRecents:false keeps the auth Custom Tab bound to THIS app's task, so the
    // OS is far less likely to reclaim the backgrounded app and cold-relaunch it via
    // the mcloud://auth deep link. The inline promptAsync result is the primary path;
    // the deep-link landing (app/auth.tsx) remains a fallback.
    const result = await request.promptAsync(discovery, { showInRecents: false })
```
Update the now-stale comment two lines above (the one starting `// showInRecents helps the system browser…`) to match — delete it or replace with a one-liner noting the inline-result path is primary.

- [ ] **Step 2: Typecheck**

Run (in `apps/mobile`): `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/auth/AuthContext.tsx
git commit -m "fix(mobile): bind auth session to app task (showInRecents:false) to stop cold-relaunch"
```

**Manual verification (AFTER rebuild only):** sign out, sign in on a physical device → the auth tab opens in-app, completing returns to the SAME app instance (no flash of the app closing/relaunching), and `promptAsync` resolves with the code inline (the `result.type === 'success'` branch runs; the deep-link path does not). If the app STILL cold-relaunches, the documented next lever is Android `launchMode="singleTask"` + an `mcloud` intent filter in `app.json` — do NOT add that preemptively; only if the flag flip proves insufficient on-device.

---

## Task 2: Persist react-query cache to AsyncStorage

**Files:**
- Modify: `apps/mobile/src/data/QueryProvider.tsx`
- Modify: `apps/mobile/package.json` (via install)

- [ ] **Step 1: Install persister + AsyncStorage**

Run (in `apps/mobile`):
```bash
npm install @tanstack/react-query-persist-client @tanstack/query-async-storage-persister @react-native-async-storage/async-storage
```
`@react-native-async-storage/async-storage` is NATIVE — only works after a rebuild.

- [ ] **Step 2: Swap provider to PersistQueryClientProvider**

Replace the entire contents of `apps/mobile/src/data/QueryProvider.tsx`:
```tsx
// Persisted cache: survives restarts so launches (incl. offline) render data
// immediately. Writes the query cache to AsyncStorage (native — needs a rebuild).
// `buster` bumps to drop incompatible cached shapes across app versions.
import * as React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { makeQueryClient } from './queryClient'

const persister = createAsyncStoragePersister({ storage: AsyncStorage })

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(makeQueryClient)
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: 'v1' }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json apps/mobile/src/data/QueryProvider.tsx
git commit -m "feat(mobile): persist react-query cache to AsyncStorage (offline launch)"
```

**Manual verification (AFTER rebuild):** open Products, force-quit, relaunch in airplane mode → Products renders from the persisted cache.

---

## Task 3: device_push_tokens table (Supabase MCP)

**Files:**
- Migration via Supabase MCP `apply_migration`.

- [ ] **Step 1: Inspect existing tables first**

Use the Supabase MCP `list_tables` to confirm `device_push_tokens` does not already exist and to confirm the `users.id` column type (mobile auth uses a text id like `auth0|...` or `user_...`).

- [ ] **Step 2: Apply the migration**

Use Supabase MCP `apply_migration` with name `create_device_push_tokens` and this SQL:
```sql
create table if not exists public.device_push_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  expo_push_token text not null,
  platform        text,
  updated_at      timestamptz not null default now()
);
create unique index if not exists device_push_tokens_token_key
  on public.device_push_tokens (expo_push_token);
alter table public.device_push_tokens enable row level security;
```
(`user_id` is text to match `AuthUser.id`. RLS on, no public policies — service-role only.)

- [ ] **Step 3: Verify**

Use Supabase MCP `list_tables` (or `execute_sql` with `select` on an empty table) to confirm the table + unique index exist and RLS is enabled.

- [ ] **Step 4: (no code commit)** — schema-only task. Note completion in the progress ledger.

---

## Task 4: /api/mobile/push-token endpoint

**Files:**
- Create: `apps/web/app/api/mobile/push-token/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `apps/web/app/api/mobile/push-token/route.ts`:
```ts
// POST /api/mobile/push-token — store the caller's Expo push token. Idempotent:
// upsert on the token so a device re-registering refreshes its row + owner.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { fail, requireMobileUser } from '../_lib'

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const body = (await req.json().catch(() => null)) as
        | { token?: string; platform?: string }
        | null
    const token = body?.token?.trim()
    if (!token) return fail(400, 'Missing token')

    const supabase = await createClient()
    // device_push_tokens isn't in generated types yet — cast (regenerate types later).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from('device_push_tokens')
        .upsert(
            { user_id: auth.user.id, expo_push_token: token, platform: body?.platform ?? null, updated_at: new Date().toISOString() },
            { onConflict: 'expo_push_token' },
        )
    if (error) return fail(500, error.message)
    return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Typecheck web**

Run (in `apps/web`): `npx tsc --noEmit`
Expected: no errors in the new route (ignore any pre-existing unrelated `.next/types` stale-artifact error).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/mobile/push-token/route.ts
git commit -m "feat(web): /api/mobile/push-token endpoint (stores Expo push token)"
```

---

## Task 5: api.ts client method for push-token

**Files:**
- Modify: `apps/mobile/src/lib/api.ts`

- [ ] **Step 1: Add registerPushToken**

In `apps/mobile/src/lib/api.ts`, inside the object returned by `api(authedFetch)`, add (near the other methods):
```ts
    async registerPushToken(token: string, platform: string): Promise<void> {
      const res = await authedFetch('/api/mobile/push-token', {
        method: 'POST',
        body: JSON.stringify({ token, platform }),
      })
      await json(res)
    },
```
(`json` is the existing response helper in this file.)

- [ ] **Step 2: Typecheck**

Run (in `apps/mobile`): `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/api.ts
git commit -m "feat(mobile): api.registerPushToken"
```

---

## Task 6: expo-notifications config + device registration

**Files:**
- Modify: `apps/mobile/app.json`
- Create: `apps/mobile/src/notifications/registerPush.ts`
- Create: `apps/mobile/src/notifications/useNotificationRegistration.ts`
- Modify: `apps/mobile/app/(app)/_layout.tsx`

- [ ] **Step 1: Install native deps**

Run (in `apps/mobile`):
```bash
npx expo install expo-notifications expo-device
```

- [ ] **Step 2: Add the plugin to app.json**

In `apps/mobile/app.json`, the `plugins` array currently ends with `"./plugins/withReleaseSigning"`. Add `expo-notifications` after it:
```json
      "./plugins/withReleaseSigning",
      "expo-notifications"
```

- [ ] **Step 3: Create registerPush helper**

Create `apps/mobile/src/notifications/registerPush.ts`:
```ts
// Request notification permission, get the Expo push token, and POST it to the
// backend. Returns a status so callers (after-sign-in hook, settings toggle) react.
// Safe to call repeatedly — Expo returns the same token for a device.
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

type Fetch = (path: string, init?: RequestInit) => Promise<Response>
export type PushRegisterResult = 'registered' | 'denied' | 'unsupported' | 'error'

export async function registerPush(authedFetch: Fetch): Promise<PushRegisterResult> {
  if (!Device.isDevice) return 'unsupported' // simulators can't get a token

  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status
  }
  if (status !== 'granted') return 'denied'

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    const res = await authedFetch('/api/mobile/push-token', {
      method: 'POST',
      body: JSON.stringify({ token: tokenResp.data, platform: Platform.OS }),
    })
    if (!res.ok) return 'error'
    return 'registered'
  } catch {
    return 'error'
  }
}
```

- [ ] **Step 4: Create the after-sign-in hook**

Create `apps/mobile/src/notifications/useNotificationRegistration.ts`:
```ts
// Registers for push once per session after the user is authenticated. The first
// permission prompt fires inside the app (after sign-in), not on cold launch.
import * as React from 'react'
import { useAuth } from '@/auth/AuthContext'
import { registerPush } from './registerPush'

export function useNotificationRegistration() {
  const { user, authedFetch } = useAuth()
  const ran = React.useRef(false)
  React.useEffect(() => {
    if (!user || ran.current) return
    ran.current = true
    registerPush(authedFetch).catch(() => {}) // fire-and-forget; never block UI
  }, [user, authedFetch])
}
```

- [ ] **Step 5: Call the hook in the authed layout**

In `apps/mobile/app/(app)/_layout.tsx`, add the import and call the hook inside `AppLayout()` BEFORE the `if (loading)` / `if (!user)` early returns:
```tsx
import { useNotificationRegistration } from '@/notifications/useNotificationRegistration'
// inside AppLayout(), first line of the body:
useNotificationRegistration()
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app.json apps/mobile/src/notifications/registerPush.ts apps/mobile/src/notifications/useNotificationRegistration.ts apps/mobile/app/\(app\)/_layout.tsx
git commit -m "feat(mobile): notification rails — request permission + register Expo push token after sign-in"
```

**Manual verification (AFTER rebuild, physical device):** sign in → permission prompt → grant → a row appears in `device_push_tokens` with your `user_id` + `platform`.

---

## Task 7: Notifications toggle in Account

**Files:**
- Modify: `apps/mobile/app/(app)/account.tsx`

The account screen renders settings as `<Card style={s.group}>` wrapping a `<Pressable style={s.row}>` with an `s.iconBox` + `Ionicons` + text. Match that exactly.

- [ ] **Step 1: Add imports + handler**

In `apps/mobile/app/(app)/account.tsx`, add:
```tsx
import { registerPush } from '@/notifications/registerPush'
```
The component currently destructures `const { user, signOut } = useAuth()`. Add `authedFetch` to it:
```tsx
  const { user, signOut, authedFetch } = useAuth()
```
(`Alert` is already imported in this file.) Add the handler:
```tsx
  const onEnableNotifications = async () => {
    const r = await registerPush(authedFetch)
    if (r === 'registered') Alert.alert('Notifications on', 'You’ll get alerts on this device.')
    else if (r === 'denied') Alert.alert('Notifications blocked', 'Enable them in your device Settings to get alerts.')
    else if (r === 'unsupported') Alert.alert('Not supported', 'Push notifications need a physical device.')
    else Alert.alert('Something went wrong', 'Could not enable notifications. Try again.')
  }
```

- [ ] **Step 2: Add the row (match existing pattern)**

In the "Preferences" `Card` (the one containing the Appearance row), add a second `Pressable` row after Appearance:
```tsx
          <Pressable onPress={onEnableNotifications} style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}>
            <View style={[s.iconBox, { backgroundColor: t.colors.surfaceContainerHigh }]}>
              <Ionicons name="notifications-outline" size={20} color={t.colors.onSurfaceVariant} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>Notifications</Text>
              <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>Enable alerts on this device</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.colors.onSurfaceVariant} />
          </Pressable>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(app\)/account.tsx
git commit -m "feat(mobile): Account — enable-notifications toggle (re-request + register)"
```

**Manual verification (AFTER rebuild):** Account → Notifications row → grant/blocked paths behave; on grant a token row appears/updates.

---

## Task 8: NetInfo connectivity hook (+ offline UI signal on Products)

**Files:**
- Create: `apps/mobile/src/lib/net.ts`
- Modify: `apps/mobile/app/(app)/store/[storeSlug]/products.tsx`

- [ ] **Step 1: Install NetInfo**

Run (in `apps/mobile`):
```bash
npx expo install @react-native-community/netinfo
```

- [ ] **Step 2: Create the hook**

Create `apps/mobile/src/lib/net.ts`:
```ts
// Connectivity hook. Used for UI signals (offline pill) and, later, to gate
// doomed refetches. Defaults to online so the app never falsely shows "offline".
import * as React from 'react'
import NetInfo from '@react-native-community/netinfo'

export function useIsOnline(): boolean {
  const [online, setOnline] = React.useState(true)
  React.useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false)
    })
    return () => unsub()
  }, [])
  return online
}
```

- [ ] **Step 3: Show an offline pill on the products list**

In `apps/mobile/app/(app)/store/[storeSlug]/products.tsx`, add:
```tsx
import { useIsOnline } from '@/lib/net'
```
In the component: `const online = useIsOnline()`. In the `ListHeaderComponent`, below the title/"Updating…" block, add:
```tsx
{!online && (
  <Text style={[t.type.labelSmall, { color: t.colors.onSurfaceVariant, marginTop: 2 }]}>Offline — showing saved data</Text>
)}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/net.ts apps/mobile/app/\(app\)/store/\[storeSlug\]/products.tsx
git commit -m "feat(mobile): NetInfo connectivity hook + offline pill on products"
```

**Manual verification (AFTER rebuild):** airplane mode on the Products screen → "Offline — showing saved data" appears; back online → it disappears.

---

## Task 9: Haptics helper (+ one wired call)

**Files:**
- Create: `apps/mobile/src/lib/haptics.ts`
- Modify: `apps/mobile/app/(app)/store/[storeSlug]/product-form.tsx`

- [ ] **Step 1: Install haptics**

Run (in `apps/mobile`):
```bash
npx expo install expo-haptics
```

- [ ] **Step 2: Create the helper**

Create `apps/mobile/src/lib/haptics.ts`:
```ts
// Thin wrapper so call sites don't import expo-haptics directly and failures are
// swallowed (haptics are best-effort polish, never a hard dependency).
import * as Haptics from 'expo-haptics'

export const haptic = {
  success: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) },
  light: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) },
}
```

- [ ] **Step 3: Wire one call (product saved)**

In `apps/mobile/app/(app)/store/[storeSlug]/product-form.tsx`, add `import { haptic } from '@/lib/haptics'`. In `onSave`, in BOTH success branches (edit and create) immediately before `router.back()`, add `haptic.success()`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/haptics.ts apps/mobile/app/\(app\)/store/\[storeSlug\]/product-form.tsx
git commit -m "feat(mobile): haptics helper + success haptic on product save"
```

**Manual verification (AFTER rebuild):** save a product on a physical device → a success haptic fires.

---

## Task 10: Sentry error reporting

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app.json` (Sentry plugin)
- Reference: Sentry DSN comes from `app.json` `extra` (user supplies it; placeholder read until then).

> **Implementer note:** Sentry's Expo integration API (config-plugin path, `init` options, and the `wrap` helper) can vary by version. After installing, VERIFY the exact plugin string and init/wrap API against the INSTALLED package — check `node_modules/@sentry/react-native/package.json` version and its README / the `sentry-expo` vs `@sentry/react-native` Expo docs for that version. The code below is the expected SDK-56-era shape; if the installed version differs, follow the installed package's documented API instead of this snippet verbatim. Do not invent APIs.

- [ ] **Step 1: Install Sentry**

Run (in `apps/mobile`):
```bash
npx expo install @sentry/react-native
```
Then confirm the installed version: `node -e "console.log(require('./node_modules/@sentry/react-native/package.json').version)"` and check its README for the Expo config-plugin path + `init`/`wrap` usage before doing Steps 2–3.

- [ ] **Step 2: Add the Sentry Expo plugin to app.json**

In `apps/mobile/app.json` `plugins`, after `"expo-notifications"`, add:
```json
      "expo-notifications",
      "@sentry/react-native/expo"
```
Add a DSN under `extra` (user will replace the placeholder with the real DSN from their Sentry project):
```json
    "extra": {
      "sentryDsn": ""
    }
```
(Merge into the existing `extra` object — do NOT overwrite existing keys like `eas`, `apiBaseUrl`, etc.)

- [ ] **Step 3: Initialize + wrap the root**

In `apps/mobile/app/_layout.tsx`, add at the top (after imports):
```tsx
import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'

const sentryDsn = Constants.expoConfig?.extra?.sentryDsn as string | undefined
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn, enableNative: true })
}
```
Wrap the default export so Sentry captures render errors. Change:
```tsx
export default function RootLayout() { /* ... */ }
```
to keep the function but export it wrapped:
```tsx
function RootLayout() { /* ...existing body unchanged... */ }
export default Sentry.wrap(RootLayout)
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. If `Sentry.wrap` typing complains, wrap as `export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout` (still type-correct; Sentry.wrap returns a component).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/_layout.tsx apps/mobile/app.json apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "feat(mobile): Sentry error reporting (gated on DSN in extra)"
```

**Manual verification (AFTER rebuild + real DSN):** trigger a thrown error in a screen → it appears in the Sentry dashboard. Until a DSN is set, Sentry is inert (no-op), which is intentional.

---

## Verification Summary (ALL after a new build)

- **Auth:** sign-in completes in-app without the app closing/relaunching; `promptAsync` resolves inline.
- **Persistence:** force-quit + relaunch offline → Products renders from cache.
- **Notifications:** sign in on device → permission prompt → `device_push_tokens` row; Account toggle re-requests.
- **NetInfo:** airplane mode → offline pill on Products.
- **Haptics:** save product → success haptic.
- **Sentry:** with a DSN set, thrown errors appear in the dashboard.

## Deferred (explicitly out of scope)
- Push **sender** / triggers / foreground+tap handling / deep-link routing from a notification.
- Gating react-query retries on NetInfo (UI signal only this stage).
- Android `launchMode`/intent-filter task config (only if the showInRecents flip proves insufficient on-device — decide after testing).
- Regenerating Supabase types to drop `as any` casts (`beta_signups`, `device_push_tokens`).
- Migrating other screens (orders/today/branding/etc.) to react-query.
- Offline **write** queue.
