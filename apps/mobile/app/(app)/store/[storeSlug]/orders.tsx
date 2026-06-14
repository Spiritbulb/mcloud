// Orders — list + fulfillment status update. M3, system theme.
import * as React from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthContext'
import { useStore } from '@/store/StoreContext'
import { api, type Order } from '@/lib/api'
import { Avatar, Badge, Body, Card } from '@/components/ui'
import { useTheme, type Theme } from '@/lib/theme'

const STATUSES = ['unfulfilled', 'fulfilled', 'partial', 'cancelled'] as const

function statusAccent(s: string | null): { bg: string; fg: string } {
  if (s === 'fulfilled') return { bg: 'rgb(198 236 210)', fg: 'rgb(20 73 43)' }
  if (s === 'cancelled') return { bg: 'rgb(232 232 235)', fg: 'rgb(66 71 78)' }
  if (s === 'partial')   return { bg: 'rgb(255 231 184)', fg: 'rgb(90 55 0)' }
  return { bg: 'rgb(255 220 164)', fg: 'rgb(90 55 0)' }
}

export default function OrdersScreen() {
  const t = useTheme()
  const s = React.useMemo(() => styles(t), [t])
  const insets = useSafeAreaInsets()
  const { slug: storeSlug } = useStore()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [orders, setOrders] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setError(null)
    try {
      setOrders(await client.listOrders(storeSlug))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [client, storeSlug])

  const onRefresh = React.useCallback(() => { setRefreshing(true); load() }, [load])

  React.useEffect(() => { load() }, [load])

  const cycleStatus = (order: Order) => {
    const cur = (order.fulfillment_status ?? 'unfulfilled') as (typeof STATUSES)[number]
    const next = STATUSES[(STATUSES.indexOf(cur) + 1) % STATUSES.length]
    Alert.alert('Update order', `Mark ${order.order_number} as "${next}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update',
        onPress: async () => {
          try { await client.updateOrderStatus(storeSlug, order.id, next); await load() }
          catch (e) { Alert.alert('Update failed', e instanceof Error ? e.message : 'Error') }
        },
      },
    ])
  }

  return (
    <FlatList
      style={[s.fill, { backgroundColor: t.colors.background }]}
      contentContainerStyle={s.list}
      data={orders}
      keyExtractor={(o) => o.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />}
      ListHeaderComponent={
        <View style={{ paddingTop: insets.top + 8, marginBottom: 12 }}>
          <Text style={[t.type.headlineSmall, { color: t.colors.onSurface }]}>Orders</Text>
        </View>
      }
      ListEmptyComponent={
        !loading ? (
          <Card><Body variant>{error ?? "No orders yet. When customers buy, they'll show up here."}</Body></Card>
        ) : null
      }
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => {
        const customer = item.customer_email ?? item.customer_phone ?? null
        const firstItem = item.items?.[0]
        const moreItems = (item.items?.length ?? 0) - 1
        return (
          <Pressable
            onPress={() => cycleStatus(item)}
            style={[s.row, { backgroundColor: t.colors.surfaceContainerLow }]}
          >
            {/* Leading item thumbnail or initials */}
            {firstItem?.image_url ? (
              <Image source={{ uri: firstItem.image_url }} style={s.thumb} contentFit="cover" />
            ) : (
              <Avatar name={firstItem?.title ?? item.order_number} size={48} />
            )}

            {/* Order info */}
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>{item.order_number}</Text>
                {moreItems > 0 && (
                  <Text style={[t.type.labelSmall, { color: t.colors.onSurfaceVariant }]}>+{moreItems} more</Text>
                )}
              </View>
              {firstItem && (
                <Text style={[t.type.bodyMedium, { color: t.colors.onSurface }]} numberOfLines={1}>
                  {firstItem.quantity > 1 ? `${firstItem.quantity}× ` : ''}{firstItem.title}
                </Text>
              )}
              <Text style={[t.type.bodySmall, { color: t.colors.onSurfaceVariant }]}>
                {item.currency} {item.total.toLocaleString()}
                {customer ? ` · ${customer}` : ''}
              </Text>
            </View>

            <Badge label={item.fulfillment_status ?? 'unfulfilled'} accentColor={statusAccent(item.fulfillment_status)} />
          </Pressable>
        )
      }}
      ListFooterComponent={
        orders.length > 0 ? (
          <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant, textAlign: 'center', marginTop: 16 }]}>
            Tap an order to update its status
          </Text>
        ) : null
      }
    />
  )
}

const styles = (t: Theme) =>
  StyleSheet.create({
    fill: { flex: 1 },
    list: { padding: 20 },
    row: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: 12,
    },
    thumb: { width: 48, height: 48, borderRadius: 10 },
  })