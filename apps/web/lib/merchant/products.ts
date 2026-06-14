// Shared product logic for the mobile API. Access is always gated through the
// store (requireStoreAccess); writes require owner/admin.
import { createClient } from '@mcloud/db/server'
import { canManage, requireStoreAccess, type Role } from './stores'

export interface MobileProduct {
    id: string
    name: string
    slug: string
    price: number
    compare_at_price: number | null
    inventory_quantity: number | null
    track_inventory: boolean
    is_active: boolean
    images: string[]
    created_at: string | null
}

const COLS =
    'id, name, slug, price, compare_at_price, inventory_quantity, track_inventory, is_active, images, created_at'

function slugify(s: string) {
    return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export type ListResult<T> =
    | { error: 'not_found' | 'forbidden'; data: null; role: null }
    | { error: null; data: T; role: Role }

export async function listProducts(
    slug: string,
    userId: string,
): Promise<ListResult<MobileProduct[]>> {
    const access = await requireStoreAccess(slug, userId)
    if (access.error) return { error: access.error, data: null, role: null }

    const supabase = await createClient()
    const { data } = await supabase
        .from('products')
        .select(COLS)
        .eq('store_id', access.storeId)
        .order('created_at', { ascending: false })

    return { error: null, data: (data ?? []) as MobileProduct[], role: access.role }
}

export type MutateResult =
    | { error: string; status: number; data: null }
    | { error: null; status: number; data: MobileProduct }

export async function createProduct(
    slug: string,
    userId: string,
    input: { name?: string; price?: number; compare_at_price?: number | null; inventory_quantity?: number | null; track_inventory?: boolean },
): Promise<MutateResult> {
    const access = await requireStoreAccess(slug, userId)
    if (access.error === 'not_found') return { error: 'Store not found', status: 404, data: null }
    if (access.error || !canManage(access.role)) return { error: 'Not authorized', status: 403, data: null }

    const name = input.name?.trim()
    if (!name) return { error: 'Name is required', status: 400, data: null }
    const price = Number(input.price)
    if (!Number.isFinite(price) || price < 0) return { error: 'Valid price is required', status: 400, data: null }

    const supabase = await createClient()
    const base = slugify(name) || 'product'
    // Ensure slug uniqueness within the store.
    const { data: clash } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', access.storeId)
        .eq('slug', base)
        .maybeSingle()
    const slugFinal = clash ? `${base}-${Math.floor(Math.random() * 10000)}` : base

    const { data, error } = await supabase
        .from('products')
        .insert({
            store_id: access.storeId,
            name,
            slug: slugFinal,
            price,
            compare_at_price: input.compare_at_price ?? null,
            inventory_quantity: input.inventory_quantity ?? null,
            track_inventory: input.track_inventory ?? false,
            is_active: true,
        })
        .select(COLS)
        .single()

    if (error || !data) return { error: error?.message ?? 'Failed to create', status: 500, data: null }
    return { error: null, status: 201, data: data as MobileProduct }
}

export async function updateProduct(
    slug: string,
    userId: string,
    productId: string,
    patch: { name?: string; price?: number; compare_at_price?: number | null; inventory_quantity?: number | null; track_inventory?: boolean; is_active?: boolean; images?: string[] },
): Promise<MutateResult> {
    const access = await requireStoreAccess(slug, userId)
    if (access.error === 'not_found') return { error: 'Store not found', status: 404, data: null }
    if (access.error || !canManage(access.role)) return { error: 'Not authorized', status: 403, data: null }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.name !== undefined) {
        const n = patch.name.trim()
        if (!n) return { error: 'Name cannot be empty', status: 400, data: null }
        update.name = n
    }
    if (patch.price !== undefined) {
        const p = Number(patch.price)
        if (!Number.isFinite(p) || p < 0) return { error: 'Invalid price', status: 400, data: null }
        update.price = p
    }
    if (patch.compare_at_price !== undefined) update.compare_at_price = patch.compare_at_price
    if (patch.inventory_quantity !== undefined) update.inventory_quantity = patch.inventory_quantity
    if (patch.track_inventory !== undefined) update.track_inventory = patch.track_inventory
    if (patch.is_active !== undefined) update.is_active = patch.is_active
    if (patch.images !== undefined) update.images = patch.images

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('products')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(update as any)
        .eq('id', productId)
        .eq('store_id', access.storeId) // scope: can't touch another store's product
        .select(COLS)
        .single()

    if (error || !data) return { error: error?.message ?? 'Not found', status: 404, data: null }
    return { error: null, status: 200, data: data as MobileProduct }
}

export async function deleteProduct(
    slug: string,
    userId: string,
    productId: string,
): Promise<{ error: string | null; status: number }> {
    const access = await requireStoreAccess(slug, userId)
    if (access.error === 'not_found') return { error: 'Store not found', status: 404 }
    if (access.error || !canManage(access.role)) return { error: 'Not authorized', status: 403 }

    const supabase = await createClient()
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('store_id', access.storeId)

    if (error) return { error: error.message, status: 500 }
    return { error: null, status: 200 }
}
