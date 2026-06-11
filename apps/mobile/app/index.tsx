// Home / sign-in. Marketing-styled landing: big tracking-tight headline, brand
// charcoal hero, gold accent. Redirects into the app once authenticated.
import * as React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Redirect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui'
import { theme } from '@/lib/theme'

export default function Home() {
  const { user, loading, signIn } = useAuth()
  const [signingIn, setSigningIn] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (loading) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ActivityIndicator color={theme.color.foreground} />
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
    <SafeAreaView style={styles.fill}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>MENENGAI CLOUD</Text>
        <Text style={styles.headline}>Run your stores{'\n'}from your pocket.</Text>
        <Text style={styles.sub}>
          Manage products, orders, payments and branding — the essentials, on the go. Everything else
          is one tap away on the web.
        </Text>
      </View>

      <View style={styles.footer}>
        {error && <Text style={styles.error}>{error}</Text>}
        <Button label="Sign in" onPress={onSignIn} loading={signingIn} />
        <Text style={styles.fine}>Uses your existing Menengai Cloud account.</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.color.foreground },
  center: { alignItems: 'center', justifyContent: 'center' },
  hero: { flex: 1, justifyContent: 'center', paddingHorizontal: theme.space(6), gap: theme.space(4) },
  kicker: { color: theme.color.accent, ...theme.font.overline },
  headline: { color: theme.color.onDark, fontSize: 40, fontWeight: '700', letterSpacing: -0.8, lineHeight: 44 },
  sub: { color: 'rgba(245,240,235,0.7)', fontSize: 16, lineHeight: 24, maxWidth: 340 },
  footer: { paddingHorizontal: theme.space(6), paddingBottom: theme.space(6), gap: theme.space(3) },
  error: { color: '#fca5a5', fontSize: 13, textAlign: 'center' },
  fine: { color: 'rgba(245,240,235,0.5)', fontSize: 12, textAlign: 'center' },
})
