import type { Product, Order, OrderItem, AnalyticsTotals, StoreHub, Branding, ManualMpesa } from '@/lib/api'

let _orderCounter = 1042

export function nextOrderNumber(): string {
  return `#${++_orderCounter}`
}

export const DEMO_STORE_HUB: StoreHub = {
  id: 'demo-store-id',
  name: 'Savanna Threads',
  slug: 'demo',
  logo_url: 'https://api.dicebear.com/7.x/initials/png?seed=Savanna+Threads&backgroundColor=4CAF50',
  is_pro: true,
  custom_domain: null,
  orgSlug: 'demo-org',
  role: 'owner',
  canManage: true,
}

export const DEMO_BRANDING: Branding = {
  name: 'Savanna Threads',
  logo_url: DEMO_STORE_HUB.logo_url,
  description: 'Authentic African fashion — designed in Nairobi, worn everywhere.',
  currency: 'KES',
  role: 'owner',
  canManage: true,
}

export const DEMO_MPESA: ManualMpesa = {
  enabled: true,
  mpesa_type: 'till',
  mpesa_till: '4081234',
  mpesa_paybill: '',
  mpesa_account: '',
  canManage: true,
}

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Ankara Midi Dress',
    slug: 'ankara-midi-dress',
    price: 3200,
    compare_at_price: 4000,
    inventory_quantity: 12,
    track_inventory: true,
    is_active: true,
    images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80'],
    description: 'Vibrant Ankara print, midi length, side pockets.',
    sku: 'AMD-001',
    barcode: null,
    created_at: new Date(Date.now() - 30 * 864e5).toISOString(),
  },
  {
    id: 'prod-2',
    name: 'Kikoi Beach Wrap',
    slug: 'kikoi-beach-wrap',
    price: 1200,
    compare_at_price: null,
    inventory_quantity: 30,
    track_inventory: true,
    is_active: true,
    images: ['https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=400&q=80'],
    description: 'Hand-woven kikoi, perfect for the beach or the city.',
    sku: 'KBW-002',
    barcode: null,
    created_at: new Date(Date.now() - 20 * 864e5).toISOString(),
  },
  {
    id: 'prod-3',
    name: 'Maasai Beaded Bracelet',
    slug: 'maasai-beaded-bracelet',
    price: 650,
    compare_at_price: null,
    inventory_quantity: 50,
    track_inventory: false,
    is_active: true,
    images: ['https://images.unsplash.com/photo-1611601322175-ef8ec8c5e9e5?w=400&q=80'],
    description: 'Handcrafted by Maasai artisans in the Rift Valley.',
    sku: 'MBB-003',
    barcode: null,
    created_at: new Date(Date.now() - 10 * 864e5).toISOString(),
  },
]

const CUSTOMER_NAMES = [
  { phone: '+254712345678', email: null },
  { phone: null, email: 'amina.k@gmail.com' },
  { phone: '+254798765432', email: null },
  { phone: null, email: 'brian.o@outlook.com' },
  { phone: '+254722001122', email: null },
  { phone: null, email: null },
]

function randomCustomer() {
  return CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)]
}

function randomProduct(): Product {
  return DEMO_PRODUCTS[Math.floor(Math.random() * DEMO_PRODUCTS.length)]
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  const product = randomProduct()
  const qty = Math.floor(Math.random() * 3) + 1
  const item: OrderItem = {
    id: `item-${Date.now()}`,
    title: product.name,
    quantity: qty,
    price: product.price,
    image_url: product.images[0] ?? null,
  }
  const customer = randomCustomer()
  return {
    id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    order_number: nextOrderNumber(),
    status: 'open',
    fulfillment_status: 'unfulfilled',
    total: product.price * qty,
    currency: 'KES',
    customer_phone: customer.phone,
    customer_email: customer.email,
    items: [item],
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

export const DEMO_ORDERS: Order[] = [
  makeOrder({ id: 'order-seed-1', order_number: '#1039', fulfillment_status: 'unfulfilled', total: 3200, items: [{ id: 'i1', title: 'Ankara Midi Dress', quantity: 1, price: 3200, image_url: DEMO_PRODUCTS[0].images[0] ?? null }], customer_phone: '+254712345678', customer_email: null }),
  makeOrder({ id: 'order-seed-2', order_number: '#1040', fulfillment_status: 'fulfilled',   total: 2400, items: [{ id: 'i2', title: 'Kikoi Beach Wrap',   quantity: 2, price: 1200, image_url: DEMO_PRODUCTS[1].images[0] ?? null }], customer_phone: null, customer_email: 'amina.k@gmail.com' }),
  makeOrder({ id: 'order-seed-3', order_number: '#1041', fulfillment_status: 'unfulfilled', total: 1300, items: [{ id: 'i3', title: 'Maasai Beaded Bracelet', quantity: 2, price: 650, image_url: DEMO_PRODUCTS[2].images[0] ?? null }], customer_phone: '+254798765432', customer_email: null }),
  makeOrder({ id: 'order-seed-4', order_number: '#1042', fulfillment_status: 'partial',     total: 3850, items: [{ id: 'i4', title: 'Ankara Midi Dress', quantity: 1, price: 3200, image_url: DEMO_PRODUCTS[0].images[0] ?? null }, { id: 'i5', title: 'Maasai Beaded Bracelet', quantity: 1, price: 650, image_url: DEMO_PRODUCTS[2].images[0] ?? null }], customer_phone: null, customer_email: 'brian.o@outlook.com' }),
]

export const DEMO_TODAY_ANALYTICS: AnalyticsTotals = {
  totals: { revenue: 8950, orders: 4, visitors: 23, views: 41 },
  previous: { revenue: 6200, orders: 3, visitors: 18, views: 30 },
}

export const DEMO_30DAY_ANALYTICS: AnalyticsTotals = {
  totals: { revenue: 187400, orders: 72, visitors: 1340, views: 2810 },
  previous: { revenue: 158200, orders: 61, visitors: 1120, views: 2340 },
}
