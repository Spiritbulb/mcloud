// Typed wrappers over the /api/mobile/* endpoints. All calls go through the
// authedFetch from AuthContext (bearer token + refresh-on-401).
import { File as ExpoFile } from 'expo-file-system'

export type Org = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  role: string
  canManage: boolean
}

export type Store = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  is_pro: boolean
  created_at: string
}

// ── Picker (mobile home) ────────────────────────────────────────────────────────

export type PickerStore = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  is_pro: boolean
}

export type PickerOrgGroup = Org & { stores: PickerStore[] }

export type PickerOtherStore = PickerStore & {
  orgSlug: string | null
  orgName: string | null
}

export type PickerData = {
  orgs: PickerOrgGroup[]
  otherStores: PickerOtherStore[]
}

// ── Store hub ───────────────────────────────────────────────────────────────────

export type StoreHub = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  is_pro: boolean
  custom_domain: string | null
  orgSlug: string | null
  role: string
  canManage: boolean
}

// ── Section types ───────────────────────────────────────────────────────────────

export type Product = {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  inventory_quantity: number | null
  track_inventory: boolean
  is_active: boolean
  images: string[]
  description: string | null
  sku: string | null
  barcode: string | null
  created_at: string | null
}

export type OrderItem = {
  id: string
  title: string
  quantity: number
  price: number
  image_url: string | null
}

export type Order = {
  id: string
  order_number: string
  status: string
  fulfillment_status: string | null
  total: number
  currency: string
  customer_phone: string | null
  customer_email: string | null
  items: OrderItem[]
  created_at: string | null
}

export type Branding = {
  name: string
  logo_url: string | null
  description: string | null
  currency: string
  role: string
  canManage: boolean
}

export type ManualMpesa = {
  enabled: boolean
  mpesa_type: 'till' | 'paybill'
  mpesa_till: string
  mpesa_paybill: string
  mpesa_account: string
  canManage: boolean
}

export type AnalyticsTotals = {
  totals?: { revenue?: number; orders?: number; visitors?: number; views?: number }
  previous?: { revenue?: number; orders?: number; visitors?: number; views?: number }
  [k: string]: unknown
}

