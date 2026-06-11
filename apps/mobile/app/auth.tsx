// Redirect landing route for the WorkOS OAuth flow (mcloud://auth?code=...).
//
// expo-auth-session's promptAsync normally captures the redirect itself, but in a
// dev client the redirect can arrive as a deep link that expo-router routes here
// first. maybeCompleteAuthSession() hands the URL back to the pending auth request;
// we then bounce to the app root, where the AuthProvider has the resulting session.
import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Redirect } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { theme } from '@/lib/theme'

WebBrowser.maybeCompleteAuthSession()

export default function AuthRedirect() {
  const [done, setDone] = React.useState(false)

  React.useEffect(() => {
    // Give maybeCompleteAuthSession a tick to resolve the pending request.
    const t = setTimeout(() => setDone(true), 300)
    return () => clearTimeout(t)
  }, [])

  if (done) return <Redirect href="/" />

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.color.background,
      }}
    >
      <ActivityIndicator color={theme.color.foreground} />
    </View>
  )
}
