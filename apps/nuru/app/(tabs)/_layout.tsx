import { Drawer } from 'expo-router/drawer';
import { Pressable, Text, Dimensions } from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerContent } from '@/components/DrawerContent';
import { useTheme } from '@/context/ThemeContext';

function MenuButton() {
  const { theme } = useTheme();
  const navigation = useNavigation() as unknown as { toggleDrawer: () => void };
  return (
    <Pressable
      onPress={() => navigation.toggleDrawer()}
      hitSlop={12}
      accessibilityLabel="Open menu"
      style={{ paddingHorizontal: theme.spacing.md }}
    >
      <Text style={{ fontSize: 22, color: theme.colors.text }}>☰</Text>
    </Pressable>
  );
}

export default function DrawerLayout() {
  const { theme } = useTheme();
  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.text },
        headerTintColor: theme.colors.text,
        headerLeft: () => <MenuButton />,
        drawerStyle: { backgroundColor: theme.colors.bg, width: Dimensions.get('window').width * 0.95 },
        swipeEdgeWidth: 60,
      }}
    >
      <Drawer.Screen name="index" options={{ title: 'Chat' }} />
      <Drawer.Screen name="notes" options={{ title: 'Notes' }} />
      <Drawer.Screen name="profile" options={{ title: 'Profile' }} />
    </Drawer>
  );
}
