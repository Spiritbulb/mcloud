// Main screen — store picker. Expressive Material 3, follows system theme.
//
// Mirrors the web org home model (apps/web/.../org/[orgSlug]/page.tsx):
//   • a welcome hero (greeting + marketing illustration, served from apps/web)
//   • one grouped section per org the user belongs to, listing its stores
//   • an "Other workspaces" group for stores the user owns/admins in orgs they're
//     NOT a member of (web's `otherStores`, from store_members)
//
// Data comes from GET /api/mobile/picker (lib/merchant/orgs getPickerData).
import * as React from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthContext'
import { api, type PickerData, type PickerStore } from '@/lib/api'
import { Avatar, Badge, FadeInUp, MarketingImage, MetaPill, Overline } from '@/components/ui'
import { useTheme, type Theme } from '@/lib/theme'

// ── Screen ──────────────────────────────────────────────────────────────────────

export default function PickerScreen() {
  const t = useTheme()
  const s = styles(t)
  const router = useRouter()
  const { user, signOut, authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [data, setData] = React.useState<PickerData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setError(null)
    try {
      setData(await client.getPicker())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [client])

  React.useEffect(() => {
    load()
  }, [load])

  const onRefresh = React.useCallback(() => {
    setRefreshing(true)
    load()
  }, [load])

  const orgs = data?.orgs ?? []
  const otherStores = data?.otherStores ?? []
  const firstName = (user?.name ?? user?.email ?? 'there').split(' ')[0].split('@')[0]
  const totalStores = orgs.reduce((n, o) => n + o.stores.length, 0) + otherStores.length
  let order = 0 // running index for staggered entrance

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: t.colors.background }]} edges={['top']}>
      {/* Top app bar */}
      <View style={s.appbar}>
        <View style={{ flex: 1 }}>
          
          <Text style={[t.type.headlineSmall, { color: t.colors.onSurface }]}>Hi, {firstName}</Text>
        </View>
        <Pressable
          onPress={signOut}
          hitSlop={10}
          style={({ pressed }) => [s.avatarBtn, pressed && { opacity: 0.7 }]}
        >
          <Avatar name={user?.name ?? user?.email ?? '?'} uri={user?.avatarUrl} size={42} radius={21} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />
        }
      >
        {/* Hero */}
        <FadeInUp delay={0}>
          <View style={s.hero}>
            <View style={s.heroText}>
              <Text style={[t.type.titleLarge, { color: t.colors.onPrimaryContainer }]}>
                {totalStores > 0 ? `${totalStores} stores, one tap away` : 'Let’s get you online'}
              </Text>
              <Text style={[t.type.bodyMedium, { color: t.colors.onPrimaryContainer, opacity: 0.85 }]}>
                Hosting, SSL and uptime are handled. You focus on selling.
              </Text>
            </View>
            <MarketingImage name="marketing-make-it-yours.png" width={104} height={104} opacity={0.95} />
          </View>
        </FadeInUp>

        {/* Loading / error / empty */}
        {loading && !data ? (
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <ActivityIndicator color={t.colors.primary} />
          </View>
        ) : error ? (
          <View style={[s.notice, { backgroundColor: t.colors.errorContainer }]}>
            <Text style={[t.type.bodyMedium, { color: t.colors.onErrorContainer }]}>{error}</Text>
          </View>
        ) : orgs.length === 0 && otherStores.length === 0 ? (
          <View style={[s.notice, { backgroundColor: t.colors.surfaceContainer }]}>
            <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
              No workspaces yet. Create one on the web to get started.
            </Text>
          </View>
        ) : null}

        {/* Stats strip */}
        {!loading && (orgs.length > 0 || otherStores.length > 0) && (
          <FadeInUp delay={60}>
            <View style={s.stats}>
              <Stat t={t} value={String(totalStores)} label="Stores" />
              <Stat t={t} value={String(orgs.length)} label="Workspaces" />
              <Stat
                t={t}
                value={orgs.some((o) => o.stores.some((x) => x.is_pro)) ? 'Pro' : 'Free'}
                label="Plan"
              />
            </View>
          </FadeInUp>
        )}

        {/* Org groups */}
        {orgs.map((org) => (
          <View key={org.id} style={s.group}>
            <FadeInUp delay={100 + order++ * 50}>
              <Pressable
                onPress={() => router.push({ pathname: '/(app)/org/[orgSlug]', params: { orgSlug: org.slug } })}
                style={({ pressed }) => [s.groupHeader, pressed && { opacity: 0.65 }]}
              >
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[t.type.titleLarge, { color: t.colors.onSurface }]}>{org.name}</Text>
                  <MetaPill label={`${org.role} · ${org.stores.length} ${org.stores.length === 1 ? 'store' : 'stores'}`} />
                </View>
                <Text style={[s.chevron, { color: t.colors.onSurfaceVariant }]}>›</Text>
              </Pressable>
            </FadeInUp>

            <View style={s.cardStack}>
              {org.stores.map((st) => (
                <FadeInUp key={st.id} delay={100 + order++ * 50}>
                  <StoreCard
                    t={t}
                    store={st}
                    onPress={() => router.push(`/store/${st.slug}` as never)}
                  />
                </FadeInUp>
              ))}

              {org.canManage && (
                <FadeInUp delay={100 + order++ * 50}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/(app)/org/[orgSlug]', params: { orgSlug: org.slug } })}
                    style={({ pressed }) => [s.addStore, pressed && { backgroundColor: t.colors.surfaceContainerLow }]}
                  >
                    <Text style={[t.type.labelLarge, { color: t.colors.primary }]}>+  New store</Text>
                  </Pressable>
                </FadeInUp>
              )}
            </View>
          </View>
        ))}

        {/* Other workspaces */}
        {otherStores.length > 0 && (
          <View style={s.group}>
            <FadeInUp delay={100 + order++ * 50}>
              <View style={{ gap: 4 }}>
                <Text style={[t.type.titleMedium, { color: t.colors.onSurfaceVariant }]}>Other workspaces</Text>
                <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
                  Stores you manage elsewhere
                </Text>
              </View>
            </FadeInUp>
            <View style={s.cardStack}>
              {otherStores.map((st) => (
                <FadeInUp key={st.id} delay={100 + order++ * 50}>
                  <StoreCard
                    t={t}
                    store={st}
                    subtitle={'Other workspace'}
                    external
                    onPress={() => router.push(`/store/${st.slug}` as never)}
                  />
                </FadeInUp>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Pieces ──────────────────────────────────────────────────────────────────────

function Stat({ t, value, label }: { t: Theme; value: string; label: string }) {
  return (
    <View style={[statStyles.box, { backgroundColor: t.colors.surfaceContainer }]}>
      <Text style={[t.type.titleLarge, { color: t.colors.onSurface }]}>{value}</Text>
      <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  )
}

function StoreCard({
  t, store, subtitle, external, onPress,
}: {
  t: Theme; store: PickerStore; subtitle?: string; external?: boolean; onPress: () => void
}) {
  const s = styles(t)
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.storeCard,
        { backgroundColor: t.colors.surfaceContainerLow, borderColor: t.colors.outlineVariant },
        pressed && { backgroundColor: t.colors.surfaceContainerHigh },
      ]}
    >
      {/* Leading accent rail */}
      <View style={[s.accent, { backgroundColor: store.is_pro ? t.colors.primary : t.colors.outlineVariant }]} />
      <Avatar name={store.name} uri={store.logo_url} size={48} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]} numberOfLines={1}>
          {store.name}
        </Text>
        <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]} numberOfLines={1}>
          {subtitle ?? `/${store.slug}`}
        </Text>
      </View>
      {external ? (
        <Text style={{ color: t.colors.onSurfaceVariant, opacity: 0.5, fontSize: 18 }}>↗</Text>
      ) : store.is_pro ? (
        <Badge label="PRO" tone="primary" />
      ) : null}
    </Pressable>
  )
}

// ── Styles (theme-aware factory) ────────────────────────────────────────────────

const statStyles = StyleSheet.create({
  box: { flex: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, gap: 2 },
})

const styles = (t: Theme) =>
  StyleSheet.create({
    fill: { flex: 1 },
    appbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 },
    avatarBtn: { borderRadius: 9999 },
    scroll: { paddingHorizontal: 20, paddingTop: 4, gap: 24, alignItems: 'stretch' },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.primaryContainer,
      borderRadius: 28,
      padding: 20,
      overflow: 'hidden',
      gap: 12,
    },
    heroText: { flex: 1, gap: 6 },
    stats: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
    group: { gap: 14, alignSelf: 'stretch' },
    notice: { alignSelf: 'stretch', borderRadius: 16, padding: 16 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chevron: { fontSize: 24, fontWeight: '300' },
    cardStack: { gap: 12, alignSelf: 'stretch' },
    storeCard: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingRight: 16,
      paddingLeft: 18,
      borderRadius: 20,
      borderWidth: 1,
      overflow: 'hidden',
    },
    accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
    addStore: {
      height: 50,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
