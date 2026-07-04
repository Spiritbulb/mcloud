import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DrawerContentComponentProps, DrawerContentScrollView } from 'expo-router/drawer';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { ChatSession } from '@/types';
import { theme } from '@/theme';

/**
 * The Nuru drawer — near-full-width Recents list in the Claude reference's shape:
 * brand, "New chat", the session list, Notes pinned above a divider, and the
 * signed-in user with a settings gear in the footer.
 */
export function DrawerContent(props: DrawerContentComponentProps) {
  const { user } = useAuth();
  const { chat } = useApi();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // Refresh the list whenever the drawer regains focus (after a new message the
  // title/order may have changed).
  useFocusEffect(
    useCallback(() => {
      chat.listSessions().then(setSessions).catch(() => {});
    }, [chat]),
  );

  async function newChat() {
    const id = await chat.createSession();
    props.navigation.closeDrawer();
    router.push({ pathname: '/(tabs)', params: { sessionId: id } });
  }

  function openSession(id: string) {
    props.navigation.closeDrawer();
    router.push({ pathname: '/(tabs)', params: { sessionId: id } });
  }

  return (
    <View style={styles.container}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + theme.spacing.sm }]}
      >
        <View style={styles.brand}>
          <Logo size={30} />
          <Text style={styles.brandText}>Nuru</Text>
        </View>

        <Pressable onPress={newChat} style={styles.newChat} accessibilityLabel="New chat">
          <Feather name="edit" size={18} color={theme.colors.primary} />
          <Text style={styles.newChatLabel}>New chat</Text>
        </Pressable>

        <Text style={styles.section}>RECENTS</Text>
        {sessions.map((s) => (
          <Pressable key={s.id} onPress={() => openSession(s.id)} style={styles.row}>
            <Feather name="message-circle" size={16} color={theme.colors.textMuted} />
            <Text style={styles.rowLabel} numberOfLines={1}>{s.title || 'New chat'}</Text>
          </Pressable>
        ))}

        <View style={styles.divider} />

        <Pressable onPress={() => { props.navigation.closeDrawer(); router.push('/notes'); }} style={styles.row}>
          <Feather name="file-text" size={16} color={theme.colors.textMuted} />
          <Text style={styles.rowLabel}>Notes</Text>
        </Pressable>
      </DrawerContentScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name?.[0] ?? 'S').toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>{user?.name ?? 'Student'}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user?.email ?? ''}</Text>
        </View>
        <Pressable
          onPress={() => { props.navigation.closeDrawer(); router.push('/profile'); }}
          hitSlop={8}
          accessibilityLabel="Settings"
          style={styles.gear}
        >
          <Feather name="settings" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingTop: theme.spacing.sm },
  brand: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  brandText: { fontFamily: theme.fonts.display, fontSize: 24, color: theme.colors.text },
  newChat: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    marginHorizontal: theme.spacing.sm, paddingHorizontal: theme.spacing.md,
    paddingVertical: 11, borderRadius: theme.radii.md, marginBottom: theme.spacing.sm,
  },
  newChatLabel: { fontSize: 16, color: theme.colors.primary, fontWeight: '600' },
  section: {
    fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 1,
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    marginHorizontal: theme.spacing.sm, paddingHorizontal: theme.spacing.md,
    paddingVertical: 11, borderRadius: theme.radii.md,
  },
  rowLabel: { fontSize: 15, color: theme.colors.text, flex: 1 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginHorizontal: theme.spacing.md, marginVertical: theme.spacing.sm },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: theme.colors.primary },
  userName: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  userEmail: { color: theme.colors.textMuted, fontSize: 13 },
  gear: { padding: theme.spacing.xs },
});
