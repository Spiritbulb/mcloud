// @route-kind: webhook — shared-secret call from the web app (REVALIDATE_SECRET), writes nothing
// app/api/revalidate/route.ts
//
// The web app writes data that public store pages show (plan, status, products from the
// mobile API) but cannot reach this app's cache. It posts the store slug here instead.

import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { revalidateStore } from '@/lib/revalidate-store'

function secretMatches(given: string | null): boolean {
    const expected = process.env.REVALIDATE_SECRET
    if (!expected || !given) return false
    const a = Buffer.from(given)
    const b = Buffer.from(expected)
    return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
    if (!secretMatches(request.headers.get('x-revalidate-secret'))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json().catch(() => null)
    const slugs: unknown[] = Array.isArray(body?.slugs) ? body.slugs : [body?.slug]
    const valid = slugs.filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]{2,64}$/.test(s))
    if (valid.length === 0) return NextResponse.json({ error: 'slug required' }, { status: 400 })
    for (const slug of valid.slice(0, 50)) revalidateStore(slug)
    return NextResponse.json({ ok: true, revalidated: valid.length })
}
