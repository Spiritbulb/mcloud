'use server'
// Products, variants and services for the settings screens. Every action authorizes the
// caller against the store (see ./access) and scopes each query by store_id. Plan limits
// are enforced here, which direct browser inserts never did.
import { createClient } from '@mcloud/db/server'
import type { Json } from '@mcloud/db/types'
import { PLAN_LIMITS, isOverLimit, limitMessage } from '@mcloud/merchant/plans'
import { getStorePlan } from '@mcloud/merchant/plans-server'
import { requireManagedStore, type ActionResult } from './access'

const MAX_JSON_BYTES = 200_000

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

// ── Products ────────────────────────────────────────────────────────────────

export interface ProductInput {
    name: string
    slug: string
    description: string | null
    price: number
    compare_at_price: number | null
    sku: string | null
    inventory_quantity: number
    track_inventory: boolean
    is_active: boolean
    images: string[]
}

export interface VariantInput {
    id?: string
    name: string
    sku: string | null
    price: number
    compare_at_price: number | null
    inventory_quantity: number
    is_active: boolean
    options: Record<string, string>
}

const PRODUCT_COLUMNS =
    'id, name, slug, description, price, compare_at_price, inventory_quantity, is_active, images, sku, track_inventory'

export async function listProducts(storeId: string) {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return { ok: false as const, error: gate.error }
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_COLUMNS)
        .eq('store_id', gate.storeId)
        .order('created_at', { ascending: false })
    if (error) return { ok: false as const, error: 'Could not load products' }
    return { ok: true as const, products: data ?? [] }
}

export async function listProductVariants(storeId: string, productId: string) {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return { ok: false as const, error: gate.error }
    const supabase = await createClient()
    // Prove the product is this store's before returning its variants.
    const { data: product } = await supabase
        .from('products').select('id').eq('id', productId).eq('store_id', gate.storeId).maybeSingle()
    if (!product) return { ok: false as const, error: 'Product not found' }
    const { data } = await supabase
        .from('product_variants').select('*').eq('product_id', productId).order('position')
    return { ok: true as const, variants: data ?? [] }
}

export async function saveProduct(
    storeId: string,
    productId: string | null,
    input: ProductInput,
    variants: VariantInput[],
): Promise<ActionResult<{ id: string }>> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate

    const name = text(input?.name, 200).trim()
    const price = num(input?.price)
    if (!name || price === null || price < 0) return { ok: false, error: 'Name and a valid price are required.' }
    if (!Array.isArray(variants) || variants.length > 100) return { ok: false, error: 'Too many variants.' }

    const supabase = await createClient()

    const payload = {
        store_id: gate.storeId,
        name,
        slug: text(input.slug, 200).trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        description: input.description ? text(input.description, 20_000) : null,
        price,
        compare_at_price: num(input.compare_at_price),
        sku: input.sku ? text(input.sku, 100) : null,
        inventory_quantity: Math.max(0, Math.floor(num(input.inventory_quantity) ?? 0)),
        track_inventory: !!input.track_inventory,
        is_active: !!input.is_active,
        images: (Array.isArray(input.images) ? input.images : []).filter((u) => typeof u === 'string').slice(0, 20),
        updated_at: new Date().toISOString(),
    }

    let id = productId
    if (id) {
        const { data, error } = await supabase
            .from('products').update(payload).eq('id', id).eq('store_id', gate.storeId).select('id').maybeSingle()
        if (error || !data) return { ok: false, error: 'Could not save the product.' }
    } else {
        // Plan ceiling: block creating a product past the tier's limit.
        const plan = await getStorePlan(gate.storeId)
        const limit = PLAN_LIMITS[plan].products
        const { count } = await supabase
            .from('products').select('id', { count: 'exact', head: true }).eq('store_id', gate.storeId)
        if (isOverLimit(count ?? 0, limit)) return { ok: false, error: limitMessage(plan, 'products', limit) }

        const { data, error } = await supabase.from('products').insert(payload).select('id').single()
        if (error || !data) return { ok: false, error: 'Could not create the product.' }
        id = data.id
    }

    for (let i = 0; i < variants.length; i++) {
        const v = variants[i]
        const varPayload = {
            product_id: id,
            name: text(v.name, 200),
            sku: v.sku ? text(v.sku, 100) : null,
            price: num(v.price) ?? price,
            compare_at_price: num(v.compare_at_price),
            inventory_quantity: Math.max(0, Math.floor(num(v.inventory_quantity) ?? 0)),
            is_active: !!v.is_active,
            options: (v.options && typeof v.options === 'object' ? v.options : {}) as Json,
            position: i,
            updated_at: new Date().toISOString(),
        }
        if (v.id) {
            // `product_id` in the filter keeps a forged variant id from touching another product.
            await supabase.from('product_variants').update(varPayload).eq('id', v.id).eq('product_id', id)
        } else {
            await supabase.from('product_variants').insert(varPayload)
        }
    }
    return { ok: true, id }
}

