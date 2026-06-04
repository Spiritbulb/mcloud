import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { NextRequest, NextResponse } from 'next/server'

async function resolveApp(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, traderSlug: string) {
    const { data: app } = await supabase
        .from('trading_apps')
        .select('*')
        .eq('slug', traderSlug)
        .single()

    if (!app) return { app: null, role: null }

    const { data: member } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', app.org_id!)
        .eq('user_id', userId)
        .single()

    return { app, role: member?.role ?? null }
}

// GET /api/trading/[traderSlug]
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ traderSlug: string }> },
) {
    const session = await auth0.getSession(req)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { traderSlug } = await params
    const supabase = await createClient()
    const { app, role } = await resolveApp(supabase, session.user.sub, traderSlug)

    if (!app || !role) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ ...app, role })
}

// PUT /api/trading/[traderSlug]  — update config fields
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ traderSlug: string }> },
) {
    const session = await auth0.getSession(req)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { traderSlug } = await params
    const supabase = await createClient()
    const { app, role } = await resolveApp(supabase, session.user.sub, traderSlug)

    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!role || !['owner', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    // Whitelist updatable fields — custom_domain is managed via /api/trading/domain
    const allowed = [
        'brand_name',
        'logo_url',
        'primary_color',
        'deriv_app_id',
        'deriv_redirect_uri',
        'deriv_oauth_scopes',
        'faq_affiliate_link',
        'affiliate_link',
        'support_email',
        'support_whatsapp',
        'enabled_apps',
        'is_active',
    ] as const

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
        if (key in body) update[key] = body[key]
    }

    const { data, error } = await supabase
        .from('trading_apps')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(update as any)
        .eq('id', app.id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
}
