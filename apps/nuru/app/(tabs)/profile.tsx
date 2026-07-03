import { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/theme';

export default function Profile() {
  const { user, signOut } = useAuth();
  const [dark, setDark] = useState(false); // placeholder toggle (not wired)
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <Screen>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(user?.name?.[0] ?? 'S').toUpperCase()}</Text>
      </View>
      <Text style={[theme.typography.title, { textAlign: 'center' }]}>{user?.name ?? 'Student'}</Text>
      <Text style={[theme.typography.muted, { textAlign: 'center', marginBottom: theme.spacing.xl }]}>
        {user?.email ?? ''}
      </Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={theme.typography.body}>Light theme</Text>
          <Text style={[theme.typography.muted, { marginTop: 2 }]}>Currently dark</Text>
        </View>
        <Switch
          value={dark}
          onValueChange={setDark}
          trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceAlt }}
          thumbColor={theme.colors.text}
        />
      </View>
      <Text style={[theme.typography.muted, { marginTop: theme.spacing.sm, marginBottom: theme.spacing.xl }]}>
        Light mode lands with the backend.
      </Text>

      <Button title="Sign out" variant="ghost" onPress={handleSignOut} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  avatar: { alignSelf: 'center', width: 84, height: 84, borderRadius: 42,
    backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center',
    marginTop: theme.spacing.lg, marginBottom: theme.spacing.md },
  avatarText: { fontSize: 34, fontWeight: '700', color: theme.colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.surface, padding: theme.spacing.md,
    borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border },
});
