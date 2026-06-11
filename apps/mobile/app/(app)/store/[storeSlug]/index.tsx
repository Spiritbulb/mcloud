// Store hub — single-store landing. Material 3, follows system theme.
//
// Native sections (in-app, per the plan): Products · Orders · Branding · Manual
// M-Pesa · Analytics · Danger zone. Complex flows deep-link to web (like payments):
// Auto-payments · Domain · Members · Design editor.
//
// Native sections route to in-app screens; the danger zone uses a type-to-confirm
// modal so a store can never be deleted by an accidental tap.
import * as React from 'react'
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import { useAuth } from '@/auth/AuthContext'
import { api, type StoreHub } from '@/lib/api'
import { Avatar, Badge, ConfirmDelete, FadeInUp, MetaPill } from '@/components/ui'
import { config } from '@/lib/config'
import { useTheme, type Theme } from '@/lib/theme'

type SectionDef = {
  key: string
  label: string
  desc: string
  glyph: string // simple unicode glyph (no icon font dependency)
  manageOnly?: boolean // requires canManage
}

// Native sections — open in-app (placeholder until their screens land).
const NATIVE: SectionDef[] = [
  { key: 'products', label: 'Products', desc: 'Add & edit items', glyph: '◳' },
  { key: 'orders', label: 'Orders', desc: 'Fulfil & track', glyph: '☑' },
  { key: 'branding', label: 'Branding', desc: 'Name, logo, colours', glyph: '✦', manageOnly: true },
  { key: 'mpesa', label: 'Manual M-Pesa', desc: 'Till / paybill setup', glyph: '⛁', manageOnly: true },
  { key: 'analytics', label: 'Analytics', desc: 'Sales at a glance', glyph: '◴' },
]

// Web deep-links — open apps/web (the "manage on web" pattern).
const WEB: { key: string; label: string; desc: string; glyph: string; path: (s: StoreHub) => string }[] = [
  { key: 'payments', label: 'Auto payments', desc: 'Paystack, cards', glyph: '⮂', path: (s) => `/org/${s.orgSlug}/${s.slug}/settings/integrations/payments` },
  { key: 'domain', label: 'Custom domain', desc: 'Connect your URL', glyph: '⚿', path: (s) => `/org/${s.orgSlug}/${s.slug}/settings/domain` },
  { key: 'members', label: 'Members', desc: 'Team & roles', glyph: '⚇', path: (s) => `/org/${s.orgSlug}/${s.slug}/settings/members` },
  { key: 'design', label: 'Design editor', desc: 'Theme & layout', glyph: '❖', path: (s) => `/org/${s.orgSlug}/${s.slug}/settings/appearance` },
]

