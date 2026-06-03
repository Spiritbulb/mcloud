import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { NextRequest, NextResponse } from 'next/server'

const TRADING_VERCEL_TOKEN = process.env.TRADING_VERCEL_TOKEN!
const TRADING_VERCEL_PROJECT_ID = process.env.TRADING_VERCEL_PROJECT_ID!
const TRADING_VERCEL_TEAM_ID = process.env.TRADING_VERCEL_TEAM_ID

function vercelUrl(path: string) {
    const base = `https://api.vercel.com/v10/projects/${TRADING_VERCEL_PROJECT_ID}${path}`
    return TRADING_VERCEL_TEAM_ID ? `${base}?teamId=${TRADING_VERCEL_TEAM_ID}` : base
}

async function addDomain(domain: string) {
    const res = await fetch(vercelUrl('/domains'), {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${TRADING_VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: domain }),
    })
    return res.json()
}

async function checkDomain(domain: string) {
    const res = await fetch(vercelUrl(`/domains/${domain}`), {
        headers: { Authorization: `Bearer ${TRADING_VERCEL_TOKEN}` },
    })
    return res.json()
}

async function getOrgMembership(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, traderSlug: string) {
    const { data: app } = await supabase
        .from('trading_apps')
        .select('id, slug, org_id')
        .eq('slug', traderSlug)
        .single()

    if (!app) return null

    const { data: member } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', app.org_id)
        .eq('user_id', userId)
        .single()

    if (!member || !['owner', 'admin'].includes(member.role)) return null

    return app
}

// POST /api/trading/domain  { traderSlug, domain }
export async function POST(req: NextRequest) {
    const session = await auth0.getSession(req)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { traderSlug, domain } = await req.json()
    if (!traderSlug || !domain) return NextResponse.json({ error: 'Missing traderSlug or domain' }, { status: 400 })

    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')

    const supabase = await createClient()
    const app = await getOrgMembership(supabase, session.user.sub, traderSlug)
    if (!app) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const vercelRes = await addDomain(clean)
    if (vercelRes.error && vercelRes.error.code !== 'domain_already_in_project') {
        return NextResponse.json({ error: vercelRes.error.message }, { status: 400 })
    }

    await supabase
        .from('trading_apps')
        .update({ custom_domain: clean })
        .eq('id', app.id)

    return NextResponse.json({ domain: clean, vercel: vercelRes })
}

// GET /api/trading/domain?traderSlug=xxx
export async function GET(req: NextRequest) {
    const session = await auth0.getSession(req)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const traderSlug = req.nextUrl.searchParams.get('traderSlug')
    if (!traderSlug) return NextResponse.json({ error: 'Missing traderSlug' }, { status: 400 })

    const supabase = await createClient()
    const app = await getOrgMembership(supabase, session.user.sub, traderSlug)
    if (!app) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data } = await supabase
        .from('trading_apps')
        .select('custom_domain')
        .eq('id', app.id)
        .single()

    if (!data?.custom_domain) return NextResponse.json({ verified: false, domain: null })

    const vercelRes = await checkDomain(data.custom_domain)
    return NextResponse.json({
        domain: data.custom_domain,
        verified: vercelRes.verified ?? false,
        misconfigured: vercelRes.misconfigured ?? false,
    })
}

// DELETE /api/trading/domain  { traderSlug }  — clear domain from DB (doesn't remove from Vercel)
export async function DELETE(req: NextRequest) {
    const session = await auth0.getSession(req)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { traderSlug } = await req.json()
    if (!traderSlug) return NextResponse.json({ error: 'Missing traderSlug' }, { status: 400 })

    const supabase = await createClient()
    const app = await getOrgMembership(supabase, session.user.sub, traderSlug)
    if (!app) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await supabase
        .from('trading_apps')
        .update({ custom_domain: null })
        .eq('id', app.id)

    return NextResponse.json({ ok: true })
}
