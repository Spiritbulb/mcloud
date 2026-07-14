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
import { THEME_SCHEMA, isValidThemeValue } from '@/lib/theme-schema'

type ActionResult = { error: string | null }

/** Fields the settings pages are allowed to change on the store record. */
type StoreSettingsPatch = Pick<
    TablesUpdate<'stores'>,
    'name' | 'description' | 'currency' | 'timezone' | 'is_active' | 'settings' | 'logo_url'
>

/**
 * Write a site's theme. Owner/admin only, service-role, and whitelisted against
 * THEME_SCHEMA rather than a hand-maintained list, so the form and the validator
 * cannot drift. Values are interpolated into CSS custom properties on the
 * storefront, so an unvalidated string is stored XSS across every visitor.
 */
export async function updateStoreTheme(
    slug: string,
    values: Record<string, string>,
): Promise<ActionResult> {
    const session = await getSession()
    if (!session?.user) return { error: 'Not signed in' }

    const access = await requireStoreAccess(slug, session.user.id)
    if (access.error) return { error: 'Site not found' }
    if (!canManage(access.role)) return { error: 'Not authorized' }

    const update: Record<string, string> = {}
    for (const [id, value] of Object.entries(values)) {
        const field = THEME_SCHEMA.find((f) => f.id === id)
        if (!field) continue                      // not ours to write
        if (!isValidThemeValue(id, value)) {
            return { error: `That is not a valid value for ${field.label}.` }
        }
        update[id] = value
    }
    if (Object.keys(update).length === 0) return { error: null }

    const supabase = await createClient()
    const { error } = await supabase
        .from('store_themes')
        .upsert(
            { store_id: access.storeId, ...update, updated_at: new Date().toISOString() },
            { onConflict: 'store_id' },
        )
    return { error: error ? error.message : null }
}

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

/**
 * Replace a page's section list. Used by the Editor to save section copy. Only
 * the `settings` of each section may differ from what the page already has: the
 * Editor does not add, remove or reorder sections (that is a later sub-project),
 * so the section TYPES are checked against the stored page and a mismatch is
 * rejected rather than silently restructuring the merchant's page.
 */
export async function updatePageSections(
    slug: string,
    pageSlug: string,
    sections: { type: string; settings?: Record<string, unknown> }[],
): Promise<ActionResult> {
    const session = await getSession()
    if (!session?.user) return { error: 'Not signed in' }

    const access = await requireStoreAccess(slug, session.user.id)
    if (access.error) return { error: 'Site not found' }
    if (!canManage(access.role)) return { error: 'Not authorized' }

    const supabase = await createClient()

    const { data: page } = await supabase
        .from('pages')
        .select('id, sections')
        .eq('store_id', access.storeId)
        .eq('slug', pageSlug)
        .maybeSingle()
    if (!page) return { error: 'Page not found' }

    const existing = (Array.isArray(page.sections) ? page.sections : []) as { type: string }[]
    const sameShape =
        existing.length === sections.length &&
        existing.every((s, i) => s.type === sections[i].type)
    if (!sameShape) return { error: 'The page layout changed. Reload and try again.' }

    const { error } = await supabase
        .from('pages')
        .update({ sections: sections as never, updated_at: new Date().toISOString() })
        .eq('id', page.id)
    return { error: error ? error.message : null }
}
