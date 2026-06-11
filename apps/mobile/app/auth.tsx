// Redirect landing route for the WorkOS OAuth flow (mcloud://auth?code=...).
//
// On production standalone builds the redirect arrives here as a deep link rather
// than resolving promptAsync. So this route completes the PKCE token exchange itself
// (completeAuthFromCode, using the persisted verifier), then refreshes the session
// and returns home. maybeCompleteAuthSession() covers the dev-client happy path.
import * as React from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { completeAuthFromCode, useAuth } from '@/auth/AuthContext'
import { useTheme } from '@/lib/theme'

WebBrowser.maybeCompleteAuthSession()

export default function AuthRedirect() {
  const t = useTheme()
  const router = useRouter()
  const { refreshSession } = useAuth()
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>()
  const [phase, setPhase] = React.useState<'working' | 'done' | 'error'>('working')

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const code = typeof params.code === 'string' ? params.code : undefined
      if (params.error) {
        if (!cancelled) setPhase('error')
        return
      }
      if (code) {
        // Deep-link path (production): complete the exchange here.
        await completeAuthFromCode(code)
      }
      // Re-resolve the user from whatever tokens are now stored (covers both the
      // deep-link path above and the dev-client promptAsync path).
      await refreshSession()
      if (!cancelled) setPhase('done')
    })()
    return () => {
      cancelled = true
    }
  }, [params.code, params.error, refreshSession])

  if (phase === 'done') return <Redirect href="/" />

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.background, gap: 16, padding: 24 }}>
      <ActivityIndicator color={t.colors.primary} />
      {phase === 'error' && (
        <>
          <Text style={[t.type.bodyMedium, { color: t.colors.error, textAlign: 'center' }]}>
            {String(params.error_description ?? params.error ?? 'Sign-in failed')}
          </Text>
          <Text
            onPress={() => router.replace('/')}
            style={[t.type.labelLarge, { color: t.colors.primary }]}
          >
            Back to sign in
          </Text>
        </>
      )}
    </View>
  )
}
