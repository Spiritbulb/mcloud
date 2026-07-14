import { redirect } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { getVertical } from '@mcloud/verticals'
import { signPreview } from '@mcloud/verticals/preview'
import { getStoreSettingsData } from '@/lib/store-data'
import { createClient } from '@mcloud/db/server'
import EditorClient from './editor-client'

/**
 * The Editor: one surface for theme and content, with a live preview of the
 * merchant's real site. Replaces the separate Appearance and Content tabs.
 *
 * Everything the rail edits is schema-declared (THEME_SCHEMA, SECTION_REGISTRY),
 * so this page only loads the VALUES; it knows nothing about which fields exist.
 */
export default async function EditorPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params

    const session = await getSession()
    if (!session?.user) redirect('/auth/login')

    const result = await getStoreSettingsData(session.user.id, storeSlug, orgSlug)
    if (result.error || !result.data) redirect(`/org/${orgSlug}/${storeSlug}/settings`)
    const store = result.data

    // The home page's section list is what the rail edits. A site with no page
    // row yet has no sections to configure; the preview still renders (the
    // storefront falls back to the vertical's default sections).
    const supabase = await createClient()
    const { data: page } = await supabase
        .from('pages')
        .select('sections')
        .eq('store_id', store.id)
        .eq('slug', '')
        .maybeSingle()

    // The preview iframe loads the merchant's REAL site with UNSAVED values, so
    // it carries a token proving this session may preview THIS site. Without a
    // secret configured the preview simply does not render: it is never a gate
    // on saving.
    const secret = process.env.PREVIEW_SECRET ?? ''
    const token = secret ? signPreview(store.id, secret) : ''

    const settings =
        store.settings && typeof store.settings === 'object' && !Array.isArray(store.settings)
            ? (store.settings as Record<string, unknown>)
            : {}

    // store.theme is the embedded store_themes row (PostgREST returns a to-one
    // embed as an object, but hands back an array shape in some selects), and is
    // null for a site that has never been themed.
    const rawTheme = (store as { theme?: unknown }).theme
    const themeRow = Array.isArray(rawTheme) ? rawTheme[0] : rawTheme
    const theme =
        themeRow && typeof themeRow === 'object' ? (themeRow as Record<string, unknown>) : {}

    const sections = Array.isArray(page?.sections)
        ? (page.sections as unknown as { type: string; settings?: Record<string, unknown> }[])
        : []

    return (
        <EditorClient
            slug={storeSlug}
            storeId={store.id}
            theme={theme}
            sections={sections}
            previewToken={token}
            storefrontOrigin={process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN ?? 'http://localhost:3001'}
            commerce={getVertical(store.type).commerce}
            storeSettings={settings}
        />
    )
}
