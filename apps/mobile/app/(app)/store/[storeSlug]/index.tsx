import * as React from 'react'
import {
  Alert,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { Avatar, Body, Card, FadeInUp, Skeleton } from '@/components/ui'
import { ProSheet } from '@/components/ProSheet'
import { useStore } from '@/store/StoreContext'
import { useTodayData } from '@/store/useTodayData'
import { useAuth } from '@/auth/AuthContext'
import { api, type Order, type StoreHub } from '@/lib/api'
import { useTheme, type Theme } from '@/lib/theme'

// Default brand accent used when a store hasn't set settings.brandColor yet.
const DEFAULT_ACCENT = '#2E7D4F'

function getBrandColor(store: StoreHub | null): string {
  const raw = (store?.settings as Record<string, unknown> | undefined)?.brandColor
  if (typeof raw === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw)) return raw
  return DEFAULT_ACCENT
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function TodayTab() {
  const t = useTheme()
  const router = useRouter()
  const { slug, store, loading: storeLoading, canManage, refresh: refreshStore, openSwitcher } = useStore()
  const { unfulfilledOrders, analytics, loading, error, refresh: refreshToday } = useTodayData(slug)
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const accent = React.useMemo(() => getBrandColor(store), [store])
  const s = React.useMemo(() => styles(t, accent), [t, accent])

  const [refreshing, setRefreshing] = React.useState(false)
  const [fulfillingId, setFulfillingId] = React.useState<string | null>(null)
  const [proOpen, setProOpen] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)

  const showUpgrade = !!store && !store.is_pro && canManage

  const showToast = React.useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([refreshStore(), refreshToday()])
      showToast('Updated')
    } catch {
      showToast('Refresh failed, check your connection')
    } finally {
      setRefreshing(false)
    }
  }, [refreshStore, refreshToday, showToast])

  const onFulfill = React.useCallback((order: Order) => {
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
              showToast('Order fulfilled')
            } catch (e) {
              Alert.alert('Failed', e instanceof Error ? e.message : 'Error')
            } finally {
              setFulfillingId(null)
            }
          },
        },
      ],
    )
  }, [client, slug, refreshToday, showToast])

  const onShareStore = React.useCallback(async () => {
    if (!store) return
    const url = store.custom_domain ? `https://${store.custom_domain}` : `https://mcloud.co.ke/s/${store.slug}`
    try {
      const result = await Share.share({ message: url, url })
      if (result.action === Share.dismissedAction) return
    } catch {
      await Clipboard.setStringAsync(url)
      showToast('Link copied to clipboard')
    }
  }, [store, showToast])

  const todayRevenue = analytics?.totals?.revenue ?? 0
  const todayOrders = analytics?.totals?.orders ?? 0
  const prevRevenue = analytics?.previous?.revenue ?? 0
  const revenueUp = prevRevenue === 0 ? null : todayRevenue >= prevRevenue
  const revenueDeltaPct = prevRevenue > 0
    ? Math.round(((todayRevenue - prevRevenue) / prevRevenue) * 100)
    : null

  const attentionCard = React.useMemo(() => {
    if (!store) return null
    if (unfulfilledOrders.length === 0 && todayOrders === 0 && !storeLoading)
      return { icon: 'storefront-outline' as const, text: 'No orders yet, share your store to get your first sale' }
    if (unfulfilledOrders.length === 0 && todayOrders > 0 && !storeLoading)
      return { icon: 'checkmark-circle-outline' as const, text: 'All caught up, every order today is fulfilled' }
    return null
  }, [store, unfulfilledOrders.length, todayOrders, storeLoading])

  const isLoading = (storeLoading || loading) && !store

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: t.colors.background }]} edges={['top']}>
      {/* Header, back button standalone; store name+logo opens the shared switcher */}
      <View style={s.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Ionicons name="chevron-back" size={26} color={t.colors.onSurface} />
        </Pressable>
        <Pressable onPress={openSwitcher} style={({ pressed }) => [s.storeNameRow, pressed && { opacity: 0.7 }]}>
          {store && <Avatar name={store.name} uri={store.logo_url} size={26} radius={7} />}
          <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]} numberOfLines={1}>
            {store?.name ?? ''}
          </Text>
          <Ionicons name="chevron-down" size={16} color={t.colors.onSurfaceVariant} />
        </Pressable>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
      >
        {isLoading ? (
          <View style={{ gap: 16 }}>
            <Skeleton height={52} radius={16} />
            <Skeleton height={72} radius={16} />
            <Skeleton height={88} radius={20} />
            <Skeleton height={64} radius={16} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Skeleton height={88} radius={20} />
              <Skeleton height={88} radius={20} />
            </View>
          </View>
        ) : error || !store ? (
          <Card>
            <Body variant>{error ?? 'Store unavailable'}</Body>
            <Pressable onPress={onRefresh} style={[s.retryBtn, { backgroundColor: accent }]}>
              <Text style={[t.type.labelLarge, { color: '#fff' }]}>Try again</Text>
            </Pressable>
          </Card>
        ) : (
          <>
            {/* Upgrade banner */}
            {showUpgrade && (
              <FadeInUp delay={0}>
                <Pressable onPress={() => setProOpen(true)} style={({ pressed }) => pressed && { opacity: 0.85 }}>
                  <Card tonal style={s.upgradeCard}>
                    <View style={[s.upgradeIcon, { backgroundColor: t.colors.primaryContainer }]}>
                      <Ionicons name="diamond-outline" size={20} color={t.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>Upgrade to Pro</Text>
                      <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
                        Custom domain, analytics & more
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={t.colors.onSurfaceVariant} />
                  </Card>
                </Pressable>
              </FadeInUp>
            )}

            {/* Hero: revenue */}
            <FadeInUp delay={0}>
              <Pressable onPress={() => router.push(`/store/${slug}/analytics` as never)} style={({ pressed }) => pressed && { opacity: 0.85 }}>
                <View style={s.hero}>
                  <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>Revenue today</Text>
                  <View style={s.heroRow}>
                    <Text style={s.heroValue}>KES {todayRevenue.toLocaleString()}</Text>
                    {revenueDeltaPct !== null && (
                      <View style={[s.deltaChip, { backgroundColor: revenueUp ? accent : t.colors.error }]}>
                        <Text style={s.deltaChipText}>{revenueDeltaPct > 0 ? '+' : ''}{revenueDeltaPct}%</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.heroSubRow}>
                    <Text style={[t.type.bodyMedium, { color: t.colors.onSurface }]}>
                      <Text style={s.heroCount}>{todayOrders}</Text> orders today
                    </Text>
                    <Text style={[t.type.labelLarge, { color: accent }]}>View analytics</Text>
                  </View>
                </View>
              </Pressable>
            </FadeInUp>

            {/* Quick actions, icon rail, not tiles */}
            <FadeInUp delay={120}>
              <View style={s.actionRail}>
                {canManage && (
                  <RailAction t={t} icon="add-circle-outline" label="Add" onPress={() => router.push(`/store/${slug}/products` as never)} />
                )}
                <RailAction t={t} icon="receipt-outline" label="Orders" onPress={() => router.push(`/store/${slug}/orders` as never)} />
                <RailAction t={t} icon="share-outline" label="Share" onPress={onShareStore} />
                <RailAction t={t} icon="color-palette-outline" label="Branding" onPress={() => router.push(`/store/${slug}/branding` as never)} />
              </View>
            </FadeInUp>


            {/* Pending orders */}
            {unfulfilledOrders.length > 0 && (
              <FadeInUp delay={40}>
                <View style={s.sectionHeaderRow}>
                  <Text style={[t.type.labelLarge, { color: t.colors.onSurface }]}>Needs fulfillment</Text>
                  <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>{unfulfilledOrders.length}</Text>
                </View>
                <View style={{ gap: 8 }}>
                  {unfulfilledOrders.slice(0, 3).map((order) => (
                    <View key={order.id} style={[s.orderCard, { backgroundColor: t.colors.surfaceContainerLow }]}>
                      <View style={[s.orderIconWrap, { backgroundColor: t.colors.surfaceContainerHigh }]}>
                        <Ionicons name="cube-outline" size={18} color={accent} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>{order.order_number}</Text>
                        <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
                          {order.currency} {order.total.toLocaleString()}
                          {order.created_at ? ` · ${timeAgo(order.created_at)}` : ''}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => onFulfill(order)}
                        disabled={fulfillingId === order.id}
                        style={({ pressed }) => [s.fulfillBtn, { backgroundColor: accent, opacity: pressed ? 0.85 : 1 }]}
                      >
                        {fulfillingId === order.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={[t.type.labelLarge, { color: '#fff' }]}>Fulfill</Text>
                        )}
                      </Pressable>
                    </View>
                  ))}
                  {unfulfilledOrders.length > 3 && (
                    <Pressable onPress={() => router.push(`/store/${slug}/orders` as never)} style={({ pressed }) => pressed && { opacity: 0.6 }}>
                      <Text style={[t.type.labelLarge, { color: t.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 4 }]}>
                        See all {unfulfilledOrders.length} orders →
                      </Text>
                    </Pressable>
                  )}
                </View>
              </FadeInUp>
            )}

            {/* Attention card */}
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

            <View style={{ height: 24 }} />
          </>
        )}
      </ScrollView>

      {toast && (
        <View style={[s.toast, { backgroundColor: t.colors.inverseSurface }]} pointerEvents="none">
          <Text style={[t.type.bodyMedium, { color: t.colors.inverseOnSurface }]}>{toast}</Text>
        </View>
      )}

      {store && (
        <ProSheet visible={proOpen} slug={store.slug} onClose={() => setProOpen(false)} onSuccess={refreshStore} />
      )}
    </SafeAreaView>
  )
}

