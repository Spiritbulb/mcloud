'use server'

import { getSession } from '@mcloud/auth/server'
import { ensureUserRow } from '@mcloud/auth/callback'
import { createClient } from '@mcloud/db/server'
import { createOrgForUser, createStoreForUser, findManageableOrg } from '@mcloud/merchant/stores'
import { slugProblem } from '@mcloud/merchant/slug'
import { launchProblem, isSiteType } from './onboarding-logic'

export type SlugCheck = { ok: true } | { ok: false; reason: string }

/** Is this address free? Signed-in only, so it can't be used to enumerate stores anonymously. */
export async function checkSlug(slug: string): Promise<SlugCheck> {
    const session = await getSession()
    if (!session?.user) return { ok: false, reason: 'Please sign in again' }

    const problem = slugProblem(slug)
    if (problem) return { ok: false, reason: problem }

    const supabase = await createClient()
    const { data } = await supabase.from('stores').select('id').eq('slug', slug).maybeSingle()
    return data ? { ok: false, reason: 'That address is taken' } : { ok: true }
}

export type LaunchResult =
    | { ok: false; error: string }
    | { ok: true; orgSlug: string; storeSlug: string }

/**
 * Create the person's first (or next) site. Uses an org they already own or administer, or
 * creates one named after the site so a brand-new user needs no separate organisation step.
 */
export async function launchStore(input: { type: string; name: string; slug: string }): Promise<LaunchResult> {
    const session = await getSession()
    if (!session?.user) return { ok: false, error: 'Please sign in again' }

    const problem = launchProblem(input)
    if (problem) return { ok: false, error: problem }
    if (!isSiteType(input.type)) return { ok: false, error: 'Choose what you are building' }

    const user = session.user
    // The users row must exist before org/store rows that reference it.
    await ensureUserRow(user)

    let org = await findManageableOrg(user.id)
    if (!org) {
        const created = await createOrgForUser(input.name, user.id)
        if (created.error || !created.org) return { ok: false, error: created.error ?? 'Could not create organisation' }
        org = created.org
    }

    const result = await createStoreForUser(
        { orgId: org.id, name: input.name, slug: input.slug, type: input.type },
        user.id,
    )
    if (result.error || !result.slug) return { ok: false, error: result.error ?? 'Could not create your site' }

    return { ok: true, orgSlug: org.slug, storeSlug: result.slug }
}
