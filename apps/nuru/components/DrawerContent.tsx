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
 * header up top, the nav items, and the signed-in user pinned to the footer.
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
      </DrawerContentScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name?.[0] ?? 'S').toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>{user?.name ?? 'Student'}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user?.email ?? ''}</Text>
        </View>
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
    marginBottom: theme.spacing.md,
  },
  brandText: { fontFamily: theme.fonts.display, fontSize: 26, color: theme.colors.text },
  items: { paddingHorizontal: theme.spacing.sm, gap: 2 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: 14, borderRadius: theme.radii.md,
  },
  itemActive: { backgroundColor: theme.colors.surfaceAlt },
  glyph: { fontSize: 18, color: theme.colors.textMuted, width: 22, textAlign: 'center' },
  label: { fontSize: 16, color: theme.colors.textMuted, fontWeight: '500' },
  textActive: { color: theme.colors.primary },
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
});
