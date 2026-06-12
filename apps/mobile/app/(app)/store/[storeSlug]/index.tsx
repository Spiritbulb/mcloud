// Overview tab — store header, status, quick actions. Material 3, system theme.
// Data comes from the shared StoreProvider (loaded once for all tabs).
import * as React from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Avatar, Badge, Body, Card, FadeInUp, MetaPill, Skeleton } from '@/components/ui'
import { useStore } from '@/store/StoreContext'
import { useTheme, type Theme } from '@/lib/theme'

export default function OverviewTab() {
  const t = useTheme()
  const s = React.useMemo(() => styles(t), [t])
  const router = useRouter()
  const { slug, store, loading, error, refresh } = useStore()
  const [refreshing, setRefreshing] = React.useState(false)

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: t.colors.background }]} edges={['top']}>
      {/* Back to picker */}
      <View style={s.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Ionicons name="chevron-back" size={26} color={t.colors.onSurface} />
        </Pressable>
        <Text style={[t.type.labelLarge, { color: t.colors.onSurfaceVariant }]}>Store</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />}
      >
        {loading && !store ? (
          <View style={{ gap: 16 }}>
            <Skeleton height={120} radius={28} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Skeleton height={88} radius={20} style={{ flex: 1 }} />
              <Skeleton height={88} radius={20} style={{ flex: 1 }} />
            </View>
          </View>
        ) : error || !store ? (
          <Card><Body variant>{error ?? 'Store unavailable'}</Body></Card>
        ) : (
          <>
            {/* Header */}
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

            {/* Quick actions */}
            <FadeInUp delay={80}>
              <Text style={[t.type.labelLarge, s.sectionLabel, { color: t.colors.onSurfaceVariant }]}>Quick actions</Text>
              <View style={s.actionRow}>
                <ActionTile t={t} icon="add-circle-outline" label="Add product" onPress={() => router.push(`/store/${slug}/products` as never)} />
                <ActionTile t={t} icon="receipt-outline" label="View orders" onPress={() => router.push(`/store/${slug}/orders` as never)} />
              </View>
              <View style={s.actionRow}>
                <ActionTile t={t} icon="bar-chart-outline" label="Analytics" onPress={() => router.push(`/store/${slug}/analytics` as never)} />
                <ActionTile t={t} icon="open-outline" label="View store" onPress={() => router.push(`/store/${slug}/more` as never)} />
              </View>
            </FadeInUp>

            <View style={{ height: 24 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function ActionTile({
  t, icon, label, onPress,
}: {
  t: Theme; icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        actionStyles.tile,
        { backgroundColor: pressed ? t.colors.surfaceContainerHigh : t.colors.surfaceContainer },
      ]}
    >
      <View style={[actionStyles.iconWrap, { backgroundColor: t.colors.surface }]}>
        <Ionicons name={icon} size={22} color={t.colors.primary} />
      </View>
      <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>{label}</Text>
    </Pressable>
  )
}

const actionStyles = StyleSheet.create({
  tile: { flex: 1, borderRadius: 20, padding: 16, gap: 10, minHeight: 96, justifyContent: 'space-between' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
})

const styles = (t: Theme) =>
  StyleSheet.create({
    fill: { flex: 1 },
    topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44 },
    scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
    header: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 28 },
    sectionLabel: { marginTop: 12, marginBottom: 4, letterSpacing: 0.5 },
    actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  })
