/* eslint-disable @typescript-eslint/no-explicit-any -- the reach_* tables are not in the generated database types */
// Store owners in the Reach app: the stores they manage, one-step "create a store", and listing a
// store they already own. Listing itself is @mcloud/merchant/reach-listing (shared with the store
// dashboard); this file adds the "and make me its vendor" part, which needs no key.
import { canManage, createOrgForUser, createStoreForUser, findManageableOrg, requireStoreAccess, requireStoreAccessById } from '@mcloud/merchant/stores'
import { normalizeSlug, slugFromName } from '@mcloud/merchant/slug'
import { storeSettingsUrl } from '@mcloud/merchant/storefront-url'
import { ensureVendor, saveReachLocation, setReachListed } from '@mcloud/merchant/reach-listing'
import { sendPushToUsers } from '@/lib/merchant/send-push'
import { reachDb } from './db'
import { planOneStepSetup } from './shop-logic'
import { vendorFor } from './vendor'

export interface ManagedStore {
    id: string
    slug: string
    name: string
    listed: boolean
    approvalStatus: string
    /** This user is currently the Reach vendor of this store. */
    current: boolean
    /** The store's settings on the web (append e.g. '/orders'). */
    settingsUrl: string | null
}

/** Every store the user is an owner/admin of, directly or through its org, with its Reach status. */
export async function listManagedStores(userId: string): Promise<ManagedStore[]> {
    const db = await reachDb()
    const [{ data: direct }, { data: orgs }, { data: member }] = await Promise.all([
        db.from('store_members').select('role, stores(id, slug, name, orgs(slug))').eq('user_id', userId).in('role', ['owner', 'admin']),
        db.from('org_members').select('org_id').eq('user_id', userId).in('role', ['owner', 'admin']),
        db.from('reach_vendor_members').select('reach_vendors(store_id)').eq('user_id', userId).maybeSingle(),
    ])
    const orgIds = (orgs ?? []).map((o: any) => o.org_id)
    const { data: orgStores } = orgIds.length
        ? await db.from('stores').select('id, slug, name, orgs(slug)').in('org_id', orgIds)
        : { data: [] }

    const byId = new Map<string, { id: string; slug: string; name: string; orgs?: { slug: string } | null }>()
    for (const s of [...(direct ?? []).map((d: any) => d.stores), ...(orgStores ?? [])]) if (s?.id) byId.set(s.id, s)
    if (!byId.size) return []

    const { data: vendors } = await db.from('reach_vendors').select('store_id, listed, approval_status').in('store_id', [...byId.keys()])
    const vendorOf = new Map<string, any>((vendors ?? []).map((v: any) => [v.store_id, v]))
    const currentStoreId = member?.reach_vendors?.store_id ?? null

    return [...byId.values()]
        .map((s) => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            listed: !!vendorOf.get(s.id)?.listed,
            approvalStatus: vendorOf.get(s.id)?.approval_status ?? 'draft',
            current: s.id === currentStoreId,
            settingsUrl: s.orgs?.slug ? storeSettingsUrl(s.orgs.slug, s.slug) : null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
}

export type VendorStoreResult = { ok: true; slug: string } | { ok: false; status: number; error: string }

/**
 * List a store the user manages on Reach and make them its vendor (no key). `areaId` is the home
 * area: required the first time, since a listing request needs one.
 */
export async function listAndJoin(
    userId: string,
    slug: string,
    input: { areaId?: unknown; payoutPhone?: unknown },
): Promise<VendorStoreResult> {
    const access = await requireStoreAccess(slug, userId)
    if (access.error === 'not_found') return { ok: false, status: 404, error: 'Store not found' }
    if (access.error || !canManage(access.role)) return { ok: false, status: 403, error: 'Only owners and admins can list a store' }
    const storeId = access.storeId!

    const db = await reachDb()
    if (input.areaId !== undefined) {
        const saved = await saveReachLocation(db, storeId, { areaId: input.areaId, extraAreaIds: [], payoutPhone: input.payoutPhone ?? null })
        if (!saved.ok) return { ok: false, status: 400, error: saved.error }
    }
    const listed = await setReachListed(db, storeId, true)
    if (!listed.ok) return { ok: false, status: 400, error: listed.error }
    if (listed.asked) await notifyReachAdmins(db, listed.storeName ?? 'A store')

    const { data: store } = await db.from('stores').select('id, name').eq('id', storeId).maybeSingle()
    const vendor = store ? await ensureVendor(db, store) : null
    if (!vendor) return { ok: false, status: 500, error: 'Could not open your store. Try again.' }

    const { error } = await db.rpc('reach_join_as_owner', { p_user_id: userId, p_vendor_id: vendor.id })
    if (error) {
        if (error.message?.includes('role_conflict')) {
            return { ok: false, status: 409, error: 'This account shops on Reach. Use a different account to sell.' }
        }
        return { ok: false, status: 500, error: 'Could not open your store. Try again.' }
    }
    return { ok: true, slug }
}

/**
 * "Create a store" in the Reach app: an org if they have none, a store in it, listed on Reach
 * (pending review), with them as its vendor. Only the missing steps run, so a retry is safe.
 */
export async function createAndJoin(
    userId: string,
    input: { name?: unknown; areaId?: unknown; payoutPhone?: unknown },
): Promise<VendorStoreResult> {
    const name = typeof input.name === 'string' ? input.name.trim() : ''
    if (name.length < 2 || name.length > 60) return { ok: false, status: 400, error: 'Give your store a name' }
    if (typeof input.areaId !== 'string' || !input.areaId) return { ok: false, status: 400, error: 'Choose the area your store delivers from.' }

    const db = await reachDb()
    let org = await findManageableOrg(userId)
    const base = normalizeSlug(slugFromName(name)) || 'store'
    // A store of theirs with this name's slug in this org is a previous attempt: reuse it.
    let existingStoreSlug: string | null = null
    if (org) {
        const { data } = await db.from('stores').select('slug').eq('slug', base).eq('org_id', org.id).eq('owner_id', userId).maybeSingle()
        existingStoreSlug = data?.slug ?? null
    }

    let slug = existingStoreSlug ?? base
    for (const step of planOneStepSetup({ manageableOrg: org, existingStoreSlug })) {
        if (step === 'create_org') {
            const created = await createOrgForUser(name, userId)
            if (created.error || !created.org) return { ok: false, status: 400, error: created.error ?? 'Could not create your store' }
            org = created.org
        } else if (step === 'create_store') {
            const { data: taken } = await db.from('stores').select('id').eq('slug', base).maybeSingle()
            slug = taken ? `${base}-${Math.floor(1000 + Math.random() * 9000)}` : base
            const created = await createStoreForUser({ orgId: org!.id, name, slug }, userId)
            if (created.error !== null) return { ok: false, status: 400, error: created.error }
            slug = created.slug
        }
    }
    // 'list' and 'join'
    return listAndJoin(userId, slug, { areaId: input.areaId, payoutPhone: input.payoutPhone })
}

/** Tell the Reach admins a store asked to be listed. Best effort. */
async function notifyReachAdmins(db: any, storeName: string) {
    try {
        const { data: admins } = await db.from('users').select('id').eq('role', 'admin')
        await sendPushToUsers((admins ?? []).map((u: { id: string }) => u.id), {
            title: 'New store to review',
            body: `${storeName} asked to be listed on Reach.`,
            data: { type: 'review' },
        })
    } catch {
        // never fail the owner's request over a notification
    }
}

/**
 * The store this user is the Reach vendor of, when they may also manage it (owner/admin). Key-joined
 * staff get 403: they run orders, not the store. The store always comes from the membership, never
 * from the request.
 */
export async function myManagedStore(userId: string): Promise<{ ok: true; storeId: string } | { ok: false; status: number; error: string }> {
    const vendor = await vendorFor(userId)
    if (!vendor?.storeId) return { ok: false, status: 403, error: 'Not a vendor' }
    const access = await requireStoreAccessById(vendor.storeId, userId)
    if (access.error || !canManage(access.role)) return { ok: false, status: 403, error: 'Only owners and admins can do that' }
    return { ok: true, storeId: vendor.storeId }
}
