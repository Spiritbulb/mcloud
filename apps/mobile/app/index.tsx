// Home / sign-in — expressive Material 3, follows system light/dark.
import * as React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Redirect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthContext'
import { Button, FadeInUp, MarketingImage } from '@/components/ui'
import { useTheme } from '@/lib/theme'

export default function Home() {
  const t = useTheme()
  const { user, loading, signIn } = useAuth()
  const [signingIn, setSigningIn] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (loading) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: t.colors.background }]}>
        <ActivityIndicator color={t.colors.primary} />
      </View>
    )
  }

  if (user) return <Redirect href="/(app)/orgs" />

  const onSignIn = async () => {
    setError(null)
    setSigningIn(true)
    try {
      await signIn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: t.colors.background }]}>
      <View style={styles.body}>
        {/* Marketing illustration in a tonal panel */}
        <FadeInUp delay={0}>
          <View style={[styles.illoPanel, { backgroundColor: t.colors.primaryContainer }]}>
            <MarketingImage name="marketing-make-it-yours.png" width={220} height={180} />
          </View>
        </FadeInUp>

        <View style={styles.copy}>
          <FadeInUp delay={80}>
            <Text style={[t.type.overline, { color: t.colors.primary }]}>MENENGAI CLOUD</Text>
          </FadeInUp>
          <FadeInUp delay={140}>
            <Text style={[t.type.displaySmall, { color: t.colors.onSurface, fontWeight: '700' }]}>
              Run your stores{'\n'}from your pocket.
            </Text>
          </FadeInUp>
          <FadeInUp delay={200}>
            <Text style={[t.type.bodyLarge, { color: t.colors.onSurfaceVariant, maxWidth: 330 }]}>
              Products, orders, payments and branding — the essentials, on the go. Everything else is
              one tap away on the web.
            </Text>
          </FadeInUp>
        </View>
      </View>

      <FadeInUp delay={260} style={styles.footer}>
        {error && (
          <View style={[styles.errorChip, { backgroundColor: t.colors.errorContainer }]}>
            <Text style={[t.type.bodyMedium, { color: t.colors.onErrorContainer }]}>{error}</Text>
          </View>
        )}
        <Button label="Sign in" onPress={onSignIn} loading={signingIn} variant="filled" />
        <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant, textAlign: 'center' }]}>
          Uses your existing Menengai Cloud account.
        </Text>
      </FadeInUp>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 32 },
  illoPanel: {
    borderRadius: 28,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: 14 },
  footer: { paddingHorizontal: 28, paddingBottom: 28, gap: 12 },
  errorChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
})
