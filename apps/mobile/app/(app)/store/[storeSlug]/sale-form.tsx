// New Sale — manual order entry. Lets a merchant record a cash/in-person sale.
// Picks products from catalogue, sets quantities, records customer contact optionally.
import * as React from 'react'
import {
  Alert, FlatList, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native'
import { Image } from 'expo-image'
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/AuthContext'
import { api, type Product } from '@/lib/api'
import { useStore } from '@/store/StoreContext'
import { Avatar, Button, Field } from '@/components/ui'
import { useTheme, type Theme } from '@/lib/theme'

type LineItem = { product: Product; quantity: number }

export default function SaleFormScreen() {
  const t = useTheme()
  const s = React.useMemo(() => styles(t), [t])
  const router = useRouter()
  const { slug: storeSlug } = useStore()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [products, setProducts] = React.useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = React.useState(true)
  const [lines, setLines] = React.useState<LineItem[]>([])
  const [customerPhone, setCustomerPhone] = React.useState('')
  const [customerEmail, setCustomerEmail] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [step, setStep] = React.useState<'pick' | 'confirm'>('pick')

  React.useEffect(() => {
    client.listProducts(storeSlug)
      .then((r) => setProducts(r.products.filter((p) => p.is_active)))
      .catch(() => {})
      .finally(() => setLoadingProducts(false))
  }, [client, storeSlug])

  const addLine = (prod: Product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === prod.id)
      if (existing) return prev.map((l) => l.product.id === prod.id ? { ...l, quantity: l.quantity + 1 } : l)
      return [...prev, { product: prod, quantity: 1 }]
    })
  }

  const removeLine = (productId: string) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === productId)
      if (!existing) return prev
      if (existing.quantity <= 1) return prev.filter((l) => l.product.id !== productId)
      return prev.map((l) => l.product.id === productId ? { ...l, quantity: l.quantity - 1 } : l)
    })
  }

  const total = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0)
  const canConfirm = lines.length > 0

  const onSubmit = async () => {
    if (!canConfirm) return
    setSaving(true)
    try {
      await client.createManualOrder(storeSlug, {
        lines: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity, price: l.product.price })),
        customer_phone: customerPhone.trim() || null,
        customer_email: customerEmail.trim() || null,
      })
      router.back()
    } catch (e) {
      Alert.alert('Could not record sale', e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'confirm') {
    return (
      <KeyboardAvoidingView
        style={[s.fill, { backgroundColor: t.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Stack.Screen options={{ title: 'Confirm sale' }} />
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[t.type.labelLarge, s.sectionLabel, { color: t.colors.onSurfaceVariant }]}>Items</Text>
          {lines.map((l) => (
            <View key={l.product.id} style={[s.confirmRow, { backgroundColor: t.colors.surfaceContainerLow }]}>
              <Text style={[t.type.titleMedium, { color: t.colors.onSurface, flex: 1 }]} numberOfLines={1}>
                {l.quantity > 1 ? `${l.quantity}× ` : ''}{l.product.name}
              </Text>
              <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>
                KES {(l.product.price * l.quantity).toLocaleString()}
              </Text>
            </View>
          ))}

          <View style={[s.totalRow, { borderTopColor: t.colors.outlineVariant }]}>
            <Text style={[t.type.titleLarge, { color: t.colors.onSurface }]}>Total</Text>
            <Text style={[t.type.titleLarge, { color: t.colors.onSurface, fontWeight: '700' }]}>
              KES {total.toLocaleString()}
            </Text>
          </View>

          <Text style={[t.type.labelLarge, s.sectionLabel, { color: t.colors.onSurfaceVariant }]}>Customer (optional)</Text>
          <Field label="Phone" value={customerPhone} onChangeText={setCustomerPhone} placeholder="+254 7XX XXX XXX" keyboardType="phone-pad" returnKeyType="next" />
          <Field label="Email" value={customerEmail} onChangeText={setCustomerEmail} placeholder="customer@email.com" keyboardType="email-address" autoCapitalize="none" returnKeyType="done" />

          <View style={{ height: 24 }} />
          <Button label="Record sale" onPress={onSubmit} loading={saving} variant="filled" />
          <View style={{ height: 8 }} />
          <Button label="Back" onPress={() => setStep('pick')} variant="outlined" />
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // Step: pick products
  return (
    <View style={[s.fill, { backgroundColor: t.colors.background }]}>
      <Stack.Screen options={{ title: 'New sale' }} />
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <Text style={[t.type.labelLarge, s.sectionLabel, { color: t.colors.onSurfaceVariant }]}>
            Tap to add items
          </Text>
        }
        ListEmptyComponent={
          !loadingProducts ? (
            <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant, textAlign: 'center', marginTop: 24 }]}>
              No active products. Add products to your catalogue first.
            </Text>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const line = lines.find((l) => l.product.id === item.id)
          const thumb = item.images?.[0] ?? null
          return (
            <Pressable
              onPress={() => addLine(item)}
              style={({ pressed }) => [s.pickRow, { backgroundColor: t.colors.surfaceContainerLow }, pressed && { opacity: 0.7 }, line && { borderWidth: 1.5, borderColor: t.colors.primary }]}
            >
              <View style={s.thumbWrap}>
                {thumb ? <Image source={{ uri: thumb }} style={s.thumb} contentFit="cover" /> : <Avatar name={item.name} size={44} radius={8} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>KES {item.price.toLocaleString()}</Text>
              </View>
              {line ? (
                <View style={s.qtyRow}>
                  <Pressable onPress={() => removeLine(item.id)} hitSlop={8} style={[s.qtyBtn, { backgroundColor: t.colors.surfaceContainerHigh }]}>
                    <Ionicons name="remove" size={16} color={t.colors.onSurface} />
                  </Pressable>
                  <Text style={[t.type.titleMedium, { color: t.colors.onSurface, minWidth: 20, textAlign: 'center' }]}>{line.quantity}</Text>
                  <Pressable onPress={() => addLine(item)} hitSlop={8} style={[s.qtyBtn, { backgroundColor: t.colors.primary }]}>
                    <Ionicons name="add" size={16} color={t.colors.onPrimary} />
                  </Pressable>
                </View>
              ) : (
                <View style={[s.qtyBtn, { backgroundColor: t.colors.surfaceContainerHigh }]}>
                  <Ionicons name="add" size={16} color={t.colors.onSurface} />
                </View>
              )}
            </Pressable>
          )
        }}
      />

      {lines.length > 0 && (
        <View style={[s.footer, { backgroundColor: t.colors.surface, borderTopColor: t.colors.outlineVariant }]}>
          <View style={{ flex: 1 }}>
            <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>
              {lines.reduce((n, l) => n + l.quantity, 0)} item{lines.reduce((n, l) => n + l.quantity, 0) !== 1 ? 's' : ''}
            </Text>
            <Text style={[t.type.titleLarge, { color: t.colors.onSurface, fontWeight: '700' }]}>
              KES {total.toLocaleString()}
            </Text>
          </View>
          <Button label="Confirm →" onPress={() => setStep('confirm')} variant="filled" />
        </View>
      )}
    </View>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  fill: { flex: 1 },
  scroll: { padding: 20 },
  sectionLabel: { letterSpacing: 0.5, marginBottom: 8 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12 },
  thumbWrap: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden' },
  thumb: { width: 44, height: 44 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, marginBottom: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
})