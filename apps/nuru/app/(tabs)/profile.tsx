import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { useTheme, Pref } from '@/context/ThemeContext';
import { Theme } from '@/theme';

const OPTIONS: { label: string; value: Pref }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function Profile() {
  const { user, signOut } = useAuth();
  const { theme, pref, setPref } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(user?.name?.[0] ?? 'S').toUpperCase()}</Text>
      </View>
      <Text style={[theme.typography.title, { textAlign: 'center' }]}>{user?.name ?? 'Student'}</Text>
      <Text style={[theme.typography.muted, { textAlign: 'center', marginBottom: theme.spacing.xl }]}>
        {user?.email ?? ''}
      </Text>

      <Text style={[theme.typography.body, { marginBottom: theme.spacing.sm }]}>Appearance</Text>
      <View style={styles.segment}>
        {OPTIONS.map((opt) => {
          const active = pref === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setPref(opt.value)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[theme.typography.muted, { marginTop: theme.spacing.sm, marginBottom: theme.spacing.xl }]}>
        System follows your device. Light is the default.
      </Text>

      <Button title="Sign out" variant="ghost" onPress={handleSignOut} />
    </Screen>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    avatar: {
      alignSelf: 'center', width: 84, height: 84, borderRadius: 42,
      backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center',
      marginTop: theme.spacing.lg, marginBottom: theme.spacing.md,
    },
    avatarText: { fontSize: 34, fontWeight: '700', color: theme.colors.primary },
    segment: {
      flexDirection: 'row', backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border,
      padding: 3, gap: 3,
    },
    segmentItem: {
      flex: 1, paddingVertical: 10, borderRadius: theme.radii.sm, alignItems: 'center',
    },
    segmentItemActive: { backgroundColor: theme.colors.primary },
    segmentText: { fontSize: 15, fontWeight: '600', color: theme.colors.textMuted },
    segmentTextActive: { color: theme.colors.onPrimary },
  });
}
