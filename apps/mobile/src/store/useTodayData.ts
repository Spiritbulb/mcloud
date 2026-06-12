import * as React from 'react'
import { useAuth } from '@/auth/AuthContext'
import { api, type Order, type AnalyticsTotals } from '@/lib/api'

export type TodayData = {
  unfulfilledOrders: Order[]
  analytics: AnalyticsTotals | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useTodayData(storeSlug: string): TodayData {
  const { authedFetch } = useAuth()
  const client = React.useMemo(() => api(authedFetch), [authedFetch])

  const [unfulfilledOrders, setUnfulfilledOrders] = React.useState<Order[]>([])
  const [analytics, setAnalytics] = React.useState<AnalyticsTotals | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const [ordersRes, analyticsRes] = await Promise.all([
        client.listOrders(storeSlug),
        client.getAnalytics(storeSlug, 1),
      ])
      setUnfulfilledOrders(ordersRes.filter((o) => !o.fulfillment_status || o.fulfillment_status === 'unfulfilled'))
      setAnalytics(analyticsRes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [client, storeSlug])

  React.useEffect(() => { refresh() }, [refresh])

  return { unfulfilledOrders, analytics, loading, error, refresh }
}
