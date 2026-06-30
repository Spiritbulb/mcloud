# Mobile Data Layer (Products pilot) + Notification Rails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce TanStack Query as the mobile app's data layer, prove it on the Products flow (instant cached load, background refresh with a subtle signal, optimistic create/edit/delete/toggle), and lay device-side rails to capture Expo push tokens.

**Architecture:** A `QueryClient` (with an AsyncStorage persister) wraps the app inside `AuthProvider`. Products screens move from `useState/useEffect/fetch` to query/mutation hooks in `src/data/` that wrap the existing `api.ts` transport. Notification rails register an Expo push token after sign-in and POST it to a new `/api/mobile/push-token` endpoint backed by a `device_push_tokens` table. A settings toggle re-requests permission.

**Tech Stack:** Expo SDK 56, React Native, `@tanstack/react-query`, `@tanstack/react-query-persist-client`, `@react-native-async-storage/async-storage`, `expo-notifications`, `expo-device`, Next.js (web API), Supabase.

**Build stages:**
- **Stage 1 (OTA-shippable, pure JS):** Tasks 1–5 — react-query foundation (in-memory), Products hooks, screen migration, optimistic writes, subtle indicator. Testable over OTA before any rebuild.
- **Stage 2 (requires rebuild):** Tasks 6–10 — AsyncStorage persister (offline-after-restart), `expo-notifications` config + registration, push-token endpoint + table, settings toggle.

**No automated test harness exists in `apps/mobile`.** "Tests" in this plan are typecheck (`npx tsc --noEmit`) + explicit manual verification steps on the dev client. Each task ends with a commit.

---

## File Structure

**Stage 1 (OTA):**
- Create `apps/mobile/src/data/queryClient.ts` — QueryClient factory + `queryKeys`.
- Create `apps/mobile/src/data/QueryProvider.tsx` — provider component (in-memory in Stage 1; persister added in Stage 2).
- Create `apps/mobile/src/data/products.ts` — `useProducts` + mutation hooks (optimistic).
- Modify `apps/mobile/app/_layout.tsx` — mount QueryProvider inside AuthProvider.
- Modify `apps/mobile/app/(app)/store/[storeSlug]/products.tsx` — use hooks + subtle indicator.
- Modify `apps/mobile/app/(app)/store/[storeSlug]/product-form.tsx` — mutations via hooks.

**Stage 2 (rebuild):**
- Modify `apps/mobile/src/data/QueryProvider.tsx` — add AsyncStorage persister.
- Create `apps/mobile/src/notifications/registerPush.ts` — permission + token + POST.
- Create `apps/mobile/src/notifications/useNotificationRegistration.ts` — run after sign-in.
- Modify `apps/mobile/app/(app)/_layout.tsx` — call the registration hook.
- Modify `apps/mobile/app.json` — add `expo-notifications` plugin + Android config.
- Modify `apps/mobile/src/lib/api.ts` — add `registerPushToken` method.
- Create `apps/web/app/api/mobile/push-token/route.ts` — POST endpoint.
- Modify `apps/mobile/app/(app)/account.tsx` — notifications toggle (re-request).
- SQL (run in Supabase dashboard) — `device_push_tokens` table.

---

## Task 1: Install deps + QueryClient foundation (in-memory)

**Files:**
- Modify: `apps/mobile/package.json` (via install)
- Create: `apps/mobile/src/data/queryClient.ts`
- Create: `apps/mobile/src/data/QueryProvider.tsx`

- [ ] **Step 1: Install react-query (pure JS, no rebuild)**

Run (in `apps/mobile`):
```bash
npm install @tanstack/react-query
```
Expected: added to dependencies, no native linking required.

- [ ] **Step 2: Create the QueryClient factory + query keys**

Create `apps/mobile/src/data/queryClient.ts`:
```ts
// Central QueryClient + typed query-key factory. staleTime keeps cached data
// "fresh enough" to render instantly on revisit; a background refetch updates it.
import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // 30s: render cache instantly, refetch in background
        gcTime: 24 * 60 * 60 * 1000, // keep cache 24h so offline launches have data
        retry: 1, // mobile networks flap; one retry, then surface/keep cache
        refetchOnReconnect: true,
        refetchOnWindowFocus: false, // RN has no window focus; we refetch on mount
      },
      mutations: { retry: 0 },
    },
  })
}

export const queryKeys = {
  products: (storeSlug: string) => ['products', storeSlug] as const,
}
```

