// Add / Edit product — full field set matching web. Pushed as a stack screen.
// Route params: productId (edit) or none (create).
import * as React from 'react'
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Switch, Text, View,
} from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/AuthContext'
import { type Product } from '@/lib/api'
import { useDemoApi } from '@/demo/demoApi'
import { useCreateProduct, useUpdateProduct } from '@/data/products'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryClient'
import { useStore } from '@/store/StoreContext'
import { Button, Field } from '@/components/ui'
import { useTheme } from '@/lib/theme'
import { haptic } from '@/lib/haptics'

export default function ProductFormScreen() {
  const t = useTheme()
  const router = useRouter()
  const navigation = useNavigation()
  const { slug: storeSlug, store } = useStore()
  const { authedFetch } = useAuth()
  const client = useDemoApi(authedFetch)
  const qc = useQueryClient()
  const createMut = useCreateProduct(storeSlug)
  const updateMut = useUpdateProduct(storeSlug)
  const { productId } = useLocalSearchParams<{ productId?: string }>()
  const isEdit = !!productId

  // Form state
  const [name, setName] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [compareAt, setCompareAt] = React.useState('')
  const [inventory, setInventory] = React.useState('')
  const [trackInventory, setTrackInventory] = React.useState(false)
  const [isActive, setIsActive] = React.useState(true)
  const [description, setDescription] = React.useState('')
  const [sku, setSku] = React.useState('')
  const [barcode, setBarcode] = React.useState('')
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
      setIsActive(prod.is_active)
      setDescription(prod.description ?? '')
      setSku(prod.sku ?? '')
      setBarcode(prod.barcode ?? '')
      setImages(prod.images ?? [])
    })
  }, [isEdit, productId, storeSlug, client])

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
    const pickedUri = result.assets[0].uri

    // Editing an existing product: upload now and APPEND to the gallery.
    if (isEdit && productId) {
      setUploadingImage(true)
      try {
        const storeId = store?.id ?? storeSlug
        // Index the storage path by current image count to avoid overwriting.
        const url = await client.uploadImage(pickedUri, 'product-images', `${storeId}/${productId}/${images.length}`)
        const next = [...images, url]
        await client.updateProduct(storeSlug, productId, { images: next })
        setImages(next)
      } catch (e) {
        Alert.alert('Upload failed', e instanceof Error ? e.message : 'Error')
      } finally {
        setUploadingImage(false)
      }
    } else {
      // New product: keep local uris, upload them all after create.
      setImages((prev) => [...prev, pickedUri])
    }
  }

  const onRemoveImage = async (uri: string) => {
    const next = images.filter((u) => u !== uri)
    setImages(next)
    // For an existing product, persist the removal immediately.
    if (isEdit && productId) {
      try {
        await client.updateProduct(storeSlug, productId, { images: next })
      } catch (e) {
        // Roll back on failure so UI stays truthful.
        setImages(images)
        Alert.alert('Could not remove image', e instanceof Error ? e.message : 'Error')
      }
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
        await updateMut.mutateAsync({ id: productId, patch: {
          name: name.trim(),
          price: priceNum,
          compare_at_price: compareNum,
          inventory_quantity: invNum,
          track_inventory: trackInventory,
          is_active: isActive,
          description: description.trim() || null,
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
        }})
        haptic.success()
        router.back()
      } else {
        const prod = await createMut.mutateAsync({
          name: name.trim(),
          price: priceNum,
          compare_at_price: compareNum,
          inventory_quantity: invNum,
          track_inventory: trackInventory,
          description: description.trim() || null,
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
        })
        // Upload any locally-picked images, in order, then persist the gallery.
        const localUris = images.filter((u) => !u.startsWith('http'))
        if (localUris.length > 0) {
          try {
            const storeId = store?.id ?? storeSlug
            const urls: string[] = []
            for (let i = 0; i < localUris.length; i++) {
              urls.push(await client.uploadImage(localUris[i], 'product-images', `${storeId}/${prod.id}/${i}`))
            }
            await client.updateProduct(storeSlug, prod.id, { images: urls, is_active: isActive })
          } catch {
            // Image upload failure is non-fatal — the product was still created.
          }
        } else if (!isActive) {
          // No images but the user toggled the product off — persist that.
          try { await client.updateProduct(storeSlug, prod.id, { is_active: isActive }) } catch {}
        }
        await qc.invalidateQueries({ queryKey: queryKeys.products(storeSlug) })
        haptic.success()
        router.back()
      }
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  // The parent is a headerless Tabs navigator; the layout turns the header ON for
  // this screen, and we set its title + Save action here (kept in sync with state).
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Edit product' : 'New product',
      headerRight: () => (
        <Pressable onPress={onSave} disabled={!canSave || saving} hitSlop={12} style={{ paddingHorizontal: 4 }}>
          <Text style={[t.type.labelLarge, { color: canSave && !saving ? t.colors.primary : t.colors.onSurfaceVariant }]}>
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </Pressable>
      ),
    })
    // onSave closes over current form state; re-set when those change.
  }, [navigation, isEdit, canSave, saving, t, onSave])

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: t.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Images — horizontal strip; tap a tile's ✕ to remove, last tile adds. */}
        <View style={styles.section}>
          <Text style={[t.type.labelLarge, styles.sectionLabel, { color: t.colors.onSurfaceVariant }]}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageStrip} keyboardShouldPersistTaps="handled">
            {images.map((uri) => (
              <View key={uri} style={[styles.imageTile, { backgroundColor: t.colors.surfaceContainerHigh }]}>
                <Image source={{ uri }} style={styles.imageTileImg} contentFit="cover" />
                <Pressable onPress={() => onRemoveImage(uri)} hitSlop={8} style={[styles.removeBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={onPickImage} disabled={uploadingImage} style={[styles.addTile, { borderColor: t.colors.outlineVariant, backgroundColor: t.colors.surfaceContainerLow }]}>
              <Ionicons name={uploadingImage ? 'hourglass-outline' : 'camera-outline'} size={22} color={t.colors.onSurfaceVariant} />
              <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>
                {uploadingImage ? 'Uploading…' : 'Add'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>

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
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Optional — shown on the product page"
            multiline
            numberOfLines={4}
            autoCapitalize="sentences"
            returnKeyType="default"
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
              returnKeyType="next"
            />
          )}
          <Field
            label="SKU"
            value={sku}
            onChangeText={setSku}
            placeholder="Optional — your stock-keeping code"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="next"
          />
          <Field
            label="Barcode"
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Optional — UPC / EAN"
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="default"
            returnKeyType="done"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: t.colors.outlineVariant }]} />

        {/* Availability */}
        <View style={styles.section}>
          <Text style={[t.type.labelLarge, styles.sectionLabel, { color: t.colors.onSurfaceVariant }]}>Availability</Text>
          <View style={[styles.toggleRow, { backgroundColor: t.colors.surfaceContainerLow, borderRadius: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>Active</Text>
              <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
                {isActive ? 'Visible in your store' : 'Hidden — customers can’t see or buy it'}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ true: t.colors.primary }}
              thumbColor={isActive ? t.colors.onPrimary : t.colors.outline}
            />
          </View>
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
  imageStrip: { flexDirection: 'row', gap: 12, paddingVertical: 2 },
  imageTile: { width: 88, height: 88, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  imageTileImg: { width: 88, height: 88 },
  removeBtn: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  addTile: { width: 88, height: 88, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  section: { gap: 12 },
  sectionLabel: { letterSpacing: 0.5, marginBottom: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
})