// app/api/store/[slug]/info/route.ts
// Minimal public store info for client components that previously read `stores` /
// `store_themes` directly with the anon key (e.g. the cart page resolving its
// theme). Service-role read, exposing only non-sensitive presentation fields.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params
    const admin = await createClient()
    const { data: store } = await admin
        .from('stores')
        .select('settings, theme:store_themes(theme_id)')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    }

    const themeId =
        (store as { theme?: { theme_id?: string } | null }).theme?.theme_id ??
        (store.settings as { themeId?: string } | null)?.themeId ??
        'classic'

    return NextResponse.json({ themeId }, { headers: { 'Cache-Control': 'no-store' } })
}
