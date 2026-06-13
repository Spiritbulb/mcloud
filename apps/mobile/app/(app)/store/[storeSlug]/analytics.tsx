// Analytics — a little read-only summary (last 30 days). M3, system theme.
import * as React from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthContext'
import { useStore } from '@/store/StoreContext'
import { api, type AnalyticsTotals } from '@/lib/api'
import { Body, Card, Overline, ScreenHeader } from '@/components/ui'
import { useTheme, type Theme } from '@/lib/theme'

function num(v: unknown): number {
  return typeof v === 'number' ? v : 0
}

function delta(cur: number, prev: number): { label: string; up: boolean } | null {
  if (!prev) return null
  const pct = Math.round(((cur - prev) / prev) * 100)
  return { label: `${pct >= 0 ? '+' : ''}${pct}%`, up: pct >= 0 }
}

export default function AnalyticsScreen() {
  const t = useTheme()
  const s = React.useMemo(() => styles(t), [t])
  const { slug: storeSlug } = useStore()
  const router = useRouter()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [data, setData] = React.useState<AnalyticsTotals | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setError(null)
    try {
      setData(await client.getAnalytics(storeSlug, 30))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [client, storeSlug])

  React.useEffect(() => { load() }, [load])

  const totals = (data?.totals ?? {}) as Record<string, unknown>
  const prev = (data?.previous ?? {}) as Record<string, unknown>

  const metrics = [
    { key: 'revenue', label: 'Revenue', prefix: 'KES ' },
    { key: 'orders', label: 'Orders', prefix: '' },
    { key: 'visitors', label: 'Visitors', prefix: '' },
    { key: 'views', label: 'Page views', prefix: '' },
  ]

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: t.colors.background }]} edges={['top']}>
      <ScreenHeader title="Analytics" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={t.colors.primary} />}
      >
        <Overline>Last 30 days</Overline>

        {loading && !data ? (
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <ActivityIndicator color={t.colors.primary} />
          </View>
        ) : error ? (
          <Card><Body variant>{error}</Body></Card>
        ) : (
          <View style={s.grid}>
            {metrics.map((m) => {
              const cur = num(totals[m.key])
              const d = delta(cur, num(prev[m.key]))
              return (
                <View key={m.key} style={[s.metric, { backgroundColor: t.colors.surfaceContainer }]}>
                  <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>{m.label}</Text>
                  <Text style={[t.type.headlineSmall, { color: t.colors.onSurface }]}>
                    {m.prefix}
                    {cur.toLocaleString()}
                  </Text>
                  {d && (
                    <Text style={[t.type.labelMedium, { color: d.up ? t.colors.primary : t.colors.error }]}>
                      {d.label} vs prev
                    </Text>
                  )}
                </View>
              )
            })}
          </View>
        )}

        <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant, textAlign: 'center' }]}>
          Full analytics with charts & breakdowns are on the web.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = (t: Theme) =>
  StyleSheet.create({
    fill: { flex: 1 },
    scroll: { padding: 20, gap: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    metric: { width: '47.5%', borderRadius: 20, padding: 16, gap: 4, minHeight: 96 },
  })
