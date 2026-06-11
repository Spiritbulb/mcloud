// Manual M-Pesa — till/paybill setup. Auto (Daraja) stays on the web.
// M3, system theme.
import * as React from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthContext'
import { api, type ManualMpesa } from '@/lib/api'
import { Body, Button, Card, Field } from '@/components/ui'
import { useTheme, type Theme } from '@/lib/theme'

export default function MpesaScreen() {
  const t = useTheme()
  const s = styles(t)
  const { storeSlug } = useLocalSearchParams<{ storeSlug: string }>()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [m, setM] = React.useState<ManualMpesa | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setError(null)
    try {
      setM(await client.getMpesa(storeSlug))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [client, storeSlug])

  React.useEffect(() => { load() }, [load])

  const onSave = async () => {
    if (!m) return
    setSaving(true)
    try {
      const next = await client.updateMpesa(storeSlug, {
        enabled: m.enabled,
        mpesa_type: m.mpesa_type,
        mpesa_till: m.mpesa_till,
        mpesa_paybill: m.mpesa_paybill,
        mpesa_account: m.mpesa_account,
      })
      setM(next)
      Alert.alert('Saved', 'Manual M-Pesa updated.')
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={[s.fill, { backgroundColor: t.colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Stack.Screen options={{ title: 'Manual M-Pesa' }} />
        <ActivityIndicator color={t.colors.primary} />
      </View>
    )
  }

  const canManage = m?.canManage ?? false
  const isTill = m?.mpesa_type === 'till'

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: t.colors.background }]} edges={[]}>
      <Stack.Screen options={{ title: 'Manual M-Pesa' }} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {error || !m ? (
          <Card><Body variant>{error ?? 'Unavailable'}</Body></Card>
        ) : (
          <>
            <Card style={{ gap: 16 }}>
              <View style={s.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>Manual M-Pesa</Text>
                  <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>
                    Customers pay your till/paybill, you confirm orders.
                  </Text>
                </View>
                <Switch
                  value={m.enabled}
                  onValueChange={(v) => setM({ ...m, enabled: v })}
                  disabled={!canManage}
                  trackColor={{ true: t.colors.primary }}
                />
              </View>

              {/* Type toggle */}
              <View style={s.segment}>
                {(['till', 'paybill'] as const).map((opt) => {
                  const active = m.mpesa_type === opt
                  return (
                    <Pressable
                      key={opt}
                      disabled={!canManage}
                      onPress={() => setM({ ...m, mpesa_type: opt })}
                      style={[
                        s.segmentItem,
                        { borderColor: t.colors.outlineVariant },
                        active && { backgroundColor: t.colors.secondaryContainer, borderColor: t.colors.secondaryContainer },
                      ]}
                    >
                      <Text style={[t.type.labelLarge, { color: active ? t.colors.onSecondaryContainer : t.colors.onSurfaceVariant }]}>
                        {opt === 'till' ? 'Till number' : 'Paybill'}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              {isTill ? (
                <Field
                  label="Till number"
                  value={m.mpesa_till}
                  onChangeText={(v) => setM({ ...m, mpesa_till: v })}
                  editable={canManage}
                  keyboardType="numeric"
                  placeholder="e.g. 4202518"
                />
              ) : (
                <>
                  <Field
                    label="Paybill number"
                    value={m.mpesa_paybill}
                    onChangeText={(v) => setM({ ...m, mpesa_paybill: v })}
                    editable={canManage}
                    keyboardType="numeric"
                    placeholder="e.g. 123456"
                  />
                  <Field
                    label="Account number"
                    value={m.mpesa_account}
                    onChangeText={(v) => setM({ ...m, mpesa_account: v })}
                    editable={canManage}
                    placeholder="e.g. your store name"
                  />
                </>
              )}
            </Card>

            {canManage && <Button label="Save" onPress={onSave} loading={saving} />}

            <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant, textAlign: 'center' }]}>
              Automatic payments (Daraja, cards) are set up on the web — see the store hub.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = (t: Theme) =>
  StyleSheet.create({
    fill: { flex: 1 },
    scroll: { padding: 20, gap: 16 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    segment: { flexDirection: 'row', gap: 8 },
    segmentItem: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