export default function StoreHubScreen() {
  const t = useTheme()
  const s = styles(t)
  const { storeSlug } = useLocalSearchParams<{ storeSlug: string }>()
  const { authedFetch } = useAuth()
  const router = useRouter()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [store, setStore] = React.useState<StoreHub | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const onDelete = async () => {
    if (!store) return
    setDeleting(true)
    try {
      await client.deleteStore(store.slug, store.name)
      setConfirmOpen(false)
      router.back() // back to the picker; it refreshes on focus
    } catch (e) {
      Alert.alert('Could not delete', e instanceof Error ? e.message : 'Error')
    } finally {
      setDeleting(false)
    }
  }

  const load = React.useCallback(async () => {
    setError(null)
    try {
      setStore(await client.getStoreHub(storeSlug))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [client, storeSlug])

  React.useEffect(() => {
    load()
  }, [load])

  const onRefresh = React.useCallback(() => {
    setRefreshing(true)
    load()
  }, [load])

  const canManage = store?.canManage ?? false
  const nativeVisible = NATIVE.filter((sec) => !sec.manageOnly || canManage)

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: t.colors.background }]} edges={[]}>
      <Stack.Screen options={{ title: store?.name ?? 'Store' }} />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />
        }
      >
        {loading && !store ? (
          <View style={{ paddingVertical: 64, alignItems: 'center' }}>
            <ActivityIndicator color={t.colors.primary} />
          </View>
        ) : error || !store ? (
          <View style={[s.notice, { backgroundColor: t.colors.errorContainer }]}>
            <Text style={[t.type.bodyMedium, { color: t.colors.onErrorContainer }]}>
              {error ?? 'Store unavailable'}
            </Text>
          </View>
        ) : (
          <>
            {/* Store header */}
            <FadeInUp delay={0}>
              <View style={[s.header, { backgroundColor: t.colors.primaryContainer }]}>
                <Avatar name={store.name} uri={store.logo_url} size={64} radius={20} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[t.type.headlineSmall, { color: t.colors.onPrimaryContainer }]} numberOfLines={1}>
                    {store.name}
                  </Text>
                  <Text style={[t.type.bodyMedium, { color: t.colors.onPrimaryContainer, opacity: 0.85 }]} numberOfLines={1}>
                    {store.custom_domain ? store.custom_domain : `menengai.cloud/s/${store.slug}`}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <MetaPill label={store.role} />
                    {store.is_pro && <Badge label="PRO" tone="primary" />}
                  </View>
                </View>
              </View>
            </FadeInUp>

            {/* Native sections */}
            <Text style={[t.type.labelLarge, s.sectionLabel, { color: t.colors.onSurfaceVariant }]}>Manage</Text>
            <View style={s.grid}>
              {nativeVisible.map((sec, i) => (
                <FadeInUp key={sec.key} delay={60 + i * 40} style={s.gridItem}>
                  <SectionCard
                    t={t}
                    glyph={sec.glyph}
                    label={sec.label}
                    desc={sec.desc}
                    onPress={() => router.push(`/store/${store.slug}/${sec.key}` as never)}
                  />
                </FadeInUp>
              ))}
            </View>

            {/* Danger zone (native, manage only) */}
            {canManage && (
              <FadeInUp delay={260}>
                <Pressable
                  onPress={() => setConfirmOpen(true)}
                  style={({ pressed }) => [
                    s.dangerRow,
                    { borderColor: t.colors.error },
                    pressed && { backgroundColor: t.colors.errorContainer },
                  ]}
                >
                  <Text style={{ fontSize: 18, color: t.colors.error }}>⚠</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.type.labelLarge, { color: t.colors.error }]}>Danger zone</Text>
                    <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
                      Delete this store
                    </Text>
                  </View>
                </Pressable>
              </FadeInUp>
            )}

            {/* Web deep-links */}
            <Text style={[t.type.labelLarge, s.sectionLabel, { color: t.colors.onSurfaceVariant }]}>
              Advanced · on the web
            </Text>
            <View style={s.webStack}>
              {WEB.map((w, i) => (
                <FadeInUp key={w.key} delay={300 + i * 40}>
                  <Pressable
                    onPress={() => WebBrowser.openBrowserAsync(`${config.webBaseUrl}${w.path(store)}`)}
                    style={({ pressed }) => [
                      s.webRow,
                      { backgroundColor: t.colors.surfaceContainerLow, borderColor: t.colors.outlineVariant },
                      pressed && { backgroundColor: t.colors.surfaceContainerHigh },
                    ]}
                  >
                    <Text style={[s.webGlyph, { color: t.colors.primary }]}>{w.glyph}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>{w.label}</Text>
                      <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>{w.desc}</Text>
                    </View>
                    <Text style={{ color: t.colors.primary, fontSize: 16 }}>↗</Text>
                  </Pressable>
                </FadeInUp>
              ))}
            </View>

            <View style={{ height: 32 }} />
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

function SectionCard({
  t, glyph, label, desc, onPress,
}: {
  t: Theme; glyph: string; label: string; desc: string; onPress: () => void
}) {
  const s = styles(t)
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { backgroundColor: t.colors.surfaceContainer },
        pressed && { backgroundColor: t.colors.surfaceContainerHigh },
      ]}
    >
      <View style={[s.cardGlyphWrap, { backgroundColor: t.colors.surface }]}>
        <Text style={[s.cardGlyph, { color: t.colors.primary }]}>{glyph}</Text>
      </View>
      <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>{label}</Text>
      <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]} numberOfLines={1}>
        {desc}
      </Text>
    </Pressable>
  )
}

const styles = (t: Theme) =>
  StyleSheet.create({
    fill: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    notice: { alignSelf: 'stretch', borderRadius: 16, padding: 16 },
    header: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      padding: 20,
      borderRadius: 28,
    },
    sectionLabel: { marginTop: 12, marginBottom: -2, letterSpacing: 0.5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignSelf: 'stretch' },
    gridItem: { width: '47.5%' },
    card: {
      borderRadius: 20,
      padding: 16,
      gap: 8,
      minHeight: 116,
      justifyContent: 'flex-start',
    },
    cardGlyphWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    cardGlyph: { fontSize: 20 },
    dangerRow: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
    },
    webStack: { gap: 12, alignSelf: 'stretch' },
    webRow: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
    },
    webGlyph: { fontSize: 20, width: 28, textAlign: 'center' },
  })