type Fetch = (path: string, init?: RequestInit) => Promise<Response>

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`)
  }
  return data as T
}

export function api(authedFetch: Fetch) {
  return {
    async getPicker(): Promise<PickerData> {
      const res = await authedFetch('/api/mobile/picker')
      return json<PickerData>(res)
    },

    async getStoreHub(slug: string): Promise<StoreHub> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/hub`)
      return (await json<{ store: StoreHub }>(res)).store
    },

    async deleteStore(slug: string, confirm: string): Promise<void> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/hub`, {
        method: 'DELETE',
        body: JSON.stringify({ confirm }),
      })
      await json(res)
    },

    // Products
    async listProducts(slug: string): Promise<{ products: Product[]; role: string }> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/products`)
      return json<{ products: Product[]; role: string }>(res)
    },
    async createProduct(slug: string, input: { name: string; price: number; compare_at_price?: number | null; inventory_quantity?: number | null; track_inventory?: boolean; description?: string | null; sku?: string | null; barcode?: string | null }): Promise<Product> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/products`, { method: 'POST', body: JSON.stringify(input) })
      return (await json<{ product: Product }>(res)).product
    },
    async updateProduct(slug: string, id: string, patch: Partial<{ name: string; price: number; compare_at_price: number | null; inventory_quantity: number | null; track_inventory: boolean; is_active: boolean; images: string[]; description: string | null; sku: string | null; barcode: string | null }>): Promise<Product> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/products/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      return (await json<{ product: Product }>(res)).product
    },
    async deleteProduct(slug: string, id: string): Promise<void> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/products/${id}`, { method: 'DELETE' })
      await json(res)
    },

    // Orders
    async listOrders(slug: string): Promise<Order[]> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/orders`)
      return (await json<{ orders: Order[] }>(res)).orders
    },
    async updateOrderStatus(slug: string, id: string, fulfillment_status: string): Promise<Order> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ fulfillment_status }) })
      return (await json<{ order: Order }>(res)).order
    },
    async createManualOrder(slug: string, input: { lines: { product_id: string; quantity: number; price: number }[]; customer_phone?: string | null; customer_email?: string | null }): Promise<Order> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/orders`, { method: 'POST', body: JSON.stringify(input) })
      return (await json<{ order: Order }>(res)).order
    },

    async fulfillOrder(slug: string, id: string): Promise<Order> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fulfillment_status: 'fulfilled' }),
      })
      return (await json<{ order: Order }>(res)).order
    },

    // Branding
    async getBranding(slug: string): Promise<Branding> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/branding`)
      return (await json<{ branding: Branding }>(res)).branding
    },
    async updateBranding(slug: string, patch: Partial<{ name: string; logo_url: string | null; description: string | null }>): Promise<Branding> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/branding`, { method: 'PATCH', body: JSON.stringify(patch) })
      return (await json<{ branding: Branding }>(res)).branding
    },

    // Manual M-Pesa
    async getMpesa(slug: string): Promise<ManualMpesa> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/mpesa`)
      return (await json<{ mpesa: ManualMpesa }>(res)).mpesa
    },
    async updateMpesa(slug: string, patch: Partial<ManualMpesa>): Promise<ManualMpesa> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/mpesa`, { method: 'PATCH', body: JSON.stringify(patch) })
      return (await json<{ mpesa: ManualMpesa }>(res)).mpesa
    },

    // Today (combined unfulfilled orders + analytics — single request)
    async getToday(slug: string): Promise<{ unfulfilledOrders: Order[]; analytics: AnalyticsTotals }> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/today`)
      return json<{ unfulfilledOrders: Order[]; analytics: AnalyticsTotals }>(res)
    },

    // Analytics
    async getAnalytics(slug: string, days = 30): Promise<AnalyticsTotals> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/analytics?days=${days}`)
      return (await json<{ analytics: AnalyticsTotals }>(res)).analytics
    },

    async listOrgs(): Promise<Org[]> {
      const res = await authedFetch('/api/mobile/orgs')
      return (await json<{ orgs: Org[] }>(res)).orgs
    },

    async createOrg(name: string): Promise<{ id: string; slug: string }> {
      const res = await authedFetch('/api/mobile/orgs', { method: 'POST', body: JSON.stringify({ name }) })
      return (await json<{ org: { id: string; slug: string } }>(res)).org
    },

    async listStores(orgSlug: string): Promise<{ stores: Store[]; role: string; orgId: string }> {
      const res = await authedFetch(`/api/mobile/orgs/${orgSlug}/stores`)
      return json<{ stores: Store[]; role: string; orgId: string }>(res)
    },

    async createStore(orgSlug: string, input: { name: string; slug: string }): Promise<{ slug: string }> {
      const res = await authedFetch(`/api/mobile/orgs/${orgSlug}/stores`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
      return json<{ slug: string }>(res)
    },

    // Image upload — streams a local file to Supabase storage via the web API.
    // bucket: 'store-assets' | 'product-images'
    // path: e.g. `${storeId}/logo` or `${storeId}/products/${productId}`
    async uploadImage(localUri: string, bucket: 'store-assets' | 'product-images', path: string): Promise<string> {
      if (!localUri) throw new Error('No image to upload.')
      const cleanUri = localUri.split('?')[0].split('#')[0]
      const rawName = cleanUri.split('/').pop() || 'image.jpg'
      const ext = (rawName.includes('.') ? rawName.split('.').pop() : 'jpg')!.toLowerCase()
      // Give the part a name WITH an extension — some Android pick results have none.
      const filename = rawName.includes('.') ? rawName : `${rawName}.${ext}`

      // The global fetch in Expo is the WinterCG `expo/fetch`, whose multipart
      // serializer CANNOT consume React Native's `{ uri, name, type }` file part
      // (it throws "Unsupported FormDataPart implementation"). It only accepts a
      // Blob. expo-file-system's `File` implements Blob (with a `bytes()` method
      // and a populated `type`), so we append it DIRECTLY — do NOT slice() or wrap
      // it in a new Blob, which routes through RN's Blob ctor and throws
      // "Creating blobs from 'ArrayBuffer' ... are not supported".
      const file = new ExpoFile(localUri)
      const form = new FormData()
      form.append('file', file as unknown as Blob, filename)
      form.append('bucket', bucket)
      form.append('path', path)

      const res = await authedFetch('/api/mobile/upload', { method: 'POST', body: form })
      return (await json<{ url: string }>(res)).url
    },

    // Verify a Google Play subscription purchase server-side and grant the store Pro.
    async subscribePro(slug: string, input: { purchaseToken: string; productId: string }): Promise<{ ok: boolean; pro: boolean; expiresAt: string | null }> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/subscribe`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
      return json<{ ok: boolean; pro: boolean; expiresAt: string | null }>(res)
    },

    async registerPushToken(token: string, platform: string): Promise<void> {
      const res = await authedFetch('/api/mobile/push-token', {
        method: 'POST',
        body: JSON.stringify({ token, platform }),
      })
      await json(res)
    },

    // Update product images array
    async updateProductImages(slug: string, id: string, images: string[]): Promise<Product> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ images }),
      })
      return (await json<{ product: Product }>(res)).product
    },
  }
}
