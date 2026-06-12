// Products — list + create + inline edit (price/stock) + delete. M3, system theme.
import * as React from 'react'
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthContext'
import { api, type Product } from '@/lib/api'
import { Avatar, Badge, Body, Button, Card, Field } from '@/components/ui'
import { useTheme, type Theme } from '@/lib/theme'

export default function ProductsScreen() {
  const t = useTheme()
  const s = React.useMemo(() => styles(t), [t])
  const insets = useSafeAreaInsets()
  const { storeSlug } = useLocalSearchParams<{ storeSlug: string }>()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [products, setProducts] = React.useState<Product[]>([])
  const [role, setRole] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [name, setName] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [creating, setCreating] = React.useState(false)
  const canManage = role === 'owner' || role === 'admin'

  const load = React.useCallback(async () => {
    setError(null)
    try {
      const r = await client.listProducts(storeSlug)
      setProducts(r.products)
      setRole(r.role)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [client, storeSlug])

  React.useEffect(() => { load() }, [load])

  const onCreate = async () => {
    const p = Number(price)
    if (!name.trim() || !Number.isFinite(p)) return
    setCreating(true)
    try {
      await client.createProduct(storeSlug, { name: name.trim(), price: p })
      setName(''); setPrice('')
      await load()
    } catch (e) {
      Alert.alert('Could not create', e instanceof Error ? e.message : 'Error')
    } finally {
      setCreating(false)
    }
  }

  const onDelete = (prod: Product) => {
    Alert.alert('Delete product', `Remove “${prod.name}”? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.deleteProduct(storeSlug, prod.id)
            await load()
          } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : 'Error')
          }
        },
      },
    ])
  }

  const onToggleActive = async (prod: Product) => {
    try {
      await client.updateProduct(storeSlug, prod.id, { is_active: !prod.is_active })
      await load()
    } catch (e) {
      Alert.alert('Update failed', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <FlatList
      style={[s.fill, { backgroundColor: t.colors.background }]}
      contentContainerStyle={s.list}
      data={products}
      keyExtractor={(p) => p.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={t.colors.primary} />}
      ListHeaderComponent={
        <View style={{ gap: 16, marginBottom: 16, paddingTop: insets.top + 8 }}>
          <Text style={[t.type.headlineSmall, { color: t.colors.onSurface }]}>Products</Text>
          {canManage && (
            <Card tonal style={{ gap: 12 }}>
              <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>Add a product</Text>
              <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Lavender Candle" autoCapitalize="words" />
              <Field label="Price (KES)" value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" />
              <Button label="Add product" onPress={onCreate} loading={creating} disabled={!name.trim() || !price} />
            </Card>
          )}
        </View>
      }
      ListEmptyComponent={!loading ? <Card><Body variant>{error ?? 'No products yet.'}</Body></Card> : null}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => (
        <Pressable
          onLongPress={() => canManage && onDelete(item)}
          style={[s.row, { backgroundColor: t.colors.surfaceContainerLow, borderColor: t.colors.outlineVariant }]}
        >
          <Avatar name={item.name} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
              KES {item.price.toLocaleString()}
              {item.inventory_quantity != null ? ` · ${item.inventory_quantity} in stock` : ''}
            </Text>
          </View>
          {canManage ? (
            <Pressable onPress={() => onToggleActive(item)} hitSlop={8}>
              <Badge label={item.is_active ? 'Active' : 'Hidden'} tone={item.is_active ? 'primary' : 'neutral'} />
            </Pressable>
          ) : (
            <Badge label={item.is_active ? 'Active' : 'Hidden'} tone={item.is_active ? 'primary' : 'neutral'} />
          )}
        </Pressable>
      )}
      ListFooterComponent={
        canManage && products.length > 0 ? (
          <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant, textAlign: 'center', marginTop: 16 }]}>
            Long-press a product to delete · tap the badge to show/hide
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
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
    },
  })
