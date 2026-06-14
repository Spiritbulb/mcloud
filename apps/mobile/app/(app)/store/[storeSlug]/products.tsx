// Products — list with image thumbnails. Tap to edit, long-press to delete.
// + New Product button in the header navigates to product-form.
import * as React from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/AuthContext'
import { api, type Product } from '@/lib/api'
import { useStore } from '@/store/StoreContext'
import { Avatar, Badge, Body, Card } from '@/components/ui'
import { useTheme, type Theme } from '@/lib/theme'

export default function ProductsScreen() {
  const t = useTheme()
  const s = React.useMemo(() => styles(t), [t])
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { slug: storeSlug } = useStore()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [products, setProducts] = React.useState<Product[]>([])
  const [role, setRole] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const canManage = role === 'owner' || role === 'admin'
  const hasData = products.length > 0

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setError(null)
    if (!hasData) setLoading(true)
    try {
      const r = await client.listProducts(storeSlug)
      setProducts(r.products)
      setRole(r.role)
      setError(null)
    } catch (e) {
      if (!hasData) setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, storeSlug])

  const onRefresh = React.useCallback(() => { setRefreshing(true); load(true) }, [load])
  React.useEffect(() => { load() }, [load])

  const onDelete = (prod: Product) => {
    Alert.alert('Delete product', `Remove "${prod.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await client.deleteProduct(storeSlug, prod.id); await load() }
          catch (e) { Alert.alert('Could not delete', e instanceof Error ? e.message : 'Error') }
        },
      },
    ])
  }

  const onToggleActive = async (prod: Product) => {
    try { await client.updateProduct(storeSlug, prod.id, { is_active: !prod.is_active }); await load() }
    catch (e) { Alert.alert('Update failed', e instanceof Error ? e.message : 'Error') }
  }

  return (
    <FlatList
      style={[s.fill, { backgroundColor: t.colors.background }]}
      contentContainerStyle={s.list}
      data={products}
      keyExtractor={(p) => p.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />}
      ListHeaderComponent={
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <Text style={[t.type.headlineSmall, { color: t.colors.onSurface }]}>Products</Text>
          {canManage && (
            <Pressable
              onPress={() => router.push(`/store/${storeSlug}/product-form` as never)}
              hitSlop={8}
              style={({ pressed }) => [s.addBtn, { backgroundColor: t.colors.surfaceContainerHigh }, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="add" size={18} color={t.colors.onSurface} />
              <Text style={[t.type.labelLarge, { color: t.colors.onSurface }]}>New product</Text>
            </Pressable>
          )}
        </View>
      }
      ListEmptyComponent={
        !loading ? (
          <Card>
            <Body variant>{error ?? 'No products yet. Tap "New product" to add your first one.'}</Body>
          </Card>
        ) : null
      }
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => {
        const thumb = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null
        const hasCompareAt = item.compare_at_price != null && item.compare_at_price > item.price
        return (
          <Pressable
            onPress={canManage ? () => router.push(`/store/${storeSlug}/product-form?productId=${item.id}` as never) : undefined}
            onLongPress={canManage ? () => onDelete(item) : undefined}
            style={({ pressed }) => [s.row, { backgroundColor: t.colors.surfaceContainerLow }, pressed && { opacity: 0.7 }]}
          >
            {/* Thumbnail */}
            <View style={s.thumbWrap}>
              {thumb ? (
                <Image source={{ uri: thumb }} style={s.thumb} contentFit="cover" />
              ) : (
                <Avatar name={item.name} size={52} radius={10} />
              )}
            </View>

            {/* Info */}
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[t.type.bodyMedium, { color: t.colors.onSurface, fontWeight: '600' }]}>
                  KES {item.price.toLocaleString()}
                </Text>
                {hasCompareAt && (
                  <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant, textDecorationLine: 'line-through' }]}>
                    {item.compare_at_price!.toLocaleString()}
                  </Text>
                )}
              </View>
              {item.inventory_quantity != null && (
                <Text style={[t.type.bodySmall, { color: item.inventory_quantity === 0 ? t.colors.error : t.colors.onSurfaceVariant }]}>
                  {item.inventory_quantity === 0 ? 'Out of stock' : `${item.inventory_quantity} in stock`}
                </Text>
              )}
            </View>

            {/* Status */}
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              {canManage ? (
                <Pressable onPress={() => onToggleActive(item)} hitSlop={8}>
                  <Badge
                    label={item.is_active ? 'Active' : 'Hidden'}
                    tone={item.is_active ? 'primary' : 'neutral'}
                    accentColor={item.is_active ? { bg: 'rgb(198 236 210)', fg: 'rgb(20 73 43)' } : undefined}
                  />
                </Pressable>
              ) : (
                <Badge
                  label={item.is_active ? 'Active' : 'Hidden'}
                  tone={item.is_active ? 'primary' : 'neutral'}
                  accentColor={item.is_active ? { bg: 'rgb(198 236 210)', fg: 'rgb(20 73 43)' } : undefined}
                />
              )}
              {canManage && (
                <Ionicons name="chevron-forward" size={16} color={t.colors.onSurfaceVariant} />
              )}
            </View>
          </Pressable>
        )
      }}
      ListFooterComponent={
        canManage && products.length > 0 ? (
          <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant, textAlign: 'center', marginTop: 16 }]}>
            Tap to edit · long-press to delete
          </Text>
        ) : null
      }
    />
  )
}

const styles = (t: Theme) =>
  StyleSheet.create({
    fill: { flex: 1 },
    list: { padding: 20, gap: 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: 14,
    },
    thumbWrap: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden' },
    thumb: { width: 52, height: 52 },
  })