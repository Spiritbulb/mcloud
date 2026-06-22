// Pro subscription bottom sheet. Shows the Pro plan + live Play price and runs the
// native purchase via useProIap(). Acknowledgement/grant happen inside useProIap;
// here we just drive the UI and call onSuccess once the store is Pro.
import * as React from 'react'
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '@/components/ui'
import { useTheme } from '@/lib/theme'
import { useProIap } from '@/lib/iap'

const FEATURES = [
  'Custom domain (bring your own)',
  'Advanced analytics & funnel data',
  'Remove Menengai Cloud branding',
  'Priority support',
  'Blog & content pages',
]

export function ProSheet({
  visible,
  slug,
  onClose,
  onSuccess,
}: {
  visible: boolean
  slug: string
  onClose: () => void
  onSuccess: () => void
}) {
  const t = useTheme()
  const { proProduct, purchasePro, loading, error } = useProIap()

  const onSubscribe = async () => {
    try {
      const r = await purchasePro(slug)
      if (r.pro) {
        onSuccess()
        onClose()
      }
      // r.pro === false → user cancelled the Play sheet; stay open, no error.
    } catch {
      // error state is surfaced via the hook's `error`; nothing else to do.
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: t.colors.surfaceContainerHigh }]}>
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: t.colors.primaryContainer }]}>
              <Ionicons name="diamond-outline" size={22} color={t.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.titleLarge, { color: t.colors.onSurface }]}>Menengai Cloud Pro</Text>
              <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
                {proProduct ? `${proProduct.displayPrice} / month` : 'Subscribe to unlock everything'}
              </Text>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 12 }}>
              {FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={t.colors.primary} />
                  <Text style={[t.type.bodyMedium, { color: t.colors.onSurface, flex: 1 }]}>{f}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {error && (
            <Text style={[t.type.bodySmall, { color: t.colors.error }]}>{error}</Text>
          )}

          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button label="Not now" variant="text" onPress={onClose} disabled={loading} />
            </View>
            <View style={{ flex: 1.4 }}>
              <Button label="Subscribe" variant="filled" onPress={onSubscribe} loading={loading} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
})
