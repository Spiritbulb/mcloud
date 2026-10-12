// Upgrade sheet. Plans are bought on the web, through the organisation's Billing page
// (paid from the org wallet); there is no in-app purchase. This lists the tiers and sends
// the user there.
import * as React from 'react'
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '@/components/ui'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/auth/AuthContext'

// Mirrors PLAN_PRICE_KES / PLAN_LIMITS in packages/merchant/src/plans.ts (the web app is the
// source of truth; the mobile app cannot import it).
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

function TierCard({ title, price, features }: { title: string; price: string; features: string[] }) {
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
    </View>
  )
}

export function ProSheet({
  visible,
  orgSlug,
  onClose,
}: {
  visible: boolean
  /** The store's organisation; plans are managed at /org/{orgSlug}/billing on the web. */
  orgSlug: string | null
  onClose: () => void
}) {
  const t = useTheme()
  const { openOnWeb } = useAuth()

  const openBilling = () => {
    if (!orgSlug) return
    openOnWeb(`/org/${orgSlug}/billing`)
    onClose()
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
                Plans are managed from your organisation's Billing page
              </Text>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 14 }}>
              <TierCard title="Hobby" price="KES 795 / month" features={HOBBY_FEATURES} />
              <TierCard title="Pro" price="KES 2,795 / month" features={PRO_FEATURES} />
            </View>
          </ScrollView>

          <Button label="Open Billing on the web" variant="filled" onPress={openBilling} disabled={!orgSlug} />
          <Button label="Not now" variant="text" onPress={onClose} />
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
})
