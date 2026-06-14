// GET  /api/mobile/orgs — orgs the authenticated mobile user belongs to.
// POST /api/mobile/orgs — create a new org and add caller as owner.
import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { listUserOrgs } from '@/lib/merchant/orgs'
import { createClient } from '@mcloud/db/server'
import { fail, requireMobileUser } from '../_lib'

function slugify(s: string) {
    return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function uniqueOrgSlug(supabase: Awaited<ReturnType<typeof createClient>>, base: string) {
    const slug = slugify(base) || 'org'
    const { data } = await supabase.from('orgs').select('slug').eq('slug', slug).maybeSingle()
    return data ? `${slug}-${Math.floor(Math.random() * 10000)}` : slug
}

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const orgs = await listUserOrgs(auth.user.id)
    return NextResponse.json({ orgs }, {
        headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
    })
}

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const body = (await req.json().catch(() => null)) as { name?: string } | null
    if (!body?.name?.trim() || body.name.trim().length < 2) {
        return fail(400, 'Name must be at least 2 characters.')
    }

    const supabase = await createClient()
    const userId = auth.user.id
    const trimmed = body.name.trim()
    const slug = await uniqueOrgSlug(supabase, trimmed)
    const publicId = `org_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`

    const { data: org, error } = await supabase
        .from('orgs')
        .insert({ name: trimmed, slug, owner_id: userId, public_id: publicId })
        .select('id, slug')
        .single()

    if (error || !org) return fail(500, error?.message ?? 'Could not create organisation.')

    const { error: memberError } = await supabase
        .from('org_members')
        .insert({ org_id: org.id, user_id: userId, role: 'owner' })

    if (memberError) return fail(500, memberError.message)

    return NextResponse.json({ org: { id: org.id, slug: org.slug } }, { status: 201 })
}
