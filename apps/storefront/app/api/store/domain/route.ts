// @route-kind: member
import { createClient } from '@mcloud/db/server'
import { getSession } from '@mcloud/auth/server'
import { NextRequest, NextResponse } from 'next/server'
import { storeHasFeature } from '@mcloud/merchant/plans-server'
import { canManage, requireStoreAccessById } from '@mcloud/merchant/stores'
import { isValidDomain, normalizeDomain } from '@mcloud/merchant/custom-domain'

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
    // WorkOS session, not supabase.auth: the db client carries no Supabase user.
    const user = (await getSession(req))?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => null)
    const storeId = typeof body?.storeId === 'string' ? body.storeId : ''
    const clean = normalizeDomain(typeof body?.domain === 'string' ? body.domain : '')
    if (!isValidDomain(clean)) {
        return NextResponse.json({ error: 'Enter a domain like shop.example.com.' }, { status: 400 })
    }

    // Store member or member of the store's org, with a managing role.
    const access = await requireStoreAccessById(storeId, user.id)
    if (access.error === 'not_found') return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    if (access.error || !canManage(access.role)) {
        return NextResponse.json({ error: 'Only store owners and admins can change the domain.' }, { status: 403 })
    }

    // Custom domain is a paid feature (Hobby+). Gate server-side; the UI lock is
    // cosmetic and bypassable by calling this route directly.
    if (!(await storeHasFeature(access.storeId, 'customDomain'))) {
        return NextResponse.json(
            { error: 'Custom domains require the Hobby plan or higher. Upgrade to connect your own domain.' },
            { status: 403 },
        )
    }

    // stores.custom_domain is unique: say so before registering it on Vercel.
    const { data: taken } = await supabase
        .from('stores')
        .select('id')
        .eq('custom_domain', clean)
        .neq('id', access.storeId)
        .maybeSingle()
    if (taken) {
        return NextResponse.json({ error: 'That domain is already connected to another store.' }, { status: 409 })
    }

    // Register on Vercel
    const vercelRes = await addDomainToVercel(clean)
    if (vercelRes.error && vercelRes.error.code !== 'domain_already_in_project') {
        return NextResponse.json({ error: vercelRes.error.message }, { status: 400 })
    }

    const { error: saveError } = await supabase
        .from('stores')
        .update({ custom_domain: clean })
        .eq('id', access.storeId)
    if (saveError) {
        const message = saveError.code === '23505' ? 'That domain is already connected to another store.' : 'Could not save the domain. Try again.'
        return NextResponse.json({ error: message }, { status: saveError.code === '23505' ? 409 : 500 })
    }

    return NextResponse.json({ domain: clean })
}

// GET /api/store/domain?storeId=xxx  → check verification status
export async function GET(req: NextRequest) {
    const user = (await getSession(req))?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const storeId = req.nextUrl.searchParams.get('storeId') ?? ''
    const access = await requireStoreAccessById(storeId, user.id)
    if (access.error === 'not_found') return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    if (access.error) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('custom_domain')
        .eq('id', access.storeId)
        .single()

    if (!store?.custom_domain) {
        return NextResponse.json({ verified: false, domain: null })
    }

    const vercelRes = await verifyDomainOnVercel(store.custom_domain)
    return NextResponse.json({
        domain: store.custom_domain,
        verified: vercelRes.verified ?? false,
        misconfigured: vercelRes.misconfigured ?? false,
        // TXT records Vercel asks for when the domain is already claimed elsewhere.
        verification: Array.isArray(vercelRes.verification)
            ? vercelRes.verification.map((v: { type: string; domain: string; value: string }) => ({ type: v.type, domain: v.domain, value: v.value }))
            : [],
    })
}
