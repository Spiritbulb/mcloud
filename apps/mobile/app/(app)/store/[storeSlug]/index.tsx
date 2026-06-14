import * as React from 'react'
import {
  Alert,
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
import { Avatar, Body, Card, FadeInUp, Skeleton } from '@/components/ui'
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
      return { icon: 'storefront-outline' as const, text: 'No orders yet — share your store to get your first sale' }
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
                      <Text style={[t.type.labelLarge, { color: t.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 4 }]}>
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
                  <Ionicons name="bar-chart-outline" size={20} color={t.colors.onSurfaceVariant} />
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
                  <ActionTile t={t} icon="add-circle-outline" label="Add product" iconColor="rgb(20 100 55)" iconBg="rgb(205 240 220)" onPress={() => router.push(`/store/${slug}/products` as never)} />
                )}
                <ActionTile t={t} icon="receipt-outline" label="Orders" iconColor="rgb(120 80 0)" iconBg="rgb(255 235 180)" onPress={() => router.push(`/store/${slug}/orders` as never)} />
              </View>
              <View style={s.actionRow}>
                <ActionTile t={t} icon="share-outline" label="Share store" iconColor="rgb(0 90 120)" iconBg="rgb(200 235 245)" onPress={() => {
                  const url = store.custom_domain ? `https://${store.custom_domain}` : `https://menengai.cloud/s/${store.slug}`
                  Share.share({ message: url, url })
                }} />
                <ActionTile t={t} icon="color-palette-outline" label="Branding" iconColor="rgb(80 60 140)" iconBg="rgb(237 232 255)" onPress={() => router.push(`/store/${slug}/branding` as never)} />
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

function ActionTile({ t, icon, label, onPress, iconColor, iconBg }: { t: Theme; icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; iconColor?: string; iconBg?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        actionStyles.tile,
        { backgroundColor: pressed ? t.colors.surfaceContainerHigh : t.colors.surfaceContainer },
      ]}
    >
      <View style={[actionStyles.iconWrap, { backgroundColor: iconBg ?? t.colors.surfaceContainerHigh }]}>
        <Ionicons name={icon} size={22} color={iconColor ?? t.colors.onSurface} />
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
