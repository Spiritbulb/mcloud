import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/auth/AuthContext'
import { useTheme } from '@/lib/theme'

export default function AppLayout() {
  const t = useTheme()
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.background,
        }}
      >
        <ActivityIndicator color={t.colors.primary} />
      </View>
    )
  }

  // Gate: anything under (app) requires a session.
  if (!user) return <Redirect href="/" />

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: t.colors.background },
        headerTintColor: t.colors.onSurface,
        headerTitleStyle: { fontWeight: '700', color: t.colors.onSurface },
        contentStyle: { backgroundColor: t.colors.background },
      }}
    >
      <Stack.Screen name="orgs" options={{ headerShown: false }} />
      <Stack.Screen name="org/[orgSlug]" options={{ title: 'Stores' }} />
      <Stack.Screen name="store/[storeSlug]/index" options={{ title: 'Store', headerShown: true, headerBackTitle: 'Back' }} />
      <Stack.Screen name="store/[storeSlug]/products" options={{ headerShown: true, headerBackTitle: 'Back' }} />
      <Stack.Screen name="store/[storeSlug]/orders" options={{ headerShown: true, headerBackTitle: 'Back' }} />
      <Stack.Screen name="store/[storeSlug]/branding" options={{ headerShown: true, headerBackTitle: 'Back' }} />
      <Stack.Screen name="store/[storeSlug]/mpesa" options={{ headerShown: true, headerBackTitle: 'Back' }} />
      <Stack.Screen name="store/[storeSlug]/analytics" options={{ headerShown: true, headerBackTitle: 'Back' }} />
    </Stack>
  )
}
