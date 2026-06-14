// Products — list + create + image upload + toggle + delete. M3, system theme.
import * as React from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/AuthContext'
import { api, type Product } from '@/lib/api'
import { useStore } from '@/store/StoreContext'
import { Avatar, Badge, Body, Button, Card, Field } from '@/components/ui'
import { useTheme, type Theme } from '@/lib/theme'

export default function ProductsScreen() {
  const t = useTheme()
  const s = React.useMemo(() => styles(t), [t])
  const insets = useSafeAreaInsets()
  const { slug: storeSlug, store } = useStore()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [products, setProducts] = React.useState<Product[]>([])
  const [role, setRole] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [uploadingId, setUploadingId] = React.useState<string | null>(null)

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
      setRefreshing(false)
    }
  }, [client, storeSlug])

  const onRefresh = React.useCallback(() => { setRefreshing(true); load() }, [load])

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

  const onPickImage = async (prod: Product) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow photo library access to add a product image.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return

    setUploadingId(prod.id)
    try {
      const asset = result.assets[0]
      const storeId = store?.id ?? storeSlug
      const url = await client.uploadImage(asset.uri, 'product-images', `${storeId}/${prod.id}/0`)
      const existing = Array.isArray(prod.images) ? prod.images : []
      await client.updateProductImages(storeSlug, prod.id, [url, ...existing.filter((u) => u !== url)])
      await load()
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload image')
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <FlatList
      style={[s.fill, { backgroundColor: t.colors.background }]}
      contentContainerStyle={s.list}
      data={products}
      keyExtractor={(p) => p.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />}
      ListHeaderComponent={
        <View style={{ gap: 16, marginBottom: 16, paddingTop: insets.top + 8 }}>
          <Text style={[t.type.headlineSmall, { color: t.colors.onSurface }]}>Products</Text>
          {canManage && (
            <Card tonal style={{ gap: 12 }}>
              <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>New product</Text>
              <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Lavender Candle" autoCapitalize="words" />
              <Field label="Price (KES)" value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" />
              <Button label="Add to catalogue" onPress={onCreate} loading={creating} disabled={!name.trim() || !price} accentColor={{ bg: 'rgb(55 107 80)', fg: 'rgb(255 255 255)' }} />
            </Card>
          )}
        </View>
      }
      ListEmptyComponent={!loading ? <Card><Body variant>{error ?? 'No products yet. Add your first one above.'}</Body></Card> : null}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => {
        const thumb = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null
        const isUploading = uploadingId === item.id
        return (
          <View style={[s.row, { backgroundColor: t.colors.surfaceContainerLow }]}>
            {/* Thumbnail / Avatar */}
            <Pressable
              onPress={canManage ? () => onPickImage(item) : undefined}
              style={s.thumbWrap}
            >
              {thumb ? (
                <Image source={{ uri: thumb }} style={s.thumb} contentFit="cover" />
              ) : (
                <Avatar name={item.name} size={48} />
              )}
              {canManage && (
                <View style={[s.cameraIcon, { backgroundColor: isUploading ? t.colors.surfaceContainer : 'rgba(0,0,0,0.38)' }]}>
                  <Ionicons name={isUploading ? 'hourglass-outline' : 'camera-outline'} size={13} color="#fff" />
                </View>
              )}
            </Pressable>

            {/* Info */}
            <Pressable
              onLongPress={() => canManage && onDelete(item)}
              style={{ flex: 1, gap: 2 }}
            >
              <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
                KES {item.price.toLocaleString()}
                {item.inventory_quantity != null ? ` · ${item.inventory_quantity} in stock` : ''}
              </Text>
            </Pressable>

            {/* Active badge */}
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
          </View>
        )
      }}
      ListFooterComponent={
        canManage && products.length > 0 ? (
          <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant, textAlign: 'center', marginTop: 16 }]}>
            Tap the thumbnail to add an image · long-press to delete
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
    thumbWrap: { width: 48, height: 48, borderRadius: 10, overflow: 'hidden', position: 'relative' },
    thumb: { width: 48, height: 48 },
    cameraIcon: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })