// Stores in an org + create-store form. Demonstrates the create flow end-to-end
// (POST /api/mobile/orgs/[orgSlug]/stores) with the same rules as the web action.
// Slug is auto-derived and shown read-only (never editable), per the product rule.
import * as React from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/auth/AuthContext'
import { api, type Store } from '@/lib/api'
import { Body, Button, Card, Field, Overline } from '@/components/ui'
import { theme } from '@/lib/theme'

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function OrgStoresScreen() {
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
      style={styles.fill}
      contentContainerStyle={styles.list}
      data={stores}
      keyExtractor={(s) => s.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View style={{ gap: theme.space(4), marginBottom: theme.space(4) }}>
          <Stack.Screen options={{ title: orgSlug }} />
          <View style={{ gap: theme.space(1) }}>
            <Overline>Stores</Overline>
            <Text style={[theme.font.h2, { color: theme.color.foreground }]}>{orgSlug}</Text>
          </View>

          {canManage && (
            <Card style={{ gap: theme.space(3) }}>
              <Text style={[theme.font.h3, { color: theme.color.foreground }]}>Create a store</Text>
              <Field
                label="Store name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Loc'd by Naya"
                autoCapitalize="words"
              />
              {slug ? (
                <Text style={{ color: theme.color.muted, fontSize: 12 }}>
                  URL: /store/<Text style={{ color: theme.color.foreground }}>{slug}</Text>
                </Text>
              ) : null}
              <Button label="Create store" onPress={onCreate} loading={creating} disabled={!slug} />
            </Card>
          )}
        </View>
      }
      ListEmptyComponent={
        !loading ? (
          <Card>
            <Body muted>{error ?? 'No stores yet.'}</Body>
          </Card>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[theme.font.h3, { color: theme.color.foreground }]}>{item.name}</Text>
            <Text style={{ color: theme.color.muted, fontSize: 13 }}>/{item.slug}</Text>
          </View>
          {item.is_pro && <Text style={styles.pro}>PRO</Text>}
        </Pressable>
      )}
    />
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.color.background },
  list: { padding: theme.space(5), gap: theme.space(3) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.space(4),
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  pro: {
    color: theme.color.accent,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
  },
})
