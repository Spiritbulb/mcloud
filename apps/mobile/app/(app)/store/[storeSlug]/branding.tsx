// Branding — store name, logo, description. M3, system theme.
import * as React from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/AuthContext'
import { useStore } from '@/store/StoreContext'
import { api, type Branding } from '@/lib/api'
import { Body, Button, Card, Field, ScreenHeader } from '@/components/ui'
import { useTheme, type Theme } from '@/lib/theme'

export default function BrandingScreen() {
  const t = useTheme()
  const s = React.useMemo(() => styles(t), [t])
  const router = useRouter()
  const { slug: storeSlug, store } = useStore()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [branding, setBranding] = React.useState<Branding | null>(null)
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [uploadingLogo, setUploadingLogo] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setError(null)
    try {
      const b = await client.getBranding(storeSlug)
      setBranding(b)
      setName(b.name)
      setDescription(b.description ?? '')
      setLogoUrl(b.logo_url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [client, storeSlug])

  React.useEffect(() => { load() }, [load])

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow photo library access to upload a logo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return

    setUploadingLogo(true)
    try {
      const asset = result.assets[0]
      const storeId = store?.id ?? storeSlug
      const url = await client.uploadImage(asset.uri, 'store-assets', `${storeId}/logo`)
      setLogoUrl(url)
      const b = await client.updateBranding(storeSlug, { logo_url: url })
      setBranding(b)
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

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
      <SafeAreaView style={[s.fill, { backgroundColor: t.colors.background }]} edges={['top']}>
        <ScreenHeader title="Branding" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const canManage = branding?.canManage ?? false
  const dirty = !!branding && (name.trim() !== branding.name || description !== (branding.description ?? ''))

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: t.colors.background }]} edges={['top']}>
      <ScreenHeader title="Branding" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {error || !branding ? (
          <Card><Body variant>{error ?? 'Unavailable'}</Body></Card>
        ) : (
          <>
            <Card style={s.logoCard}>
              <Text style={[t.type.labelLarge, { color: t.colors.onSurfaceVariant }]}>Store logo</Text>
              <View style={s.logoRow}>
                <Pressable
                  onPress={canManage ? pickLogo : undefined}
                  style={[s.logoWrap, { backgroundColor: t.colors.surfaceContainerHigh }]}
                >
                  {uploadingLogo ? (
                    <ActivityIndicator color={t.colors.primary} />
                  ) : logoUrl ? (
                    <Image source={{ uri: logoUrl }} style={s.logoImg} contentFit="cover" />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Ionicons name="image-outline" size={28} color={t.colors.onSurfaceVariant} />
                      <Text style={[t.type.labelSmall, { color: t.colors.onSurfaceVariant }]}>No logo</Text>
                    </View>
                  )}
                  {canManage && !uploadingLogo && (
                    <View style={[s.editBadge, { backgroundColor: t.colors.surfaceContainer }]}>
                      <Ionicons name="pencil" size={12} color={t.colors.onSurface} />
                    </View>
                  )}
                </Pressable>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[t.type.bodyMedium, { color: t.colors.onSurface }]}>
                    {canManage ? 'Tap the logo to change it.' : 'Only owners and admins can update the logo.'}
                  </Text>
                  <Text style={[t.type.bodySmall, { color: t.colors.onSurfaceVariant }]}>
                    JPEG, PNG or WebP · max 8 MB · square crop
                  </Text>
                </View>
              </View>
            </Card>

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
    logoCard: { gap: 12 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    logoWrap: {
      width: 80,
      height: 80,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
    },
    logoImg: { width: 80, height: 80 },
    editBadge: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })