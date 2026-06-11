import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/auth/AuthContext'
import { useTheme } from '@/lib/theme'

export default function RootLayout() {
  const t = useTheme()
  return (
    <SafeAreaProvider>
      <AuthProvider>
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
      </AuthProvider>
    </SafeAreaProvider>
  )
}
