// Branding — store name, description (logo upload comes later). M3, system theme.
// Slug is intentionally never shown/editable.
import * as React from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthContext'
import { api, type Branding } from '@/lib/api'
import { Avatar, Body, Button, Card, Field } from '@/components/ui'
import { useTheme, type Theme } from '@/lib/theme'

export default function BrandingScreen() {
  const t = useTheme()
  const s = styles(t)
  const { storeSlug } = useLocalSearchParams<{ storeSlug: string }>()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [branding, setBranding] = React.useState<Branding | null>(null)
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setError(null)
    try {
      const b = await client.getBranding(storeSlug)
      setBranding(b)
      setName(b.name)
      setDescription(b.description ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [client, storeSlug])

  React.useEffect(() => { load() }, [load])

  const onSave = async () => {
    setSaving(true)
    try {
      const b = await client.updateBranding(storeSlug, { name: name.trim(), description })
      setBranding(b)
      Alert.alert('Saved', 'Branding updated.')
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={[s.fill, { backgroundColor: t.colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Stack.Screen options={{ title: 'Branding' }} />
        <ActivityIndicator color={t.colors.primary} />
      </View>
    )
  }

  const canManage = branding?.canManage ?? false
  const dirty = !!branding && (name.trim() !== branding.name || description !== (branding.description ?? ''))

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: t.colors.background }]} edges={[]}>
      <Stack.Screen options={{ title: 'Branding' }} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {error || !branding ? (
          <Card><Body variant>{error ?? 'Unavailable'}</Body></Card>
        ) : (
          <>
            <View style={s.logoRow}>
              <Avatar name={branding.name} uri={branding.logo_url} size={72} radius={20} />
              <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant, flex: 1 }]}>
                Logo upload is coming soon. For now, manage your logo on the web.
              </Text>
            </View>

            <Card style={{ gap: 16 }}>
              <Field label="Store name" value={name} onChangeText={setName} editable={canManage} autoCapitalize="words" />
              <Field
                label="Description"
                value={description}
                onChangeText={setDescription}
                editable={canManage}
                placeholder="What does your store sell?"
                multiline
              />
            </Card>

            {canManage ? (
              <Button label="Save changes" onPress={onSave} loading={saving} disabled={!dirty || !name.trim()} />
            ) : (
              <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant, textAlign: 'center' }]}>
                Only owners and admins can edit branding.
              </Text>
            )}
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
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  })
