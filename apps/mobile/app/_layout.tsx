import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/auth/AuthContext'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { QueryProvider } from '@/data/QueryProvider'

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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <QueryProvider>
            <AppShell />
          </QueryProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
