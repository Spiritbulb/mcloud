// Loads the active store ONCE at the store-tabs layout level and shares it to all
// tabs (Overview / Products / Orders / More), so switching tabs doesn't refetch.
import * as React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/auth/AuthContext'
import { type StoreHub } from '@/lib/api'
import { useDemoApi } from '@/demo/demoApi'

type StoreState = {
  slug: string
  store: StoreHub | null
  loading: boolean
  error: string | null
  canManage: boolean
  refresh: () => Promise<void>
}

const StoreContext = React.createContext<StoreState | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { storeSlug } = useLocalSearchParams<{ storeSlug: string }>()
  const { authedFetch } = useAuth()
  const client = useDemoApi(authedFetch)

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

  const value = React.useMemo<StoreState>(
    () => ({ slug: storeSlug, store, loading, error, canManage: store?.canManage ?? false, refresh }),
    [storeSlug, store, loading, error, refresh],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreState {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>')
  return ctx
}
