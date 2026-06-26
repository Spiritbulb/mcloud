import * as React from 'react'
import { api, type Product, type Order } from '@/lib/api'
import { useDemo } from './DemoContext'
import { DEMO_STORE_HUB, DEMO_BRANDING, DEMO_MPESA, makeOrder } from './fixtures'

type Fetch = (path: string, init?: RequestInit) => Promise<Response>

/** Drop-in replacement for api(authedFetch). Routes calls through mock state when demo mode is on. */
export function useDemoApi(authedFetch: Fetch): ReturnType<typeof api> {
  const demo = useDemo()
  const real = React.useMemo(() => api(authedFetch), [authedFetch])

  return React.useMemo(() => {
    if (!demo.isDemoMode) return real

    return {
      ...real,

      async getStoreHub(_slug: string) {
        return { ...DEMO_STORE_HUB }
      },

      async listProducts(_slug: string) {
        return { products: demo.products.map((p) => ({ ...p })), role: 'owner' }
      },

      async createProduct(_slug: string, input: Parameters<typeof real.createProduct>[1]) {
        const product: Product = {
          id: `prod-${Date.now()}`,
          slug: input.name.toLowerCase().replace(/\s+/g, '-'),
          images: [],
          is_active: true,
          created_at: new Date().toISOString(),
          barcode: input.barcode ?? null,
          description: input.description ?? null,
          sku: input.sku ?? null,
          compare_at_price: input.compare_at_price ?? null,
          inventory_quantity: input.inventory_quantity ?? null,
          track_inventory: input.track_inventory ?? false,
          ...input,
        }
        demo.upsertProduct(product)
        return product
      },

      async updateProduct(_slug: string, id: string, patch: Parameters<typeof real.updateProduct>[2]) {
        const existing = demo.products.find((p) => p.id === id)
        if (!existing) throw new Error('Product not found')
        const updated: Product = { ...existing, ...patch }
        demo.upsertProduct(updated)
        return updated
      },

      async deleteProduct(_slug: string, id: string) {
        demo.deleteProduct(id)
      },

      async listOrders(_slug: string) {
        return demo.orders.map((o) => ({ ...o }))
      },

      async updateOrderStatus(_slug: string, id: string, fulfillment_status: string) {
        const order = demo.orders.find((o) => o.id === id)
        if (!order) throw new Error('Order not found')
        const updated: Order = { ...order, fulfillment_status }
        demo.updateOrderStatus(id, fulfillment_status)
        return updated
      },

      async fulfillOrder(_slug: string, id: string) {
        const order = demo.orders.find((o) => o.id === id)
        if (!order) throw new Error('Order not found')
        const updated: Order = { ...order, fulfillment_status: 'fulfilled' }
        demo.updateOrderStatus(id, 'fulfilled')
        return updated
      },

      async createManualOrder(_slug: string, input: Parameters<typeof real.createManualOrder>[1]) {
        const lines = input.lines.map((l) => {
          const product = demo.products.find((p) => p.id === l.product_id)
          return {
            id: `item-${Date.now()}-${l.product_id}`,
            title: product?.name ?? 'Product',
            quantity: l.quantity,
            price: l.price,
            image_url: product?.images[0] ?? null,
          }
        })
        const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
        const order = makeOrder({
          items: lines,
          total,
          customer_phone: input.customer_phone ?? null,
          customer_email: input.customer_email ?? null,
        })
        demo.addOrder(order)
        return order
      },

      async getToday(_slug: string) {
        const unfulfilledOrders = demo.orders.filter(
          (o) => o.fulfillment_status === 'unfulfilled',
        )
        return { unfulfilledOrders, analytics: demo.todayAnalytics }
      },

      async getAnalytics(_slug: string, _days?: number) {
        return demo.analyticsData
      },

      async getBranding(_slug: string) {
        return { ...DEMO_BRANDING }
      },

      async updateBranding(_slug: string, patch: Parameters<typeof real.updateBranding>[1]) {
        return { ...DEMO_BRANDING, ...patch }
      },

      async getMpesa(_slug: string) {
        return { ...DEMO_MPESA }
      },

      async updateMpesa(_slug: string, patch: Parameters<typeof real.updateMpesa>[1]) {
        return { ...DEMO_MPESA, ...patch }
      },

      // These are no-ops in demo mode — silently succeed
      async deleteStore(_slug: string, _confirm: string) {},
      async uploadImage(_uri: string, _bucket: 'store-assets' | 'product-images', _path: string) { return '' },
      async subscribePro(_slug: string, _input: Parameters<typeof real.subscribePro>[1]) { return { ok: true, pro: true, expiresAt: null } },
      async registerPushToken(_token: string, _platform: string) {},
      async updateProductImages(_slug: string, id: string, images: string[]) {
        const existing = demo.products.find((p) => p.id === id)
        if (!existing) throw new Error('Product not found')
        const updated: Product = { ...existing, images }
        demo.upsertProduct(updated)
        return updated
      },
    }
  }, [demo, real])
}