export async function deleteProduct(storeId: string, productId: string): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    const supabase = await createClient()
    const { error } = await supabase.from('products').delete().eq('id', productId).eq('store_id', gate.storeId)
    return error ? { ok: false, error: 'Could not delete the product.' } : { ok: true }
}

export async function setProductActive(storeId: string, productId: string, active: boolean): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    const supabase = await createClient()
    const { error } = await supabase
        .from('products').update({ is_active: !!active }).eq('id', productId).eq('store_id', gate.storeId)
    return error ? { ok: false, error: 'Could not update the product.' } : { ok: true }
}

// ── Services ────────────────────────────────────────────────────────────────

export interface ServiceInput {
    name: string
    slug: string
    description: string | null
    item_type: 'service'
    price: number
    compare_at_price: null
    sku: string | null
    is_active: boolean
    metadata: Record<string, unknown>
}

const SERVICE_COLUMNS = 'id, name, slug, description, price, is_active, sku, metadata'

export async function listServices(storeId: string) {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return { ok: false as const, error: gate.error }
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('services')
        .select(SERVICE_COLUMNS)
        .eq('store_id', gate.storeId)
        .order('created_at', { ascending: false })
    if (error) return { ok: false as const, error: 'Could not load services' }
    return { ok: true as const, services: data ?? [] }
}

export async function saveService(
    storeId: string,
    serviceId: string | null,
    input: ServiceInput,
): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate

    const name = text(input?.name, 200).trim()
    const price = num(input?.price)
    if (!name || price === null || price < 0) return { ok: false, error: 'Name and a valid price are required.' }
    const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
    if (JSON.stringify(metadata).length > MAX_JSON_BYTES) return { ok: false, error: 'Service details are too large.' }

    const payload = {
        store_id: gate.storeId,
        name,
        slug: text(input.slug, 200).trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        description: input.description ? text(input.description, 20_000) : null,
        item_type: 'service',
        price,
        compare_at_price: null,
        sku: input.sku ? text(input.sku, 100) : null,
        is_active: !!input.is_active,
        updated_at: new Date().toISOString(),
        metadata: metadata as Json,
    }

    const supabase = await createClient()
    const { error } = serviceId
        ? await supabase.from('services').update(payload).eq('id', serviceId).eq('store_id', gate.storeId)
        : await supabase.from('services').insert(payload)
    return error ? { ok: false, error: error.message || 'Could not save the service.' } : { ok: true }
}

export async function deleteService(storeId: string, serviceId: string): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    const supabase = await createClient()
    const { error } = await supabase.from('services').delete().eq('id', serviceId).eq('store_id', gate.storeId)
    return error ? { ok: false, error: 'Could not delete the service.' } : { ok: true }
}

export async function setServiceActive(storeId: string, serviceId: string, active: boolean): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    const supabase = await createClient()
    const { error } = await supabase
        .from('services').update({ is_active: !!active }).eq('id', serviceId).eq('store_id', gate.storeId)
    return error ? { ok: false, error: 'Could not update the service.' } : { ok: true }
}
