import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DrawerContentComponentProps, DrawerContentScrollView } from 'expo-router/drawer';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/theme';

const ITEMS: { route: string; label: string; glyph: string }[] = [
  { route: 'index', label: 'Chat', glyph: '✳' },
  { route: 'notes', label: 'Notes', glyph: '❒' },
  { route: 'profile', label: 'Profile', glyph: '◔' },
];

/**
 * The Nuru drawer — a slide-out menu in the Claude reference's shape: brand
 * header, a "New chat" action, the nav items above a divider, and the signed-in
 * user pinned to the footer with a settings gear.
 */
export function DrawerContent(props: DrawerContentComponentProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const activeRoute = props.state.routeNames[props.state.index];

  return (
    <View style={styles.container}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + theme.spacing.sm }]}
      >
        <View style={styles.brand}>
          <Logo size={34} />
          <Text style={styles.brandText}>Nuru</Text>
        </View>

        <Pressable
          onPress={() => props.navigation.navigate('index')}
          style={styles.newChat}
          accessibilityLabel="New chat"
        >
          <Text style={styles.newChatGlyph}>＋</Text>
          <Text style={styles.newChatLabel}>New chat</Text>
        </Pressable>

        <View style={styles.items}>
          {ITEMS.map((item) => {
            const active = activeRoute === item.route;
            return (
              <Pressable
                key={item.route}
                onPress={() => props.navigation.navigate(item.route)}
                style={[styles.item, active && styles.itemActive]}
              >
                <Text style={[styles.glyph, active && styles.textActive]}>{item.glyph}</Text>
                <Text style={[styles.label, active && styles.textActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />
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
          onPress={() => props.navigation.navigate('profile')}
          hitSlop={8}
          accessibilityLabel="Settings"
          style={styles.gear}
        >
          <Text style={styles.gearGlyph}>⚙</Text>
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
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  brandText: { fontFamily: theme.fonts.display, fontSize: 26, color: theme.colors.text },
  newChat: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    marginHorizontal: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md, paddingVertical: 14,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.sm,
  },
  newChatGlyph: { fontSize: 20, color: theme.colors.primary, width: 22, textAlign: 'center' },
  newChatLabel: { fontSize: 16, color: theme.colors.primary, fontWeight: '600' },
  items: { paddingHorizontal: theme.spacing.sm, gap: 4 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: 16, borderRadius: theme.radii.md,
  },
  itemActive: { backgroundColor: theme.colors.surfaceAlt },
  glyph: { fontSize: 18, color: theme.colors.textMuted, width: 22, textAlign: 'center' },
  label: { fontSize: 16, color: theme.colors.textMuted, fontWeight: '500' },
  textActive: { color: theme.colors.primary },
  divider: {
    height: 1, backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md,
  },
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
  gearGlyph: { fontSize: 18, color: theme.colors.textMuted },
});
