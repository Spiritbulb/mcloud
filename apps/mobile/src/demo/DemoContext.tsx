import * as React from 'react'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Vibration } from 'react-native'
import {
  DEMO_ORDERS,
  DEMO_PRODUCTS,
  DEMO_TODAY_ANALYTICS,
  DEMO_30DAY_ANALYTICS,
  makeOrder,
} from './fixtures'
import type { Product, Order, AnalyticsTotals } from '@/lib/api'

const DEMO_KEY = 'mcloud.demo.enabled'

type DemoState = {
  isDemoMode: boolean
  toggleDemo: () => void
  products: Product[]
  orders: Order[]
  todayAnalytics: AnalyticsTotals
  analyticsData: AnalyticsTotals
  updateOrderStatus: (id: string, status: string) => void
  addOrder: (order: Order) => void
  upsertProduct: (product: Product) => void
  deleteProduct: (id: string) => void
}

export const DemoContext = React.createContext<DemoState | null>(null)

function cloneInitialState() {
  return {
    products: DEMO_PRODUCTS.map((p) => ({ ...p })),
    orders: DEMO_ORDERS.map((o) => ({ ...o })),
    todayAnalytics: JSON.parse(JSON.stringify(DEMO_TODAY_ANALYTICS)) as AnalyticsTotals,
    analyticsData: JSON.parse(JSON.stringify(DEMO_30DAY_ANALYTICS)) as AnalyticsTotals,
  }
}

async function fireNewOrderNotification(order: Order) {
  try {
    const perm = await Notifications.getPermissionsAsync()
    if (perm.status !== 'granted') return
    const customer = order.customer_phone ?? order.customer_email ?? 'Customer'
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New order arrived',
        body: `${order.order_number} from ${customer} · KES ${order.total.toLocaleString()}`,
        data: { screen: 'orders' },
      },
      trigger: null, // fire immediately
    })
  } catch {}
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = React.useState(false)
  const [state, setState] = React.useState(cloneInitialState)

  // Persist demo flag across restarts
  React.useEffect(() => {
    AsyncStorage.getItem(DEMO_KEY).then((v) => {
      if (v === '1') setIsDemoMode(true)
    })
  }, [])

  const toggleDemo = React.useCallback(() => {
    setIsDemoMode((prev) => {
      const next = !prev
      AsyncStorage.setItem(DEMO_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  React.useEffect(() => {
    if (!isDemoMode) {
      setState(cloneInitialState())
    }
  }, [isDemoMode])

  // Simulation loop
  React.useEffect(() => {
    if (!isDemoMode) return

    const tick = () => {
      const roll = Math.random()

      if (roll < 0.40) {
        // New order arrives
        const order = makeOrder()
        setState((s) => {
          const totals = s.todayAnalytics.totals ?? {}
          const prev = s.todayAnalytics.previous ?? {}
          return {
            ...s,
            orders: [order, ...s.orders],
            todayAnalytics: {
              totals: {
                ...totals,
                revenue: (totals.revenue ?? 0) + order.total,
                orders: (totals.orders ?? 0) + 1,
              },
              previous: prev,
            },
          }
        })
        fireNewOrderNotification(order)
        Vibration.vibrate(80)
      } else if (roll < 0.75) {
        // Auto-fulfill oldest unfulfilled order
        setState((s) => {
          const idx = s.orders.findIndex((o) => o.fulfillment_status === 'unfulfilled')
          if (idx === -1) return s
          const updated = s.orders.map((o, i) =>
            i === idx ? { ...o, fulfillment_status: 'fulfilled' } : o,
          )
          return { ...s, orders: updated }
        })
      } else {
        // Revenue tick — small web sale
        const tickAmount = Math.floor(Math.random() * 800) + 200
        setState((s) => {
          const totals = s.todayAnalytics.totals ?? {}
          const prev = s.todayAnalytics.previous ?? {}
          return {
            ...s,
            todayAnalytics: {
              totals: { ...totals, revenue: (totals.revenue ?? 0) + tickAmount },
              previous: prev,
            },
          }
        })
      }

      schedule()
    }

    let timerId: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      const delay = 8000 + Math.random() * 4000
      timerId = setTimeout(tick, delay)
    }

    schedule()
    return () => clearTimeout(timerId)
  }, [isDemoMode])

  const updateOrderStatus = React.useCallback((id: string, status: string) => {
    setState((s) => ({
      ...s,
      orders: s.orders.map((o) => o.id === id ? { ...o, fulfillment_status: status } : o),
    }))
  }, [])

  const addOrder = React.useCallback((order: Order) => {
    setState((s) => ({ ...s, orders: [order, ...s.orders] }))
  }, [])

  const upsertProduct = React.useCallback((product: Product) => {
    setState((s) => {
      const exists = s.products.some((p) => p.id === product.id)
      return {
        ...s,
        products: exists
          ? s.products.map((p) => p.id === product.id ? product : p)
          : [product, ...s.products],
      }
    })
  }, [])

  const deleteProduct = React.useCallback((id: string) => {
    setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }))
  }, [])

  const value = React.useMemo<DemoState>(
    () => ({
      isDemoMode,
      toggleDemo,
      ...state,
      updateOrderStatus,
      addOrder,
      upsertProduct,
      deleteProduct,
    }),
    [isDemoMode, toggleDemo, state, updateOrderStatus, addOrder, upsertProduct, deleteProduct],
  )

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo(): DemoState {
  const ctx = React.useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within <DemoProvider>')
  return ctx
}
