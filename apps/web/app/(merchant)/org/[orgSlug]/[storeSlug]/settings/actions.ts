'use server'

// Server actions for the web merchant settings pages. These replace direct
// anon-key table writes from the client (general/social/appearance settings)
// with cookie-WorkOS-session-authorized, service-role writes — the web analog of
// the mobile /api/mobile/* routes. Authorization reuses requireStoreAccess +
// canManage from lib/merchant/stores.
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import type { TablesUpdate } from '@mcloud/db/types'
import { canManage, requireStoreAccess } from '@/lib/merchant/stores'

type ActionResult = { error: string | null }

/** Fields the settings pages are allowed to change on the store record. */
type StoreSettingsPatch = Pick<
    TablesUpdate<'stores'>,
    'name' | 'description' | 'currency' | 'timezone' | 'is_active' | 'settings'
>

/**
 * Update mutable store fields. Used by general settings (name/description/
 * currency/timezone/is_active) and social settings (settings jsonb). Only an
 * owner/admin of the store may write; the store is resolved by slug and the write
 * is scoped to it.
 */
export async function updateStoreSettings(
    slug: string,
    patch: StoreSettingsPatch,
): Promise<ActionResult> {
    const session = await getSession()
    if (!session?.user) return { error: 'Not signed in' }

    const access = await requireStoreAccess(slug, session.user.id)
    if (access.error) return { error: 'Store not found' }
    if (!canManage(access.role)) return { error: 'Not authorized' }

    // Whitelist the fields so a caller can't smuggle other columns through.
    const update: StoreSettingsPatch = {}
    if (patch.name !== undefined) update.name = patch.name
    if (patch.description !== undefined) update.description = patch.description
    if (patch.currency !== undefined) update.currency = patch.currency
    if (patch.timezone !== undefined) update.timezone = patch.timezone
    if (patch.is_active !== undefined) update.is_active = patch.is_active
    if (patch.settings !== undefined) update.settings = patch.settings

    const supabase = await createClient()
    const { error } = await supabase.from('stores').update(update).eq('id', access.storeId)
    return { error: error ? error.message : null }
}
