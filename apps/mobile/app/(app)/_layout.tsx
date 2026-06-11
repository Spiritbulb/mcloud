import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/auth/AuthContext'
import { theme } from '@/lib/theme'

export default function AppLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.background }}>
        <ActivityIndicator color={theme.color.foreground} />
      </View>
    )
  }

  // Gate: anything under (app) requires a session.
  if (!user) return <Redirect href="/" />

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.color.background },
        headerTintColor: theme.color.foreground,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: theme.color.background },
      }}
    >
      <Stack.Screen name="orgs" options={{ title: 'Organizations' }} />
      <Stack.Screen name="org/[orgSlug]" options={{ title: 'Stores' }} />
    </Stack>
  )
}