function RailAction({ t, icon, label, onPress }: { t: Theme; icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [railStyles.item, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={22} color={t.colors.onSurface} />
      <Text style={[t.type.labelSmall, { color: t.colors.onSurfaceVariant }]}>{label}</Text>
    </Pressable>
  )
}

const railStyles = StyleSheet.create({
  item: { alignItems: 'center', gap: 5, flex: 1 },
})

const styles = (t: Theme, accent: string) =>
  StyleSheet.create({
    fill: { flex: 1 },
    topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44 },
    storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
    scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },
    hero: { paddingVertical: 4, gap: 4 },
    heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 4 },
    heroValue: { fontFamily: 'Courier New', fontSize: 38, fontWeight: '700', color: t.colors.onSurface, letterSpacing: -1 },
    heroCount: { fontFamily: 'Courier New', fontWeight: '700', color: t.colors.onSurface },
    deltaChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginBottom: 6 },
    deltaChipText: { fontSize: 12, fontWeight: '600', color: '#fff' },
    heroSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    upgradeCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    upgradeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    orderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16 },
    orderIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    fulfillBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
    attentionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
    actionRail: { flexDirection: 'row', paddingVertical: 4 },
    retryBtn: { marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    toast: { position: 'absolute', bottom: 24, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  })