// Onboarding — new users with no org/store yet.
// Step 1: name your workspace (org). Step 2: create first store.
import * as React from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
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
  const [orgCreated, setOrgCreated] = React.useState(false)
  const [storeName, setStoreName] = React.useState('')
  const [busy, setBusy] = React.useState(false)


  const previewOrgSlug = slugify(orgName)
  const storeSlug = slugify(storeName)


  const onCreateOrg = async () => {
    if (!orgName.trim() || busy) return
    setBusy(true)
    try {
      const org = await client.createOrg(orgName.trim())
      setOrgSlug(org.slug)
      setOrgCreated(true)
      setStep(2)
    } catch (e) {
      Alert.alert('Could not create workspace', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setBusy(false)
    }
  }


  const onCreateStore = async () => {
    if (!storeSlug || !orgSlug || busy) return
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


  // Their workspace already exists after step 1 succeeds — skipping should not
  // strand them on a screen that looks like nothing happened.
  const onSkip = () => {
    if (busy) return
    Alert.alert(
      `"${orgName.trim()}" is ready`,
      'You can add a store for it anytime from your workspace.',
      [{ text: 'Take me there', onPress: () => router.replace('/(app)/orgs') }],
    )
  }


  const onBackToWorkspace = () => {
    if (busy) return
    setStep(1)
  }


  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: t.colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.topBar}>
          {step === 2 ? (
            <Pressable
              onPress={onBackToWorkspace}
              disabled={busy}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Back to workspace name"
              style={({ pressed }) => [styles.backBtn, pressed && !busy && { opacity: 0.6 }]}
            >
              <Ionicons name="chevron-back" size={20} color={busy ? t.colors.onSurfaceVariant : t.colors.onSurface} />
              <Text style={[t.type.labelLarge, { color: busy ? t.colors.onSurfaceVariant : t.colors.onSurface }]}>
                Back
              </Text>
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}

          <View style={styles.stepDots}>
            <View style={[styles.dot, { backgroundColor: t.colors.primary }]} />
            <View
              style={[
                styles.dot,
                { backgroundColor: step === 2 ? t.colors.primary : t.colors.surfaceContainerHigh },
              ]}
            />
          </View>
        </View>

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
                  A workspace holds all your stores. Use your business or brand name — you can add more stores under it later.
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
                  editable={!busy}
                  helper={previewOrgSlug ? `Your workspace link: mcloud.co.ke/org/${previewOrgSlug}` : undefined}
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
                {orgCreated && (
                  <View style={[styles.orgChip, { backgroundColor: t.colors.secondaryContainer }]}>
                    <Ionicons name="checkmark-circle" size={14} color={t.colors.onSecondaryContainer} />
                    <Text style={[t.type.labelMedium, { color: t.colors.onSecondaryContainer }]} numberOfLines={1}>
                      {orgName.trim()} is ready
                    </Text>
                  </View>
                )}
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
                  editable={!busy}
                  helper={storeSlug ? `mcloud.co.ke/${storeSlug}` : undefined}
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
              <Pressable onPress={onSkip} disabled={busy} hitSlop={8}>
                <Text
                  style={[
                    t.type.labelLarge,
                    { color: busy ? t.colors.onSurfaceVariant : t.colors.onSurfaceVariant, textAlign: 'center' },
                  ]}
                >
                  Skip for now
                </Text>
              </Pressable>
            </>
          )}
        </FadeInUp>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 60, minHeight: 32 },
  stepDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 20, height: 6, borderRadius: 3 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 28 },
  illoWrap: { borderRadius: 24, paddingVertical: 28, alignItems: 'center', justifyContent: 'center' },
  copy: { gap: 10 },
  orgChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  fields: { gap: 12 },
  footer: { paddingHorizontal: 28, paddingBottom: 20, gap: 12 },
})