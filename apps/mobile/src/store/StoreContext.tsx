// Loads the active store ONCE at the store-tabs layout level and shares it to all
// tabs (Today / Products / Orders / More), so switching tabs doesn't refetch.
//
// Also owns the store switcher sheet (moved here from the picker screen) — any tab
// can call openSwitcher() to let the merchant jump to a different store without
// leaving the store-tabs stack. Reuses the same /api/mobile/picker data the home
// screen uses, so there's one source of truth for "which stores can this user see."
import * as React from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAuth } from '@/auth/AuthContext'
import { api, type StoreHub, type PickerData, type PickerStore, type PickerOtherStore } from '@/lib/api'
import { Avatar } from '@/components/ui'
import { useTheme, type Theme } from '@/lib/theme'

type StoreState = {
  slug: string
  store: StoreHub | null
  loading: boolean
  error: string | null
  canManage: boolean
  refresh: () => Promise<void>
  openSwitcher: () => void
}

const StoreContext = React.createContext<StoreState | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const t = useTheme()
  const router = useRouter()
  const { storeSlug } = useLocalSearchParams<{ storeSlug: string }>()
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [store, setStore] = React.useState<StoreHub | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setError(null)
    try {
      setStore(await client.getStoreHub(storeSlug))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [client, storeSlug])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  // ── Switcher sheet ──────────────────────────────────────────────────────
  const [switcherOpen, setSwitcherOpen] = React.useState(false)
  const [picker, setPicker] = React.useState<PickerData | null>(null)
  const [pickerLoading, setPickerLoading] = React.useState(false)
  const pickerLoaded = React.useRef(false)

  const openSwitcher = React.useCallback(() => {
    setSwitcherOpen(true)
    if (!pickerLoaded.current) {
      setPickerLoading(true)
      client.getPicker()
        .then((d) => { setPicker(d); pickerLoaded.current = true })
        .catch(() => {})
        .finally(() => setPickerLoading(false))
    }
  }, [client])

  const allStores = React.useMemo<Array<PickerStore & { orgName: string | null }>>(() => {
    if (!picker) return []
    const fromOrgs: Array<PickerStore & { orgName: string | null }> = picker.orgs.flatMap((org) =>
      org.stores.map((st) => ({ ...st, orgName: org.name }))
    )
    const other: Array<PickerStore & { orgName: string | null }> = picker.otherStores.map((st) => ({
      ...st,
      orgName: st.orgName,
    }))
    return [...fromOrgs, ...other]
  }, [picker])

  const value = React.useMemo<StoreState>(
    () => ({ slug: storeSlug, store, loading, error, canManage: store?.canManage ?? false, refresh, openSwitcher }),
    [storeSlug, store, loading, error, refresh, openSwitcher],
  )

  return (
    <StoreContext.Provider value={value}>
      {children}

      <Modal visible={switcherOpen} animationType="slide" transparent onRequestClose={() => setSwitcherOpen(false)}>
        <Pressable style={switcherStyles.backdrop} onPress={() => setSwitcherOpen(false)}>
          <Pressable
            style={[switcherStyles.sheet, { backgroundColor: t.colors.surfaceContainer }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[switcherStyles.handle, { backgroundColor: t.colors.outlineVariant }]} />
            <Text style={[t.type.titleMedium, { color: t.colors.onSurface, marginBottom: 12 }]}>Switch store</Text>

            {pickerLoading && allStores.length === 0 ? (
              <ActivityIndicator color={t.colors.primary} style={{ paddingVertical: 20 }} />
            ) : allStores.length === 0 ? (
              <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant, paddingVertical: 12 }]}>
                Couldn't load your stores.
              </Text>
            ) : (
              <FlatList
                data={allStores}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setSwitcherOpen(false)
                      if (item.slug !== storeSlug) {
                        router.push({ pathname: '/switch', params: { slug: item.slug } } as never)
                      }
                    }}
                    style={({ pressed }) => [switcherStyles.row, pressed && { opacity: 0.7 }]}
                  >
                    <Avatar name={item.name} uri={item.logo_url} size={36} radius={10} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[t.type.bodyLarge, { color: t.colors.onSurface }]} numberOfLines={1}>{item.name}</Text>
                      {item.orgName && (
                        <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]} numberOfLines={1}>
                          {item.orgName}
                        </Text>
                      )}
                    </View>
                    {item.slug === storeSlug && (
                      <View style={[switcherStyles.currentDot, { backgroundColor: t.colors.primary }]} />
                    )}
                  </Pressable>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </StoreContext.Provider>
  )
}

export function useStore(): StoreState {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>')
  return ctx
}

const switcherStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '65%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  currentDot: { width: 8, height: 8, borderRadius: 4 },
})