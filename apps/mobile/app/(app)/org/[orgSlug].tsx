// Stores in an org + create-store form. Real API calls
// (GET/POST /api/mobile/orgs/[orgSlug]/stores) — same rules as the web action.
// Slug is auto-derived and shown read-only (never editable), per the product rule.
// Material 3, follows system theme.
import * as React from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/AuthContext'
import { api, type Store } from '@/lib/api'
import { Avatar, Body, Button, Card, Field, Overline, SkeletonCard } from '@/components/ui'
import { useTheme } from '@/lib/theme'


function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function roleLabel(role: string) {
  if (!role) return ''
  return role.charAt(0).toUpperCase() + role.slice(1)
}


export default function OrgStoresScreen() {
  const t = useTheme()
  const { orgSlug } = useLocalSearchParams<{ orgSlug: string }>()
  const { authedFetch } = useAuth()
  const router = useRouter()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])


  const [stores, setStores] = React.useState<Store[]>([])
  const [role, setRole] = React.useState<string>('')
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const hasData = React.useRef(false)


  const [name, setName] = React.useState('')
  const [creating, setCreating] = React.useState(false)
  const slug = slugify(name)
  const canManage = role === 'owner' || role === 'admin'
  const proCount = stores.filter((s) => s.is_pro).length


  const load = React.useCallback(async () => {
    setError(null)
    try {
      const data = await client.listStores(orgSlug)
      setStores(data.stores)
      setRole(data.role)
      hasData.current = true
    } catch (e) {
      if (!hasData.current) setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [client, orgSlug])


  React.useEffect(() => {
    load()
  }, [load])


  const onRefresh = React.useCallback(() => {
    setRefreshing(true)
    load()
  }, [load])


  const onCreate = async () => {
    if (!name.trim() || !slug) return
    setCreating(true)
    try {
      await client.createStore(orgSlug, { name: name.trim(), slug })
      setName('')
      await load()
    } catch (e) {
      Alert.alert('Could not create store', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setCreating(false)
    }
  }


  return (
    <FlatList
      style={[styles.fill, { backgroundColor: t.colors.background }]}
      contentContainerStyle={styles.list}
      data={stores}
      keyExtractor={(s) => s.id}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />
      }
      ListHeaderComponent={
        <View style={{ gap: t.space(4), marginBottom: t.space(4) }}>
          <Stack.Screen options={{ title: orgSlug }} />

          <View style={{ gap: t.space(1) }}>
            <Overline>Stores</Overline>
            <Text style={[t.type.headlineSmall, { color: t.colors.onSurface }]}>{orgSlug}</Text>
          </View>

          {!!role && (stores.length > 0 || !loading) && (
            <View style={styles.metaRow}>
              <View style={[styles.metaPill, { backgroundColor: t.colors.surfaceContainer }]}>
                <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>
                  You're the {roleLabel(role)}
                </Text>
              </View>
              {stores.length > 0 && (
                <View style={[styles.metaPill, { backgroundColor: t.colors.surfaceContainer }]}>
                  <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>
                    {stores.length} {stores.length === 1 ? 'store' : 'stores'}
                    {proCount > 0 ? ` · ${proCount} Pro` : ''}
                  </Text>
                </View>
              )}
            </View>
          )}

          {canManage && (
            <Card tonal style={{ gap: t.space(3) }}>
              <View style={{ gap: t.space(1) }}>
                <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>Open a new store</Text>
                <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
                  Give it a name, we'll handle the rest.
                </Text>
              </View>
              <Field
                label="Store name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Loc'd by Naya"
                autoCapitalize="words"
                helper={slug ? `Your link will be: /store/${slug}` : undefined}
              />
              <Button label="Create store" onPress={onCreate} loading={creating} disabled={!slug} />
            </Card>
          )}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <View style={{ gap: t.space(3) }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <Card style={{ alignItems: 'center', gap: t.space(2), paddingVertical: t.space(6) }}>
            {error ? (
              <>
                <Text style={[t.type.displaySmall, { color: t.colors.onSurface, textAlign: 'center' }]}>
                  Couldn't load stores
                </Text>
                <Body variant>{error}</Body>
                <Pressable
                  onPress={load}
                  accessibilityRole="button"
                  accessibilityLabel="Try again"
                  style={({ pressed }) => [
                    styles.retryBtn,
                    { backgroundColor: t.colors.primaryContainer },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Ionicons name="refresh" size={16} color={t.colors.onPrimaryContainer} />
                  <Text style={[t.type.labelLarge, { color: t.colors.onPrimaryContainer }]}>Try again</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[t.type.displaySmall, { color: t.colors.onSurface, textAlign: 'center' }]}>
                  No stores here yet
                </Text>
                <Body variant>
                  {canManage
                    ? 'Use the form above to open your first store in this workspace.'
                    : 'Ask an owner or admin to create a store for this workspace.'}
                </Body>
              </>
            )}
          </Card>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: t.space(3) }} />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/store/${item.slug}` as never)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.name}${item.is_pro ? ', Pro plan' : ''}`}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: t.colors.surface, borderColor: t.colors.outlineVariant },
            pressed && { backgroundColor: t.colors.surfaceContainerLow },
          ]}
        >
          <Avatar name={item.name} uri={item.logo_url} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>/{item.slug}</Text>
          </View>
          {item.is_pro ? (
            <View style={[styles.proChip, { backgroundColor: t.colors.primaryContainer }]}>
              <Text style={[t.type.labelMedium, { color: t.colors.onPrimaryContainer }]}>PRO</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={t.colors.onSurfaceVariant} />
          )}
        </Pressable>
      )}
    />
  )
}


const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: 20 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  proChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
})