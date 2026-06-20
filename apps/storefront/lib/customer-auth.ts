// Server-side customer authorization for storefront API routes.
//
// Customers authenticate via Supabase Auth (email/password). The publishable
// cookie client verifies the session JWT; we then do all DB work with the
// service-role client. The customer's identity (email) ALWAYS comes from the
// verified session — never from the request body — so a route can't be tricked
// into acting on another customer by passing a different email/customer_id.
import { createCustomerServerClient } from '@mcloud/db/customer-server'
import { createClient } from '@mcloud/db/server'

export interface StoreCustomer {
    /** customers.id for THIS store. */
    id: string
    email: string
}

/**
 * Resolve the signed-in customer's `customers` row for the given store, from the
 * verified Supabase Auth session — creating the row if it doesn't exist yet.
 *
 * Customer rows are provisioned LAZILY here (not at sign-up): Supabase requires
 * email confirmation, so there's no session at sign-up time to authorize a write.
 * The first authenticated load (dashboard/wishlist) creates the row from the
 * verified email. Idempotent. Returns null only when there is no valid session.
 */
export async function getStoreCustomer(storeId: string): Promise<StoreCustomer | null> {
    const authed = await createCustomerServerClient()
    const {
        data: { user },
    } = await authed.auth.getUser()
    if (!user?.email) return null

    const admin = await createClient()
    const { data: customer } = await admin
        .from('customers')
        .select('id, email')
        .eq('store_id', storeId)
        .eq('email', user.email)
        .maybeSingle()

    if (customer) return { id: customer.id, email: customer.email ?? user.email }

    // First authenticated visit for this store → provision the row.
    const { data: created } = await admin
        .from('customers')
        .insert({ store_id: storeId, email: user.email, first_name: '', last_name: '' })
        .select('id, email')
        .single()

    if (!created) return null
    return { id: created.id, email: created.email ?? user.email }
}

/** Resolve an active store's id from its slug, or null. */
export async function getActiveStoreId(slug: string): Promise<string | null> {
    const admin = await createClient()
    const { data: store } = await admin
        .from('stores')
        .select('id')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
    return store?.id ?? null
}
