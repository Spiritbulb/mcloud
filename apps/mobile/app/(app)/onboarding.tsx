// Onboarding — new users with no org/store yet.
// Step 1: name your workspace (org). Step 2: create first store.
import * as React from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthContext'
import { api } from '@/lib/api'
import { Button, FadeInUp, Field, MarketingImage } from '@/components/ui'
import { useTheme } from '@/lib/theme'

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function OnboardingScreen() {
  const t = useTheme()
  const router = useRouter()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [step, setStep] = React.useState<1 | 2>(1)
  const [orgName, setOrgName] = React.useState('')
  const [orgSlug, setOrgSlug] = React.useState('')
  const [storeName, setStoreName] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const storeSlug = slugify(storeName)

  const onCreateOrg = async () => {
    if (!orgName.trim()) return
    setBusy(true)
    try {
      const org = await client.createOrg(orgName.trim())
      setOrgSlug(org.slug)
      setStep(2)
    } catch (e) {
      Alert.alert('Could not create workspace', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  const onCreateStore = async () => {
    if (!storeSlug || !orgSlug) return
    setBusy(true)
    try {
      await client.createStore(orgSlug, { name: storeName.trim(), slug: storeSlug })
      router.replace('/(app)/orgs')
    } catch (e) {
      Alert.alert('Could not create store', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: t.colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.body}>

        {step === 1 ? (
          <>
            <FadeInUp delay={0}>
              <View style={[styles.illoWrap, { backgroundColor: t.colors.surfaceContainerHigh }]}>
                <MarketingImage name="marketing-make-it-yours.png" width={200} height={160} />
              </View>
            </FadeInUp>

            <FadeInUp delay={80} style={styles.copy}>
              <Text style={[t.type.overline, { color: t.colors.primary }]}>STEP 1 OF 2</Text>
              <Text style={[t.type.headlineLarge, { color: t.colors.onSurface, fontWeight: '700' }]}> 
                Name your workspace
              </Text>
              <Text style={[t.type.bodyLarge, { color: t.colors.onSurfaceVariant }]}>
                A workspace holds all your stores. Use your business or brand name.
              </Text>
            </FadeInUp>

            <FadeInUp delay={160} style={styles.fields}>
              <Field
                label="Workspace name"
                value={orgName}
                onChangeText={setOrgName}
                placeholder="e.g. Naya Designs"
                autoCapitalize="words"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={onCreateOrg}
              />
            </FadeInUp>
          </>
        ) : (
          <>
            <FadeInUp delay={0}>
              <View style={[styles.illoWrap, { backgroundColor: t.colors.surfaceContainerHigh }]}>
                <MarketingImage name="marketing-digital-warehouse.png" width={200} height={160} />
              </View>
            </FadeInUp>

            <FadeInUp delay={80} style={styles.copy}>
              <Text style={[t.type.overline, { color: t.colors.primary }]}>STEP 2 OF 2</Text>
              <Text style={[t.type.headlineLarge, { color: t.colors.onSurface, fontWeight: '700' }]}> 
                Create your first store
              </Text>
              <Text style={[t.type.bodyLarge, { color: t.colors.onSurfaceVariant }]}>
                Your store gets its own link. You can add more stores later.
              </Text>
            </FadeInUp>

            <FadeInUp delay={160} style={styles.fields}>
              <Field
                label="Store name"
                value={storeName}
                onChangeText={setStoreName}
                placeholder="e.g. Loc'd by Naya"
                autoCapitalize="words"
                autoFocus
                helper={storeSlug ? `menengai.cloud/${storeSlug}` : undefined}
                returnKeyType="done"
                onSubmitEditing={onCreateStore}
              />
            </FadeInUp>
          </>
        )}
      </View>

      <FadeInUp delay={220} style={styles.footer}>
        {step === 1 ? (
          <Button
            label="Continue"
            onPress={onCreateOrg}
            loading={busy}
            disabled={!orgName.trim()}
            variant="filled"
          />
        ) : (
          <>
            <Button
              label="Create store"
              onPress={onCreateStore}
              loading={busy}
              disabled={!storeSlug}
              variant="filled"
            />
            <Pressable onPress={() => router.replace('/(app)/orgs')} hitSlop={8}>
              <Text style={[t.type.labelLarge, { color: t.colors.onSurfaceVariant, textAlign: 'center' }]}>
                Skip for now
              </Text>
            </Pressable>
          </>
        )}
      </FadeInUp>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 28 },
  illoWrap: { borderRadius: 24, paddingVertical: 28, alignItems: 'center', justifyContent: 'center' },
  copy: { gap: 10 },
  fields: { gap: 12 },
  footer: { paddingHorizontal: 28, paddingBottom: 20, gap: 12 },
})