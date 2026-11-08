// Closing (deleting) an organization: the database does it in one transaction (`close_org`,
// migrations/20261108_close_org_and_delete_personal_stores.sql); this maps its answer to something
// to show. Stores are kept and move to Personal. Callers authenticate the user first and pass their own id.

export type CloseOrgResult =
    | { ok: true; movedStores: { id: string; slug: string }[] }
    | { ok: false; code: 'no_org' | 'not_owner' }
    | { ok: false; code: 'org_has_servers'; servers: number }
    | { ok: false; code: 'org_has_balance'; balanceCents: number }

/** Reads the RPC's JSON; anything unexpected is treated as a failure that changed nothing. */
export function parseCloseOrgResult(data: unknown): CloseOrgResult | null {
    if (!data || typeof data !== 'object') return null
    const d = data as Record<string, unknown>
    if (d.ok === true) {
        const movedStores = Array.isArray(d.moved_stores)
            ? d.moved_stores.filter((s): s is { id: string; slug: string } => !!s && typeof (s as any).id === 'string' && typeof (s as any).slug === 'string')
            : []
        return { ok: true, movedStores }
    }
    if (d.code === 'no_org' || d.code === 'not_owner') return { ok: false, code: d.code }
    if (d.code === 'org_has_servers' && typeof d.servers === 'number') return { ok: false, code: 'org_has_servers', servers: d.servers }
    if (d.code === 'org_has_balance' && typeof d.balance_cents === 'number') return { ok: false, code: 'org_has_balance', balanceCents: d.balance_cents }
    return null
}

/** What to tell the owner when the organization was not deleted. Nothing was changed in any of these cases. */
export function describeCloseOrgBlock(result: Exclude<CloseOrgResult, { ok: true }> | null): string {
    if (!result) return 'The organization could not be deleted. Nothing was changed; try again.'
    switch (result.code) {
        case 'no_org':
            return 'Organization not found.'
        case 'not_owner':
            return 'Only the owner can delete this organization.'
        case 'org_has_servers':
            return `Delete its ${result.servers === 1 ? 'server' : `${result.servers} servers`} first: they are billed by the hour. Nothing was changed.`
        case 'org_has_balance':
            return `The wallet still holds KSh ${(result.balanceCents / 100).toFixed(2)}. Contact support to withdraw it, then delete the organization. Nothing was changed.`
    }
}

/** The part of a Supabase client this needs. Loose on purpose: the generated types list functions only once they are applied. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RpcClient = { rpc: (fn: any, args: any) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> }

/** Delete an organization in one database transaction. `actorId` must be the signed-in user's own id. Never throws. */
export async function closeOrg(
    supabase: RpcClient,
    orgId: string,
    actorId: string,
): Promise<{ ok: true; result: Extract<CloseOrgResult, { ok: true }> } | { ok: false; result: Exclude<CloseOrgResult, { ok: true }> | null; message: string }> {
    const { data, error } = await supabase.rpc('close_org', { p_org_id: orgId, p_actor: actorId })
    if (error) console.error('[close org]', error.code, error.message)
    const result = error ? null : parseCloseOrgResult(data)
    if (result?.ok) return { ok: true, result }
    const blocked = result as Exclude<CloseOrgResult, { ok: true }> | null
    return { ok: false, result: blocked, message: describeCloseOrgBlock(blocked) }
}
