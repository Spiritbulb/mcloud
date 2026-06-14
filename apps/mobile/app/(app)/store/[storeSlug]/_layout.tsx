// Store-level bottom tabs. The merchant works INSIDE a store, switching between
// Overview · Products · Orders · More. Branding / M-Pesa / Analytics / Danger live
// under More (pushed as stack screens, not tabs, to keep the bar clean).
//
// Swipe-between-tabs (react-native-pager-view) is queued for the next native build;
// for now tabs switch on tap via expo-router Tabs (no rebuild needed).
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StoreProvider } from '@/store/StoreContext'
import { useTheme } from '@/lib/theme'

export default function StoreTabsLayout() {
  const t = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <StoreProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.onSurface,
        tabBarInactiveTintColor: t.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: t.colors.surfaceContainer,
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <Ionicons name="sunny-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => <Ionicons name="pricetags-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color} />,
        }}
      />

      {/* Stack screens pushed from the More tab — hidden from the tab bar. */}
      <Tabs.Screen name="branding" options={{ href: null }} />
      <Tabs.Screen name="mpesa" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
    </Tabs>
    </StoreProvider>
  )
}
