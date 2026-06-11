// Stores in an org + create-store form. Real API calls
// (GET/POST /api/mobile/orgs/[orgSlug]/stores) — same rules as the web action.
// Slug is auto-derived and shown read-only (never editable), per the product rule.
// Material 3, follows system theme.
import * as React from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/auth/AuthContext'
import { api, type Store } from '@/lib/api'
import { Avatar, Body, Button, Card, Field, Overline } from '@/components/ui'
import { useTheme } from '@/lib/theme'

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function OrgStoresScreen() {
  const t = useTheme()
  const { orgSlug } = useLocalSearchParams<{ orgSlug: string }>()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [stores, setStores] = React.useState<Store[]>([])
  const [role, setRole] = React.useState<string>('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [name, setName] = React.useState('')
  const [creating, setCreating] = React.useState(false)
  const slug = slugify(name)
  const canManage = role === 'owner' || role === 'admin'

  const load = React.useCallback(async () => {
    setError(null)
    try {
      const data = await client.listStores(orgSlug)
      setStores(data.stores)
      setRole(data.role)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [client, orgSlug])

  React.useEffect(() => {
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
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={t.colors.primary} />
      }
      ListHeaderComponent={
        <View style={{ gap: t.space(4), marginBottom: t.space(4) }}>
          <Stack.Screen options={{ title: orgSlug }} />
          <View style={{ gap: t.space(1) }}>
            <Overline>Stores</Overline>
            <Text style={[t.type.headlineSmall, { color: t.colors.onSurface }]}>{orgSlug}</Text>
          </View>

          {canManage && (
            <Card tonal style={{ gap: t.space(3) }}>
              <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>Create a store</Text>
              <Field
                label="Store name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Loc'd by Naya"
                autoCapitalize="words"
                helper={slug ? `URL: /store/${slug}` : undefined}
              />
              <Button label="Create store" onPress={onCreate} loading={creating} disabled={!slug} />
            </Card>
          )}
        </View>
      }
      ListEmptyComponent={
        !loading ? (
          <Card>
            <Body variant>{error ?? 'No stores yet.'}</Body>
          </Card>
        ) : null
      }
      ItemSeparatorComponent={() => <View style={{ height: t.space(3) }} />}
      renderItem={({ item }) => (
        <Pressable
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
          {item.is_pro && (
            <View style={[styles.proChip, { backgroundColor: t.colors.primaryContainer }]}>
              <Text style={[t.type.labelMedium, { color: t.colors.onPrimaryContainer }]}>PRO</Text>
            </View>
          )}
        </Pressable>
      )}
    />
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: 20 },
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
