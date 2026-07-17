// Hobby/Pro subscription bottom sheet. Shows both plans + their live Play prices and
// runs the native purchase via useProIap(). Acknowledgement/grant happen inside
// useProIap; here we just drive the UI and call onSuccess once the store is upgraded.
import * as React from 'react'
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '@/components/ui'
import { useTheme } from '@/lib/theme'
import { useProIap } from '@/lib/iap'

const HOBBY_FEATURES = [
  '200 products',
  '3 team members',
  'Custom domain',
  'Advanced analytics',
  'Blog and content pages',
]

const PRO_FEATURES = [
  'Unlimited products',
  '10 team members',
  'Everything in Hobby',
  'Remove branding',
  'Priority support',
]

function TierCard({
  title,
  price,
  features,
  onSubscribe,
  loading,
}: {
  title: string
  price: string
  features: string[]
  onSubscribe: () => void
  loading: boolean
}) {
  const t = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: t.colors.surfaceContainer, borderColor: t.colors.outlineVariant }]}>
      <View style={styles.cardHeader}>
        <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>{title}</Text>
        <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>{price}</Text>
      </View>

      <View style={{ gap: 10 }}>
        {features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color={t.colors.primary} />
            <Text style={[t.type.bodyMedium, { color: t.colors.onSurface, flex: 1 }]}>{f}</Text>
          </View>
        ))}
      </View>

      <Button label="Subscribe" variant="filled" onPress={onSubscribe} loading={loading} />
    </View>
  )
}

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
  const { hobbyProduct, proProduct, purchase, loading, error } = useProIap()

  const onSubscribe = async (tier: 'hobby' | 'pro') => {
    try {
      const r = await purchase(slug, tier)
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
              <Text style={[t.type.titleLarge, { color: t.colors.onSurface }]}>Upgrade Menengai Cloud</Text>
              <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
                Choose the plan that fits your store
              </Text>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 14 }}>
              <TierCard
                title="Hobby"
                price={hobbyProduct ? `${hobbyProduct.displayPrice} / month` : 'Loading price'}
                features={HOBBY_FEATURES}
                onSubscribe={() => onSubscribe('hobby')}
                loading={loading}
              />
              <TierCard
                title="Pro"
                price={proProduct ? `${proProduct.displayPrice} / month` : 'Loading price'}
                features={PRO_FEATURES}
                onSubscribe={() => onSubscribe('pro')}
                loading={loading}
              />
            </View>
          </ScrollView>

          {error && (
            <View style={[styles.notice, { backgroundColor: t.colors.errorContainer }]}>
              <Ionicons name="alert-circle-outline" size={18} color={t.colors.error} style={{ marginTop: 1 }} />
              <Text style={[t.type.bodySmall, { color: t.colors.onErrorContainer, flex: 1 }]} selectable>
                {error}
              </Text>
            </View>
          )}

          <Button label="Not now" variant="text" onPress={onClose} disabled={loading} />
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
  card: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 14 },
  cardHeader: { gap: 2 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notice: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14 },
})
