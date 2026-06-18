import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/auth/AuthContext'
import { ThemeProvider, useTheme } from '@/lib/theme'

const sentryDsn = Constants.expoConfig?.extra?.sentryDsn as string | undefined
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn, enableNative: true })
}

function AppShell() {
  const t = useTheme()
  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.onSurface,
          headerTitleStyle: { fontWeight: '700', color: t.colors.onSurface },
          contentStyle: { backgroundColor: t.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}

function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout
