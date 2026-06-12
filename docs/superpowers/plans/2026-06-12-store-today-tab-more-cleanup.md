# Store Today Tab + More Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Overview tab with an action-first Today tab (pending orders inline, store pulse, contextual attention card, quick actions) and collapse the More tab's web links into a single "Advanced settings" row.

**Architecture:** The Today tab replaces `app/(app)/store/[storeSlug]/index.tsx` entirely. It reads from `StoreContext` (already shared) for store metadata, and fetches orders + analytics independently on mount. A new `useTodayData` hook in `src/store/useTodayData.ts` owns the Today tab's data fetching so the screen stays declarative. The More tab cleanup is a pure UI change to `more.tsx` — no new data needed.

**Tech Stack:** React Native, Expo Router, Material 3 custom UI primitives (`src/components/ui.tsx`), existing `api()` client (`src/lib/api.ts`), `useTheme()` from `src/lib/theme.ts`.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `app/(app)/store/[storeSlug]/_layout.tsx` | Rename tab title "Overview" → "Today", update icon |
| Replace | `app/(app)/store/[storeSlug]/index.tsx` | Today tab screen |
| Create | `src/store/useTodayData.ts` | Data hook: orders + analytics for Today tab |
| Modify | `app/(app)/store/[storeSlug]/more.tsx` | Collapse web rows into single Advanced settings row |

---

## Task 1: Rename tab + update icon in layout

**Files:**
- Modify: `apps/mobile/app/(app)/store/[storeSlug]/_layout.tsx:33-39`

- [ ] **Step 1: Update the index tab title and icon**

In `_layout.tsx`, change the `index` Tabs.Screen from:
```tsx
<Tabs.Screen
  name="index"
  options={{
    title: 'Overview',
    tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
  }}
/>
```
To:
```tsx
<Tabs.Screen
  name="index"
  options={{
    title: 'Today',
    tabBarIcon: ({ color, size }) => <Ionicons name="sunny-outline" size={size} color={color} />,
  }}
/>
```

- [ ] **Step 2: Commit**
```bash
git add apps/mobile/app/\(app\)/store/\[storeSlug\]/_layout.tsx
git commit -m "feat(mobile): rename Overview tab to Today, update icon"
```

---

## Task 2: Create `useTodayData` hook

**Files:**
- Create: `apps/mobile/src/store/useTodayData.ts`

This hook fetches the data the Today tab needs: unfulfilled orders and today's analytics pulse. It uses the shared `authedFetch` from `AuthContext` and the typed `api()` client.

- [ ] **Step 1: Create the file**

```ts
import * as React from 'react'
import { useAuth } from '@/auth/AuthContext'
import { api, type Order, type AnalyticsTotals } from '@/lib/api'

export type TodayData = {
  unfulfilledOrders: Order[]
  analytics: AnalyticsTotals | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useTodayData(storeSlug: string): TodayData {
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [unfulfilledOrders, setUnfulfilledOrders] = React.useState<Order[]>([])
  const [analytics, setAnalytics] = React.useState<AnalyticsTotals | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const [ordersRes, analyticsRes] = await Promise.all([
        client.listOrders(storeSlug),
        client.getAnalytics(storeSlug, 1),
      ])
      setUnfulfilledOrders(ordersRes.filter((o) => !o.fulfillment_status || o.fulfillment_status === 'unfulfilled'))
      setAnalytics(analyticsRes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [client, storeSlug])

  React.useEffect(() => { refresh() }, [refresh])

  return { unfulfilledOrders, analytics, loading, error, refresh }
}
```

- [ ] **Step 2: Commit**
```bash
git add apps/mobile/src/store/useTodayData.ts
git commit -m "feat(mobile): useTodayData hook for Today tab data"
```

---

## Task 3: Add `fulfillOrder` to api client

**Files:**
- Modify: `apps/mobile/src/lib/api.ts`

The Today tab needs a one-tap "Mark fulfilled" action. We'll add a convenience method that wraps the existing `updateOrderStatus`.

- [ ] **Step 1: Add `fulfillOrder` method after `updateOrderStatus` (around line 151)**

In `api.ts`, inside the returned object from `export function api(authedFetch: Fetch)`, add after `updateOrderStatus`:

