// Account settings — profile (read-only), appearance preference, sign out.
import * as React from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/AuthContext'
import { Avatar, Card } from '@/components/ui'
import { useTheme, useThemePreference, type ThemePreference } from '@/lib/theme'
import { registerPush } from '@/notifications/registerPush'

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
]

export default function AccountScreen() {
  const t = useTheme()
  const s = React.useMemo(() => styles(t), [t])
  const { user, signOut, authedFetch } = useAuth()
  const { preference, setPreference } = useThemePreference()

  const onSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ])
  }

  const onAppearance = () => {
    const options = APPEARANCE_OPTIONS.map((o) => ({
      text: o.label + (preference === o.value ? ' ✓' : ''),
      onPress: () => setPreference(o.value),
    }))
    Alert.alert('Appearance', 'Choose a color scheme', [
      ...options,
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const onEnableNotifications = async () => {
    const r = await registerPush(authedFetch)
    if (r === 'registered') Alert.alert('Notifications on', 'You\'ll get alerts on this device.')
    else if (r === 'denied') Alert.alert('Notifications blocked', 'Enable them in your device Settings to get alerts.')
    else if (r === 'unsupported') Alert.alert('Not supported', 'Push notifications need a physical device.')
    else Alert.alert('Something went wrong', 'Could not enable notifications. Try again.')
  }

  const currentAppearanceLabel = APPEARANCE_OPTIONS.find((o) => o.value === preference)?.label ?? 'System'
  const currentAppearanceIcon = APPEARANCE_OPTIONS.find((o) => o.value === preference)?.icon ?? 'phone-portrait-outline'

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: t.colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile card */}
        <View style={s.profileCard}>
          <Avatar
            name={user?.name ?? user?.email ?? '?'}
            uri={user?.avatarUrl}
            size={80}
            radius={40}
          />
          {user?.name ? (
            <Text style={[t.type.titleLarge, { color: t.colors.onSurface, textAlign: 'center' }]}>
              {user.name}
            </Text>
          ) : null}
          <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant, textAlign: 'center' }]}>
            {user?.email}
          </Text>
        </View>

        {/* Preferences */}
        <Text style={[t.type.labelLarge, s.sectionLabel, { color: t.colors.onSurfaceVariant }]}>Preferences</Text>
        <Card style={s.group}>
          <Pressable onPress={onAppearance} style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}>
            <View style={[s.iconBox, { backgroundColor: t.colors.surfaceContainerHigh }]}>
              <Ionicons name={currentAppearanceIcon} size={20} color={t.colors.onSurfaceVariant} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>Appearance</Text>
              <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>{currentAppearanceLabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.colors.onSurfaceVariant} />
          </Pressable>
          <Pressable onPress={onEnableNotifications} style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}>
            <View style={[s.iconBox, { backgroundColor: t.colors.surfaceContainerHigh }]}>
              <Ionicons name="notifications-outline" size={20} color={t.colors.onSurfaceVariant} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.titleMedium, { color: t.colors.onSurface }]}>Notifications</Text>
              <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>Enable alerts on this device</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.colors.onSurfaceVariant} />
          </Pressable>
        </Card>

        {/* Sign out */}
        <Text style={[t.type.labelLarge, s.sectionLabel, { color: t.colors.onSurfaceVariant }]}>Account</Text>
        <Card style={s.group}>
          <Pressable onPress={onSignOut} style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}>
            <View style={[s.iconBox, { backgroundColor: t.colors.errorContainer }]}>
              <Ionicons name="log-out-outline" size={20} color={t.colors.error} />
            </View>
            <Text style={[t.type.titleMedium, { color: t.colors.error, flex: 1 }]}>Sign out</Text>
          </Pressable>
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    fill: { flex: 1 },
    scroll: { paddingHorizontal: 20, gap: 6 },
    profileCard: {
      alignItems: 'center',
      paddingVertical: 28,
      gap: 8,
    },
    sectionLabel: { marginTop: 16, marginBottom: 6, letterSpacing: 0.5 },
    group: { paddingVertical: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
    iconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  })
