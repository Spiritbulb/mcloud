import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

function Loading() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.colors.bg }}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  // Light UI → dark status-bar content; dark UI → light content.
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

function Guard() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/login');
    else if (user && inAuth) router.replace('/(tabs)');
  }, [user, loading, segments]);

  if (loading) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="note/[id]"
        options={{
          headerShown: true,
          title: 'Note',
          headerStyle: { backgroundColor: theme.colors.bg },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fraunces_500Medium, Fraunces_600SemiBold });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStatusBar />
          {fontsLoaded ? <Guard /> : <Loading />}
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
