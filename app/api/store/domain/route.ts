import { createClient } from '@/lib/server'
import { NextRequest, NextResponse } from 'next/server'

const VERCEL_TOKEN = process.env.VERCEL_TOKEN!
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID!
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID // optional

async function addDomainToVercel(domain: string) {
    const url = VERCEL_TEAM_ID
        ? `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`
        : `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: domain }),
    })
    return res.json()
}

async function verifyDomainOnVercel(domain: string) {
    const url = VERCEL_TEAM_ID
        ? `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${domain}?teamId=${VERCEL_TEAM_ID}`
        : `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${domain}`

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    })
    return res.json()
}

// POST /api/store/domain  → save + register with Vercel
export async function POST(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { storeId, domain } = await req.json()
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '')

    // Verify ownership
    const { data: member } = await supabase
        .from('store_members')
        .select('role')
        .eq('store_id', storeId)
        .eq('user_id', user.id)
        .single()

    if (!member || !['owner', 'admin'].includes(member.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Register on Vercel
    const vercelRes = await addDomainToVercel(clean)
    if (vercelRes.error && vercelRes.error.code !== 'domain_already_in_project') {
        return NextResponse.json({ error: vercelRes.error.message }, { status: 400 })
    }

    // Save to DB
    await supabase
        .from('stores')
        .update({ custom_domain: clean })
        .eq('id', storeId)

    return NextResponse.json({ domain: clean, vercel: vercelRes })
}

// GET /api/store/domain?storeId=xxx  → check verification status
export async function GET(req: NextRequest) {
    const storeId = req.nextUrl.searchParams.get('storeId')
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('custom_domain')
        .eq('id', storeId!)
        .single()

    if (!store?.custom_domain) {
        return NextResponse.json({ verified: false, domain: null })
    }

    const vercelRes = await verifyDomainOnVercel(store.custom_domain)
    return NextResponse.json({
        domain: store.custom_domain,
        verified: vercelRes.verified ?? false,
        misconfigured: vercelRes.misconfigured ?? false,
    })
}