```ts
async fulfillOrder(slug: string, id: string): Promise<Order> {
  const res = await authedFetch(`/api/mobile/stores/${slug}/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fulfillment_status: 'fulfilled' }),
  })
  return (await json<{ order: Order }>(res)).order
},
```

- [ ] **Step 2: Commit**
```bash
git add apps/mobile/src/lib/api.ts
git commit -m "feat(mobile): add fulfillOrder convenience method to api client"
```

---

## Task 4: Build the Today tab screen

**Files:**
- Replace: `apps/mobile/app/(app)/store/[storeSlug]/index.tsx`

This is the main task. The Today tab has four content blocks stacked top-to-bottom: pending orders, store pulse, attention card, quick actions. All wrapped in a `ScrollView` with pull-to-refresh.

- [ ] **Step 1: Replace `index.tsx` with the Today tab**

```tsx
import * as React from 'react'
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Avatar, Badge, Body, Card, FadeInUp, Skeleton } from '@/components/ui'
import { useStore } from '@/store/StoreContext'
import { useTodayData } from '@/store/useTodayData'
import { useAuth } from '@/auth/AuthContext'
import { api, type Order } from '@/lib/api'
import { useTheme, type Theme } from '@/lib/theme'

export default function TodayTab() {
  const t = useTheme()
  const s = React.useMemo(() => styles(t), [t])
  const router = useRouter()
  const { slug, store, loading: storeLoading, canManage, refresh: refreshStore } = useStore()
  const { unfulfilledOrders, analytics, loading, error, refresh: refreshToday } = useTodayData(slug)
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [refreshing, setRefreshing] = React.useState(false)
  const [fulfillingId, setFulfillingId] = React.useState<string | null>(null)

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refreshStore(), refreshToday()])
    setRefreshing(false)
  }, [refreshStore, refreshToday])

  const onFulfill = React.useCallback(async (order: Order) => {
    Alert.alert(
      'Mark fulfilled',
      `Mark order ${order.order_number} as fulfilled?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fulfill',
          onPress: async () => {
            setFulfillingId(order.id)
            try {
              await client.fulfillOrder(slug, order.id)
              await refreshToday()
            } catch (e) {
              Alert.alert('Failed', e instanceof Error ? e.message : 'Error')
            } finally {
              setFulfillingId(null)
            }
          },
        },
      ],
    )
  }, [client, slug, refreshToday])

  const todayRevenue = analytics?.totals?.revenue ?? 0
  const todayOrders = analytics?.totals?.orders ?? 0
  const prevRevenue = analytics?.previous?.revenue ?? 0
  const revenueUp = prevRevenue === 0 ? null : todayRevenue >= prevRevenue

  const attentionCard = React.useMemo(() => {
    if (!store) return null
    if (unfulfilledOrders.length === 0 && todayOrders === 0 && !storeLoading)
      return { icon: 'storefront-outline' as const, text: 'No orders yet — share your store to get your first sale', action: 'Share store', actionKey: 'share' }
    return null
  }, [store, unfulfilledOrders.length, todayOrders, storeLoading])

  const isLoading = (storeLoading || loading) && !store

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: t.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Ionicons name="chevron-back" size={26} color={t.colors.onSurface} />
        </Pressable>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [s.storeNameRow, pressed && { opacity: 0.7 }]}>
          {store && <Avatar name={store.name} uri={store.logo_url} size={28} radius={8} />}
          <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]} numberOfLines={1}>
            {store?.name ?? ''}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={t.colors.onSurfaceVariant} />
        </Pressable>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />}
      >
        {isLoading ? (
          <View style={{ gap: 16 }}>
            <Skeleton height={96} radius={20} />
            <Skeleton height={64} radius={16} />
            <Skeleton height={80} radius={16} />
          </View>
        ) : error || !store ? (
          <Card><Body variant>{error ?? 'Store unavailable'}</Body></Card>
        ) : (
          <>
            {/* Block 1: Pending orders */}
            {unfulfilledOrders.length > 0 && (
              <FadeInUp delay={0}>
                <Text style={[t.type.labelLarge, s.sectionLabel, { color: t.colors.onSurfaceVariant }]}>
                  Needs fulfillment
                </Text>
                <View style={{ gap: 8 }}>
                  {unfulfilledOrders.slice(0, 3).map((order) => (
                    <View
                      key={order.id}
                      style={[s.orderCard, { backgroundColor: t.colors.surfaceContainerLow, borderColor: t.colors.outlineVariant }]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>{order.order_number}</Text>
                        <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
                          {order.currency} {order.total.toLocaleString()}
                          {order.customer_phone ? ` · ${order.customer_phone}` : ''}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => onFulfill(order)}
                        disabled={fulfillingId === order.id}
                        style={({ pressed }) => [
                          s.fulfillBtn,
                          { backgroundColor: pressed ? t.colors.primaryContainer : t.colors.secondaryContainer },
                        ]}
                      >
                        <Text style={[t.type.labelLarge, { color: t.colors.onSecondaryContainer }]}>
                          {fulfillingId === order.id ? '...' : 'Fulfill'}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                  {unfulfilledOrders.length > 3 && (
                    <Pressable onPress={() => router.push(`/store/${slug}/orders` as never)} style={({ pressed }) => pressed && { opacity: 0.6 }}>
                      <Text style={[t.type.labelLarge, { color: t.colors.primary, textAlign: 'center', paddingVertical: 4 }]}>
                        See all {unfulfilledOrders.length} orders →
                      </Text>
                    </Pressable>
                  )}
                </View>
              </FadeInUp>
            )}

            {/* Block 2: Store pulse */}
            <FadeInUp delay={40}>
              <Pressable
                onPress={() => router.push(`/store/${slug}/analytics` as never)}
                style={({ pressed }) => [s.pulse, { backgroundColor: pressed ? t.colors.primaryContainer : t.colors.surfaceContainer }]}
              >
                <PulseStat label="Revenue today" value={`KES ${todayRevenue.toLocaleString()}`} up={revenueUp} t={t} />
                <View style={[s.pulseDivider, { backgroundColor: t.colors.outlineVariant }]} />
                <PulseStat label="Orders today" value={String(todayOrders)} up={null} t={t} />
                <View style={[s.pulseDivider, { backgroundColor: t.colors.outlineVariant }]} />
                <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                  <Ionicons name="bar-chart-outline" size={20} color={t.colors.primary} />
                  <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>Analytics</Text>
                </View>
              </Pressable>
            </FadeInUp>

            {/* Block 3: Attention card */}
            {attentionCard && (
              <FadeInUp delay={80}>
                <View style={[s.attentionCard, { backgroundColor: t.colors.secondaryContainer }]}>
                  <Ionicons name={attentionCard.icon} size={22} color={t.colors.secondary} />
                  <Text style={[t.type.bodyMedium, { color: t.colors.onSecondaryContainer, flex: 1 }]}>
                    {attentionCard.text}
                  </Text>
                </View>
              </FadeInUp>
            )}

            {/* Block 4: Quick actions */}
            <FadeInUp delay={120}>
              <Text style={[t.type.labelLarge, s.sectionLabel, { color: t.colors.onSurfaceVariant }]}>Quick actions</Text>
              <View style={s.actionRow}>
                {canManage && (
                  <ActionTile t={t} icon="add-circle-outline" label="Add product" onPress={() => router.push(`/store/${slug}/products` as never)} />
                )}
                <ActionTile t={t} icon="receipt-outline" label="Orders" onPress={() => router.push(`/store/${slug}/orders` as never)} />
              </View>
              <View style={s.actionRow}>
                <ActionTile t={t} icon="share-outline" label="Share store" onPress={() => {
                  const url = store.custom_domain ? `https://${store.custom_domain}` : `https://menengai.cloud/s/${store.slug}`
                  Alert.alert('Share your store', url, [{ text: 'OK' }])
                }} />
                <ActionTile t={t} icon="color-palette-outline" label="Branding" onPress={() => router.push(`/store/${slug}/branding` as never)} />
              </View>
            </FadeInUp>

            <View style={{ height: 24 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function PulseStat({ label, value, up, t }: { label: string; value: string; up: boolean | null; t: Theme }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>{value}</Text>
        {up !== null && (
          <Ionicons
            name={up ? 'trending-up' : 'trending-down'}
            size={14}
            color={up ? 'rgb(27 109 58)' : t.colors.error}
          />
        )}
      </View>
      <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  )
}

function ActionTile({ t, icon, label, onPress }: { t: Theme; icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        actionStyles.tile,
        { backgroundColor: pressed ? t.colors.surfaceContainerHigh : t.colors.surfaceContainer },
      ]}
    >
      <View style={[actionStyles.iconWrap, { backgroundColor: t.colors.surface }]}>
        <Ionicons name={icon} size={22} color={t.colors.primary} />
      </View>
      <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>{label}</Text>
    </Pressable>
  )
}

