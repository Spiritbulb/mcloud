// Org list — the first authed screen. Tapping an org opens its stores.
import * as React from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Link, Stack } from 'expo-router'
import { useAuth } from '@/auth/AuthContext'
import { api, type Org } from '@/lib/api'
import { Body, Card, Overline } from '@/components/ui'
import { theme } from '@/lib/theme'

export default function OrgsScreen() {
  const { authedFetch, signOut, user } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [orgs, setOrgs] = React.useState<Org[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setError(null)
    try {
      setOrgs(await client.listOrgs())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [client])

  React.useEffect(() => {
    load()
  }, [load])

  return (
    <View style={styles.fill}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={signOut} hitSlop={8}>
              <Text style={{ color: theme.color.muted, fontWeight: '500' }}>Sign out</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        contentContainerStyle={styles.list}
        data={orgs}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={
          <View style={{ gap: theme.space(1), marginBottom: theme.space(4) }}>
            <Overline>Signed in as {user?.email}</Overline>
            <Text style={[theme.font.h2, { color: theme.color.foreground }]}>Your organizations</Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <Card>
              <Body muted>{error ?? 'No organizations yet.'}</Body>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: '/(app)/org/[orgSlug]', params: { orgSlug: item.slug } }} asChild>
            <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[theme.font.h3, { color: theme.color.foreground }]}>{item.name}</Text>
                <Text style={{ color: theme.color.muted, fontSize: 13 }}>{item.role}</Text>
              </View>
              <Text style={{ color: theme.color.muted, fontSize: 20 }}>›</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
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
})
