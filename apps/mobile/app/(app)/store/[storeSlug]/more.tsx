// More tab — store settings sections (native + web deep-links) + danger zone.
// Native: Branding · Manual M-Pesa · Analytics. Web (manage-on-web): Auto-payments
// · Domain · Members · Design editor. Danger zone uses type-to-confirm delete.
import * as React from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import { useAuth } from '@/auth/AuthContext'
import { api, type StoreHub } from '@/lib/api'
import { Body, Card, ConfirmDelete, Skeleton } from '@/components/ui'
import { useStore } from '@/store/StoreContext'
import { config } from '@/lib/config'
import { useTheme, type Theme } from '@/lib/theme'

type Row = { key: string; label: string; desc: string; icon: React.ComponentProps<typeof Ionicons>['name']; manageOnly?: boolean }

const NATIVE: Row[] = [
  { key: 'branding', label: 'Branding', desc: 'Name, logo, description', icon: 'color-palette-outline', manageOnly: true },
  { key: 'mpesa', label: 'Manual M-Pesa', desc: 'Till / paybill setup', icon: 'cash-outline', manageOnly: true },
  { key: 'analytics', label: 'Analytics', desc: 'Sales at a glance', icon: 'bar-chart-outline' },
]

const WEB: { key: string; label: string; desc: string; icon: React.ComponentProps<typeof Ionicons>['name']; path: (s: StoreHub) => string }[] = [
  { key: 'payments', label: 'Auto payments', desc: 'Paystack, cards, Daraja', icon: 'card-outline', path: (s) => `/org/${s.orgSlug}/${s.slug}/settings/integrations/payments` },
  { key: 'domain', label: 'Custom domain', desc: 'Connect your own URL', icon: 'globe-outline', path: (s) => `/org/${s.orgSlug}/${s.slug}/settings/domain` },
  { key: 'members', label: 'Members', desc: 'Team & roles', icon: 'people-outline', path: (s) => `/org/${s.orgSlug}/${s.slug}/settings/members` },
  { key: 'design', label: 'Design editor', desc: 'Theme & layout', icon: 'brush-outline', path: (s) => `/org/${s.orgSlug}/${s.slug}/settings/appearance` },
]

export default function MoreTab() {
  const t = useTheme()
  const s = React.useMemo(() => styles(t), [t])
  const router = useRouter()
  const { slug, store, loading, error, canManage, refresh } = useStore()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const onDelete = async () => {
    if (!store) return
    setDeleting(true)
    try {
      await client.deleteStore(store.slug, store.name)
      setConfirmOpen(false)
      router.back()
    } catch (e) {
      Alert.alert('Could not delete', e instanceof Error ? e.message : 'Error')
    } finally {
      setDeleting(false)
    }
  }

  const nativeVisible = NATIVE.filter((r) => !r.manageOnly || canManage)

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: t.colors.background }]} edges={['top']}>
      <View style={s.topbar}>
        <Text style={[t.type.headlineSmall, { color: t.colors.onSurface }]}>More</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading && !store ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={64} radius={16} />
            <Skeleton height={64} radius={16} />
            <Skeleton height={64} radius={16} />
          </View>
        ) : error || !store ? (
          <Card><Body variant>{error ?? 'Unavailable'}</Body></Card>
        ) : (
          <>
            <Text style={[t.type.labelLarge, s.label, { color: t.colors.onSurfaceVariant }]}>Manage</Text>
            <Card style={s.group}>
              {nativeVisible.map((r, i) => (
                <SettingsRow
                  key={r.key}
                  t={t}
                  icon={r.icon}
                  label={r.label}
                  desc={r.desc}
                  divider={i < nativeVisible.length - 1}
                  onPress={() => router.push(`/store/${slug}/${r.key}` as never)}
                />
              ))}
            </Card>

            <Text style={[t.type.labelLarge, s.label, { color: t.colors.onSurfaceVariant }]}>Advanced · on the web</Text>
            <Card style={s.group}>
              {WEB.map((w, i) => (
                <SettingsRow
                  key={w.key}
                  t={t}
                  icon={w.icon}
                  label={w.label}
                  desc={w.desc}
                  external
                  divider={i < WEB.length - 1}
                  onPress={() => WebBrowser.openBrowserAsync(`${config.webBaseUrl}${w.path(store)}`)}
                />
              ))}
            </Card>

            {canManage && (
              <>
                <Text style={[t.type.labelLarge, s.label, { color: t.colors.error }]}>Danger zone</Text>
                <Pressable
                  onPress={() => setConfirmOpen(true)}
                  style={({ pressed }) => [s.dangerRow, { borderColor: t.colors.error }, pressed && { backgroundColor: t.colors.errorContainer }]}
                >
                  <Ionicons name="trash-outline" size={20} color={t.colors.error} />
                  <View style={{ flex: 1 }}>
                    <Text style={[t.type.labelLarge, { color: t.colors.error }]}>Delete this store</Text>
                    <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>Permanent — cannot be undone</Text>
                  </View>
                </Pressable>
              </>
            )}

            <View style={{ height: 24 }} />
          </>
        )}
      </ScrollView>

      {store && (
        <ConfirmDelete
          visible={confirmOpen}
          title="Delete store"
          message={`This permanently deletes “${store.name}” and removes it from your workspace. This cannot be undone.`}
          confirmWord={store.name}
          confirmLabel="Delete store"
          loading={deleting}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={onDelete}
        />
      )}
    </SafeAreaView>
  )
}

function SettingsRow({
  t, icon, label, desc, external, divider, onPress,
}: {
  t: Theme
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  desc: string
  external?: boolean
  divider?: boolean
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [rowStyles.row, pressed && { opacity: 0.6 }]}>
      <View style={[rowStyles.icon, { backgroundColor: t.colors.surfaceContainerHigh }]}>
        <Ionicons name={icon} size={20} color={t.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>{label}</Text>
        <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>{desc}</Text>
      </View>
      <Ionicons
        name={external ? 'open-outline' : 'chevron-forward'}
        size={18}
        color={external ? t.colors.primary : t.colors.onSurfaceVariant}
      />
      {divider && <View style={[rowStyles.divider, { backgroundColor: t.colors.outlineVariant }]} />}
    </Pressable>
  )
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, position: 'relative' },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  divider: { position: 'absolute', bottom: 0, left: 52, right: 0, height: StyleSheet.hairlineWidth },
})

const styles = (t: Theme) =>
  StyleSheet.create({
    fill: { flex: 1 },
    topbar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
    scroll: { paddingHorizontal: 20, gap: 6 },
    label: { marginTop: 16, marginBottom: 6, letterSpacing: 0.5 },
    group: { paddingVertical: 2 },
    dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 2 },
  })