const actionStyles = StyleSheet.create({
  tile: { flex: 1, borderRadius: 20, padding: 16, gap: 10, minHeight: 88, justifyContent: 'space-between' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
})

const styles = (t: Theme) =>
  StyleSheet.create({
    fill: { flex: 1 },
    topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44 },
    storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
    scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
    sectionLabel: { marginBottom: 6, letterSpacing: 0.5 },
    orderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
    fulfillBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    pulse: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, gap: 0 },
    pulseDivider: { width: 1, height: 36, marginHorizontal: 4 },
    attentionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
    actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  })
```

- [ ] **Step 2: Commit**
```bash
git add apps/mobile/app/\(app\)/store/\[storeSlug\]/index.tsx
git commit -m "feat(mobile): Today tab — pending orders, store pulse, attention card, quick actions"
```

---

## Task 5: More tab cleanup

**Files:**
- Modify: `apps/mobile/app/(app)/store/[storeSlug]/more.tsx`

Replace the four individual web rows with a single "Advanced settings" row that opens the web merchant dashboard settings page.

- [ ] **Step 1: Replace the `WEB` constant and its render block**

In `more.tsx`, replace the `WEB` constant (lines 24–29):
```ts
const WEB: { key: string; label: string; desc: string; icon: React.ComponentProps<typeof Ionicons>['name']; path: (s: StoreHub) => string }[] = [
  { key: 'payments', label: 'Auto payments', desc: 'Paystack, cards, Daraja', icon: 'card-outline', path: (s) => `/org/${s.orgSlug}/${s.slug}/settings/integrations/payments` },
  { key: 'domain', label: 'Custom domain', desc: 'Connect your own URL', icon: 'globe-outline', path: (s) => `/org/${s.orgSlug}/${s.slug}/settings/domain` },
  { key: 'members', label: 'Members', desc: 'Team & roles', icon: 'people-outline', path: (s) => `/org/${s.orgSlug}/${s.slug}/settings/members` },
  { key: 'design', label: 'Design editor', desc: 'Theme & layout', icon: 'brush-outline', path: (s) => `/org/${s.orgSlug}/${s.slug}/settings/appearance` },
]
```
With:
```ts
function advancedSettingsUrl(s: StoreHub): string {
  return `/org/${s.orgSlug}/${s.slug}/settings`
}
```

- [ ] **Step 2: Replace the "Advanced · on the web" render block**

Find this block in the JSX (around line 87–99):
```tsx
<Text style={[t.type.labelLarge, s.label, { color: t.colors.onSurfaceVariant }]}>Advanced · on the web</Text>
<Card style={s.group}>
  {WEB.map((w, i) => (
    <SettingsRow
      key={w.key}
      t={t}
      icon={w.icon}
      label={w.label}
      desc={w.desc}
      external
      divider={i < WEB.length - 1}
      onPress={() => WebBrowser.openBrowserAsync(`${config.webBaseUrl}${w.path(store)}`)}
    />
  ))}
