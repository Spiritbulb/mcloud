// Orders — list + fulfillment status update. M3, system theme.
import * as React from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthContext'
import { useStore } from '@/store/StoreContext'
import { api, type Order } from '@/lib/api'
import { Badge, Body, Card } from '@/components/ui'
import { useTheme, type Theme } from '@/lib/theme'

const STATUSES = ['unfulfilled', 'fulfilled', 'partial', 'cancelled'] as const

function statusTone(s: string | null): 'primary' | 'tertiary' | 'neutral' {
  if (s === 'fulfilled') return 'primary'
  if (s === 'cancelled') return 'neutral'
  return 'tertiary'
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
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setError(null)
    try {
      setOrders(await client.listOrders(storeSlug))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [client, storeSlug])

  React.useEffect(() => { load() }, [load])

  const cycleStatus = (order: Order) => {
    const cur = (order.fulfillment_status ?? 'unfulfilled') as (typeof STATUSES)[number]
    const next = STATUSES[(STATUSES.indexOf(cur) + 1) % STATUSES.length]
    Alert.alert('Update order', `Mark ${order.order_number} as “${next}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update',
        onPress: async () => {
          try {
            await client.updateOrderStatus(storeSlug, order.id, next)
            await load()
          } catch (e) {
            Alert.alert('Update failed', e instanceof Error ? e.message : 'Error')
          }
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
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={t.colors.primary} />}
      ListHeaderComponent={
        <View style={{ paddingTop: insets.top + 8, marginBottom: 12 }}>
          <Text style={[t.type.headlineSmall, { color: t.colors.onSurface }]}>Orders</Text>
        </View>
      }
      ListEmptyComponent={!loading ? <Card><Body variant>{error ?? 'No orders yet.'}</Body></Card> : null}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => cycleStatus(item)}
          style={[s.row, { backgroundColor: t.colors.surfaceContainerLow, borderColor: t.colors.outlineVariant }]}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>{item.order_number}</Text>
            <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
              {item.currency} {item.total.toLocaleString()}
              {item.customer_phone ? ` · ${item.customer_phone}` : ''}
            </Text>
          </View>
          <Badge label={item.fulfillment_status ?? 'unfulfilled'} tone={statusTone(item.fulfillment_status)} />
        </Pressable>
      )}
      ListFooterComponent={
        orders.length > 0 ? (
          <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant, textAlign: 'center', marginTop: 16 }]}>
            Tap an order to cycle its fulfillment status
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
      gap: 14,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
    },
  })
