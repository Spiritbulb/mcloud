// Add / Edit product — full field set matching web. Pushed as a stack screen.
// Route params: productId (edit) or none (create).
import * as React from 'react'
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Switch, Text, View,
} from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/AuthContext'
import { api, type Product } from '@/lib/api'
import { useStore } from '@/store/StoreContext'
import { Avatar, Button, Field } from '@/components/ui'
import { useTheme } from '@/lib/theme'

export default function ProductFormScreen() {
  const t = useTheme()
  const router = useRouter()
  const { slug: storeSlug, store } = useStore()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])
  const { productId } = useLocalSearchParams<{ productId?: string }>()
  const isEdit = !!productId

  // Form state
  const [name, setName] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [compareAt, setCompareAt] = React.useState('')
  const [inventory, setInventory] = React.useState('')
  const [trackInventory, setTrackInventory] = React.useState(false)
  const [images, setImages] = React.useState<string[]>([])
  const [saving, setSaving] = React.useState(false)
  const [uploadingImage, setUploadingImage] = React.useState(false)

  // Load existing product for edit
  React.useEffect(() => {
    if (!isEdit) return
    client.listProducts(storeSlug).then((r) => {
      const prod = r.products.find((p) => p.id === productId)
      if (!prod) return
      setName(prod.name)
      setPrice(String(prod.price))
      setCompareAt(prod.compare_at_price != null ? String(prod.compare_at_price) : '')
      setInventory(prod.inventory_quantity != null ? String(prod.inventory_quantity) : '')
      setTrackInventory(prod.track_inventory)
      setImages(prod.images ?? [])
    })
  }, [isEdit, productId, storeSlug, client])

  const thumb = images[0] ?? null
  const canSave = name.trim().length > 0 && price.trim().length > 0 && Number.isFinite(Number(price))

  const onPickImage = async () => {
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

    // If editing an existing product, upload immediately
    if (isEdit && productId) {
      setUploadingImage(true)
      try {
        const storeId = store?.id ?? storeSlug
        const url = await client.uploadImage(result.assets[0].uri, 'product-images', `${storeId}/${productId}/0`)
        const next = [url, ...images.filter((u) => u !== url)]
        await client.updateProduct(storeSlug, productId, { images: next })
        setImages(next)
      } catch (e) {
        Alert.alert('Upload failed', e instanceof Error ? e.message : 'Error')
      } finally {
        setUploadingImage(false)
      }
    } else {
      // For new products, store uri locally — upload after create
      setImages([result.assets[0].uri])
    }
  }

  const onSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const priceNum = Number(price)
      const compareNum = compareAt.trim() ? Number(compareAt) : null
      const invNum = inventory.trim() ? Number(inventory) : null

      if (isEdit && productId) {
        await client.updateProduct(storeSlug, productId, {
          name: name.trim(),
          price: priceNum,
          compare_at_price: compareNum,
          inventory_quantity: invNum,
          track_inventory: trackInventory,
        })
        router.back()
      } else {
        const prod = await client.createProduct(storeSlug, {
          name: name.trim(),
          price: priceNum,
          compare_at_price: compareNum,
          inventory_quantity: invNum,
          track_inventory: trackInventory,
        })
        // Upload local image if one was picked
        if (images[0] && !images[0].startsWith('http')) {
          try {
            const storeId = store?.id ?? storeSlug
            const url = await client.uploadImage(images[0], 'product-images', `${storeId}/${prod.id}/0`)
            await client.updateProduct(storeSlug, prod.id, { images: [url] })
          } catch {
            // Image upload failure is non-fatal — product was created
          }
        }
        router.back()
      }
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: t.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: isEdit ? 'Edit product' : 'New product',
          headerRight: () => (
            <Pressable onPress={onSave} disabled={!canSave || saving} hitSlop={12}>
              <Text style={[t.type.labelLarge, { color: canSave ? t.colors.primary : t.colors.onSurfaceVariant }]}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Image picker */}
        <Pressable onPress={onPickImage} style={styles.imageRow}>
          <View style={[styles.imageWrap, { backgroundColor: t.colors.surfaceContainerHigh }]}>
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.image} contentFit="cover" />
            ) : (
              <Avatar name={name || '?'} size={72} radius={16} />
            )}
            <View style={[styles.cameraOverlay, { backgroundColor: uploadingImage ? t.colors.surfaceContainer : 'rgba(0,0,0,0.42)' }]}>
              <Ionicons name={uploadingImage ? 'hourglass-outline' : 'camera-outline'} size={18} color="#fff" />
            </View>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>Product image</Text>
            <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
              {thumb ? 'Tap to change' : 'Tap to add a photo'}
            </Text>
          </View>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: t.colors.outlineVariant }]} />

        {/* Core fields */}
        <View style={styles.section}>
          <Text style={[t.type.labelLarge, styles.sectionLabel, { color: t.colors.onSurfaceVariant }]}>Details</Text>
          <Field
            label="Product name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Lavender Candle"
            autoCapitalize="words"
            returnKeyType="next"
          />
          <Field
            label="Price (KES)"
            value={price}
            onChangeText={setPrice}
            placeholder="0"
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
          <Field
            label="Compare-at price (KES)"
            value={compareAt}
            onChangeText={setCompareAt}
            placeholder="Optional — shown as original price"
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: t.colors.outlineVariant }]} />

        {/* Inventory */}
        <View style={styles.section}>
          <Text style={[t.type.labelLarge, styles.sectionLabel, { color: t.colors.onSurfaceVariant }]}>Inventory</Text>
          <View style={[styles.toggleRow, { backgroundColor: t.colors.surfaceContainerLow, borderRadius: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>Track inventory</Text>
              <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
                Prevent orders when stock runs out
              </Text>
            </View>
            <Switch
              value={trackInventory}
              onValueChange={setTrackInventory}
              trackColor={{ true: t.colors.primary }}
              thumbColor={trackInventory ? t.colors.onPrimary : t.colors.outline}
            />
          </View>
          {trackInventory && (
            <Field
              label="Quantity in stock"
              value={inventory}
              onChangeText={setInventory}
              placeholder="0"
              keyboardType="number-pad"
              returnKeyType="done"
            />
          )}
        </View>

        <View style={{ height: 32 }} />
        <Button label={isEdit ? 'Save changes' : 'Add to catalogue'} onPress={onSave} loading={saving} disabled={!canSave} variant="filled" />
        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { padding: 20, gap: 16 },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  imageWrap: { width: 80, height: 80, borderRadius: 16, overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  image: { width: 80, height: 80 },
  cameraOverlay: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  section: { gap: 12 },
  sectionLabel: { letterSpacing: 0.5, marginBottom: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
})