</Card>
```
Replace with:
```tsx
<Card style={s.group}>
  <SettingsRow
    t={t}
    icon="open-outline"
    label="Advanced settings"
    desc="Payments, domain, members, design"
    external
    divider={false}
    onPress={() => WebBrowser.openBrowserAsync(`${config.webBaseUrl}${advancedSettingsUrl(store)}`)}
  />
</Card>
```

- [ ] **Step 3: Remove the unused `StoreHub` import from `api`**

In `more.tsx` line 11, change:
```ts
import { api, type StoreHub } from '@/lib/api'
```
To:
```ts
import { api } from '@/lib/api'
```

- [ ] **Step 4: Commit**
```bash
git add apps/mobile/app/\(app\)/store/\[storeSlug\]/more.tsx
git commit -m "feat(mobile): collapse More tab web links into single Advanced settings row"
```

---

## Task 6: Smoke test

- [ ] **Step 1: Start the app in Expo Go**
```bash
cd apps/mobile && npx expo start
```

- [ ] **Step 2: Verify Today tab**
  - Tab bar shows "Today" with sun icon (not "Overview")
  - Tab bar sits above the home indicator — not hidden behind it
  - Store name + avatar appear in the header with a `›` chevron
  - If you have unfulfilled orders: they appear in the "Needs fulfillment" block; tapping "Fulfill" shows a confirmation alert
  - Store pulse row shows revenue + order count for today; tapping opens Analytics
  - Quick actions row shows Add product (if canManage), Orders, Share store, Branding
  - Pull-to-refresh reloads both store and today data

- [ ] **Step 3: Verify More tab**
  - "Manage" section still shows Branding, M-Pesa, Analytics rows
  - The four individual web rows (Auto payments, Custom domain, Members, Design editor) are gone
  - A single "Advanced settings" row with external icon appears instead
  - Tapping it opens the web merchant settings page in the system browser

- [ ] **Step 4: Commit smoke test sign-off**
```bash
git commit --allow-empty -m "chore(mobile): smoke tested Today tab + More cleanup"
```