- [ ] **Step 3: Create the provider (in-memory for Stage 1)**

Create `apps/mobile/src/data/QueryProvider.tsx`:
```tsx
// Wraps the app in a QueryClientProvider. Stage 1: in-memory cache only.
// Stage 2 swaps this for PersistQueryClientProvider (AsyncStorage) — see Task 6.
import * as React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeQueryClient } from './queryClient'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One client for the app's lifetime.
  const [client] = React.useState(makeQueryClient)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

- [ ] **Step 4: Typecheck**

Run (in `apps/mobile`): `npx tsc --noEmit`
Expected: no errors in `src/data/*`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json apps/mobile/src/data/queryClient.ts apps/mobile/src/data/QueryProvider.tsx
git commit -m "feat(mobile): add react-query QueryClient foundation (in-memory)"
```

---

## Task 2: Mount QueryProvider in the root layout

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Wrap AppShell with QueryProvider, inside AuthProvider**

In `apps/mobile/app/_layout.tsx`, add the import:
```tsx
import { QueryProvider } from '@/data/QueryProvider'
```
Change the `RootLayout` return so QueryProvider sits INSIDE AuthProvider (queries use the authed client) and wraps AppShell:
```tsx
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <QueryProvider>
            <AppShell />
          </QueryProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Manual smoke (dev client / OTA)**

Launch the app; confirm it still boots and navigates normally (provider mount is inert until hooks are used).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): mount QueryProvider inside AuthProvider"
```

---

## Task 3: Products query + mutation hooks (optimistic)

**Files:**
- Create: `apps/mobile/src/data/products.ts`

Reference the existing transport in `apps/mobile/src/lib/api.ts`:
`listProducts(slug) → { products: Product[]; role: string }`,
`createProduct(slug, input) → Product`,
`updateProduct(slug, id, patch) → Product`,
`deleteProduct(slug, id) → void`.

- [ ] **Step 1: Create the hooks file**

Create `apps/mobile/src/data/products.ts`:
```ts
// React-query hooks for Products. Wrap the existing api.ts transport; add caching
// + optimistic writes. The cached shape mirrors listProducts' response so the
// list screen reads { products, role } straight from the cache.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Product } from '@/lib/api'
import { useAuth } from '@/auth/AuthContext'
import * as React from 'react'
import { queryKeys } from './queryClient'

type ProductsData = { products: Product[]; role: string }

function useClient() {
  const { authedFetch } = useAuth()
  return React.useMemo(() => api(authedFetch), [authedFetch])
}

export function useProducts(storeSlug: string) {
  const client = useClient()
  return useQuery({
    queryKey: queryKeys.products(storeSlug),
    queryFn: () => client.listProducts(storeSlug),
  })
}

export function useCreateProduct(storeSlug: string) {
  const client = useClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<ReturnType<typeof api>['createProduct']>[1]) =>
      client.createProduct(storeSlug, input),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.products(storeSlug) }),
  })
}

export function useUpdateProduct(storeSlug: string) {
  const client = useClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<ReturnType<typeof api>['updateProduct']>[2] }) =>
      client.updateProduct(storeSlug, id, patch),
    // Optimistic: apply the patch to the cached product immediately.
    onMutate: async ({ id, patch }) => {
      const key = queryKeys.products(storeSlug)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<ProductsData>(key)
      if (prev) {
        qc.setQueryData<ProductsData>(key, {
          ...prev,
          products: prev.products.map((p) => (p.id === id ? { ...p, ...patch } as Product : p)),
        })
      }
      return { prev }
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.products(storeSlug), ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.products(storeSlug) }),
  })
}

export function useDeleteProduct(storeSlug: string) {
  const client = useClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.deleteProduct(storeSlug, id),
    // Optimistic: remove the row immediately.
    onMutate: async (id) => {
      const key = queryKeys.products(storeSlug)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<ProductsData>(key)
      if (prev) {
        qc.setQueryData<ProductsData>(key, {
          ...prev,
          products: prev.products.filter((p) => p.id !== id),
        })
      }
      return { prev }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.products(storeSlug), ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.products(storeSlug) }),
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. If `Parameters<...>` inference is awkward, replace with the explicit inline input types already used in `api.ts` (`{ name: string; price: number; ... }` for create; `Partial<{ ... }>` for update).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/data/products.ts
git commit -m "feat(mobile): products query + optimistic mutation hooks"
```

---

## Task 4: Migrate the products list screen to hooks + subtle refresh signal

**Files:**
- Modify: `apps/mobile/app/(app)/store/[storeSlug]/products.tsx`

- [ ] **Step 1: Replace state/fetch with `useProducts`**

In `products.tsx`, remove the imports of `api` and the local `products/role/loading/refreshing/error/load/onRefresh` state machine. Add:
```tsx
import { useProducts, useUpdateProduct, useDeleteProduct } from '@/data/products'
```
Replace the component's data wiring (the block from `const { authedFetch } = useAuth()` through `React.useEffect(() => { load() }, [load])`) with:
```tsx
  const { slug: storeSlug } = useStore()
  const { data, isLoading, isFetching, isError, error, refetch } = useProducts(storeSlug)
  const products = data?.products ?? []
  const role = data?.role ?? ''
  const canManage = role === 'owner' || role === 'admin'
  const updateMut = useUpdateProduct(storeSlug)
  const deleteMut = useDeleteProduct(storeSlug)

  // Pull-to-refresh: explicit user refresh. Distinguish from the quiet background
  // refetch so the subtle top indicator only shows for the latter.
  const [pulling, setPulling] = React.useState(false)
  const onRefresh = React.useCallback(async () => {
    setPulling(true)
    try { await refetch() } finally { setPulling(false) }
  }, [refetch])
  const backgroundRefreshing = isFetching && !pulling && !isLoading
```
(Keep `useAuth` import removed if no longer used; keep `useStore`.)

- [ ] **Step 2: Point mutations at the hooks**

Replace `onDelete` and `onToggleActive` bodies:
```tsx
  const onDelete = (prod: Product) => {
    Alert.alert('Delete product', `Remove "${prod.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => deleteMut.mutate(prod.id, {
          onError: (e) => Alert.alert('Could not delete', e instanceof Error ? e.message : 'Error'),
        }),
      },
    ])
  }

  const onToggleActive = (prod: Product) => {
    updateMut.mutate(
      { id: prod.id, patch: { is_active: !prod.is_active } },
      { onError: (e) => Alert.alert('Update failed', e instanceof Error ? e.message : 'Error') },
    )
  }
```

- [ ] **Step 3: Wire RefreshControl + subtle indicator + loading/empty**

Update the `RefreshControl` to use `pulling`:
```tsx
refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={t.colors.primary} />}
```
In the `ListHeaderComponent`, under the "Products" title row, add the subtle background-refresh signal:
```tsx
{backgroundRefreshing && (
  <Text style={[t.type.labelSmall, { color: t.colors.onSurfaceVariant, marginTop: 2 }]}>Updating…</Text>
)}
```
Update the empty/loading references: replace `!loading` with `!isLoading` and `error ??` with `(isError ? (error instanceof Error ? error.message : 'Failed to load') : null) ??`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (no leftover `loading`/`refreshing`/`load` references).

- [ ] **Step 5: Manual verification (OTA / dev client)**

1. Open Products → list loads.
2. Navigate away and back → list shows **instantly** from cache, "Updating…" flickers while it refetches.
3. Toggle a product active/inactive → row updates **immediately** (optimistic); no full reload.
4. Delete a product → row disappears **immediately**.
5. Kill network, navigate back to Products → cached list still shows (in-memory, same session).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/\(app\)/store/\[storeSlug\]/products.tsx
git commit -m "feat(mobile): products list via react-query with optimistic toggle/delete + refresh signal"
```

---

## Task 5: Route product-form create/edit through mutation hooks

**Files:**
- Modify: `apps/mobile/app/(app)/store/[storeSlug]/product-form.tsx`

- [ ] **Step 1: Use the mutation hooks for create/update**

In `product-form.tsx`, add:
```tsx
import { useCreateProduct, useUpdateProduct } from '@/data/products'
```
Inside the component:
```tsx
  const createMut = useCreateProduct(storeSlug)
  const updateMut = useUpdateProduct(storeSlug)
```
In `onSave`, replace `await client.updateProduct(storeSlug, productId, {...})` with
`await updateMut.mutateAsync({ id: productId, patch: {...} })` (same patch object), and replace
`const prod = await client.createProduct(storeSlug, {...})` with
`const prod = await createMut.mutateAsync({...})`.
Leave the image-upload calls (`client.uploadImage`, `client.updateProduct` for images) as-is for now — they still work; the trailing `updateMut`/invalidate will refresh the list. (Optional: route the post-create image PATCH through `updateMut.mutateAsync` too, but not required for the pilot.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Manual verification**

1. Create a product → on return to the list it appears (invalidation refetch).
2. Edit a product's name/price → list reflects it (optimistic on the field-level update path, reconciled on settle).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(app\)/store/\[storeSlug\]/product-form.tsx
git commit -m "feat(mobile): product-form create/edit via react-query mutations"
```

---

## Task 6: Add AsyncStorage persister (Stage 2 — requires rebuild)

**Files:**
- Modify: `apps/mobile/src/data/QueryProvider.tsx`
- Modify: `apps/mobile/package.json` (via install)

- [ ] **Step 1: Install persister + AsyncStorage**

Run (in `apps/mobile`):
```bash
npm install @tanstack/react-query-persist-client @tanstack/query-async-storage-persister @react-native-async-storage/async-storage
```
Note: `@react-native-async-storage/async-storage` is a NATIVE module — it only works after a new dev/prod build.

- [ ] **Step 2: Swap provider to PersistQueryClientProvider**

Replace `apps/mobile/src/data/QueryProvider.tsx` contents:
```tsx
// Persisted cache: survives app restarts so launches (incl. offline) show data
// immediately. The persister writes the query cache to AsyncStorage (native module
// — requires a rebuild). buster bumps to drop incompatible cached shapes.
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

- [ ] **Step 4: Commit (verify after rebuild)**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json apps/mobile/src/data/QueryProvider.tsx
git commit -m "feat(mobile): persist react-query cache to AsyncStorage (offline launch)"
```
Manual verification (AFTER a new build): open Products, force-quit the app, relaunch in airplane mode → Products list renders from the persisted cache.

---

## Task 7: device_push_tokens table + push-token API endpoint

**Files:**
- SQL: run in Supabase dashboard
- Create: `apps/web/app/api/mobile/push-token/route.ts`

- [ ] **Step 1: Create the table (Supabase SQL editor)**

Run this SQL (idempotent):
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
(`user_id` is text to match `AuthUser.id` / `users.id` used elsewhere in mobile auth. RLS on, service-role only.)

- [ ] **Step 2: Create the endpoint**

Create `apps/web/app/api/mobile/push-token/route.ts`:
```ts
// POST /api/mobile/push-token — store the caller's Expo push token. Idempotent:
// upsert on the token (a device re-registering refreshes its row + owner).
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

- [ ] **Step 3: Typecheck web**

Run (in `apps/web`): `npx tsc --noEmit`
Expected: no errors in `app/api/mobile/push-token/route.ts` (ignore any pre-existing unrelated `.next/types` stale-artifact error).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/mobile/push-token/route.ts
git commit -m "feat(web): /api/mobile/push-token endpoint (stores Expo push token)"
```

---

## Task 8: api.ts client method for push-token

**Files:**
- Modify: `apps/mobile/src/lib/api.ts`

- [ ] **Step 1: Add `registerPushToken` to the api client**

In `apps/mobile/src/lib/api.ts`, inside the object returned by `api(authedFetch)`, add:
```ts
    async registerPushToken(token: string, platform: string): Promise<void> {
      const res = await authedFetch('/api/mobile/push-token', {
        method: 'POST',
        body: JSON.stringify({ token, platform }),
      })
      await json(res)
    },
```

- [ ] **Step 2: Typecheck**

Run (in `apps/mobile`): `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/api.ts
git commit -m "feat(mobile): api.registerPushToken"
```

---

## Task 9: expo-notifications config + device registration (requires rebuild)

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
(Native modules — require a rebuild.)

- [ ] **Step 2: Add the plugin to app.json**

In `apps/mobile/app.json`, add `"expo-notifications"` to the `plugins` array (after the existing `"./plugins/withReleaseSigning"` entry):
```json
      "./plugins/withReleaseSigning",
      "expo-notifications"
```

- [ ] **Step 3: Create the registration helper**

Create `apps/mobile/src/notifications/registerPush.ts`:
```ts
// Request notification permission, get the Expo push token, and POST it to the
// backend. Returns the permission status so callers (e.g. a settings toggle) can
// react. Safe to call repeatedly — Expo returns the same token for a device.
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { config } from '../lib/config'

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
    const projectId = (config as { easProjectId?: string }).easProjectId
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    const token = tokenResp.data
    const res = await authedFetch('/api/mobile/push-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS }),
    })
    if (!res.ok) return 'error'
    return 'registered'
  } catch {
    return 'error'
  }
}
```
Note: add `easProjectId` to `src/lib/config.ts` `extra` reads if not present; the value is `app.json` → `extra.eas.projectId` (`7c75f6a5-...`). If config plumbing is non-trivial, pass `undefined` and rely on Expo's auto-detection in a managed build.

- [ ] **Step 4: Create the after-sign-in hook**

Create `apps/mobile/src/notifications/useNotificationRegistration.ts`:
```ts
// Registers for push once per session after the user is authenticated. Runs the
// first permission prompt at a sensible moment (inside the app, not cold launch).
import * as React from 'react'
import { useAuth } from '@/auth/AuthContext'
import { registerPush } from './registerPush'

export function useNotificationRegistration() {
  const { user, authedFetch } = useAuth()
  const ran = React.useRef(false)
  React.useEffect(() => {
    if (!user || ran.current) return
    ran.current = true
    // Fire and forget — never block the UI on registration.
    registerPush(authedFetch).catch(() => {})
  }, [user, authedFetch])
}
```

- [ ] **Step 5: Call the hook in the authed layout**

In `apps/mobile/app/(app)/_layout.tsx`, import and call the hook inside `AppLayout` (it already reads `useAuth`):
```tsx
import { useNotificationRegistration } from '@/notifications/useNotificationRegistration'
// inside AppLayout(), before the early returns:
useNotificationRegistration()
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit (verify after rebuild)**

```bash
git add apps/mobile/app.json apps/mobile/src/notifications/registerPush.ts apps/mobile/src/notifications/useNotificationRegistration.ts apps/mobile/app/\(app\)/_layout.tsx
git commit -m "feat(mobile): notification rails — request permission + register Expo push token after sign-in"
```
Manual verification (AFTER a new build): sign in on a physical device → permission prompt appears → grant → a row lands in `device_push_tokens` with your `user_id` and `platform`.

---

## Task 10: Notifications toggle in Account (re-request entry point)

**Files:**
- Modify: `apps/mobile/app/(app)/account.tsx`

- [ ] **Step 1: Add a notifications row that (re)registers**

In `account.tsx`, add a pressable settings row "Enable notifications" that calls `registerPush(authedFetch)` and surfaces the result:
```tsx
import { registerPush } from '@/notifications/registerPush'
// inside the component (has access to authedFetch via useAuth):
const onEnableNotifications = async () => {
  const r = await registerPush(authedFetch)
  if (r === 'registered') Alert.alert('Notifications on', 'You’ll get alerts on this device.')
  else if (r === 'denied') Alert.alert('Notifications blocked', 'Enable them in your device Settings to get alerts.')
  else if (r === 'unsupported') Alert.alert('Not supported', 'Push notifications need a physical device.')
  else Alert.alert('Something went wrong', 'Could not enable notifications. Try again.')
}
```
Render a row (match the existing account row styling) that calls `onEnableNotifications`. If the screen already lists rows in a data array, add an entry; otherwise add a `Pressable` row consistent with the others.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Manual verification (after rebuild)**

In Account, tap "Enable notifications": if previously denied, it routes you to re-grant; on grant, a token row appears/updates.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(app\)/account.tsx
git commit -m "feat(mobile): Account — enable-notifications toggle (re-request + register)"
```

---

## Verification Summary

**Stage 1 (OTA, no rebuild) — after Tasks 1–5:**
- Products loads from cache instantly on revisit; "Updating…" shows during background refetch.
- Toggle active / delete are optimistic (instant), roll back on error.
- Create/edit reflect in the list.
- Within a session, the cached list survives navigation while offline.

**Stage 2 (after a rebuild) — after Tasks 6–10:**
- Force-quit + relaunch offline → Products renders from persisted cache.
- Sign in on a physical device → permission prompt → token row in `device_push_tokens`.
- Account toggle re-requests/registers.

## Deferred (explicitly out of scope)
- Migrating other screens (orders/today/branding/etc.) to react-query.
- Offline **write** queue (optimistic writes assume online; failures roll back, not queued).
- NetInfo / offline banner.
- Any push **sender**, triggers, foreground/tap handling, deep-link routing from a notification.
- Regenerating Supabase types to drop the `as any` casts on `beta_signups` / `device_push_tokens`.
