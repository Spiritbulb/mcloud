// Account deletion: the database does the work in one transaction (`delete_user_account`,
// migrations/20261107c_delete_user_account.sql); this maps its answer to something to show.
// Callers authenticate the user first and pass only their own id.

export type DeleteAccountResult =
    | { ok: true; transfers: { org: string; to: string }[] }
    | { ok: false; code: 'no_user' }
    | { ok: false; code: 'org_needs_successor'; org: string; has_other_members: boolean }
    | { ok: false; code: 'store_without_org' }

/** Reads the RPC's JSON; anything unexpected is treated as a failure that deleted nothing. */
export function parseDeleteAccountResult(data: unknown): DeleteAccountResult | null {
    if (!data || typeof data !== 'object') return null
    const d = data as Record<string, unknown>
    if (d.ok === true) {
        const transfers = Array.isArray(d.transfers)
            ? d.transfers.filter((t): t is { org: string; to: string } => !!t && typeof (t as any).org === 'string' && typeof (t as any).to === 'string')
            : []
        return { ok: true, transfers }
    }
    if (d.code === 'no_user') return { ok: false, code: 'no_user' }
    if (d.code === 'store_without_org') return { ok: false, code: 'store_without_org' }
    if (d.code === 'org_needs_successor' && typeof d.org === 'string') {
        return { ok: false, code: 'org_needs_successor', org: d.org, has_other_members: d.has_other_members === true }
    }
    return null
}

/** What to tell the person when the account could not be deleted. Nothing was changed in any of these cases. */
export function describeDeleteBlock(result: Exclude<DeleteAccountResult, { ok: true }> | null): string {
    if (!result) return 'Your account could not be deleted. Nothing was changed; try again.'
    switch (result.code) {
        case 'no_user':
            return 'Your account could not be found.'
        case 'org_needs_successor':
            return result.has_other_members
                ? `You own "${result.org}", and nobody else in it is an admin. Make someone an admin first, then delete your account. Nothing was changed.`
                : `You are the only person in "${result.org}". Closing an organization is not available yet, so contact support to close it and your account. Nothing was changed.`
        case 'store_without_org':
            return 'One of your stores is not part of an organization, so it cannot be handed over. Contact support. Nothing was changed.'
    }
}

/** The part of a Supabase client this needs. Loose on purpose: the generated types list functions only once they are applied. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RpcClient = { rpc: (fn: any, args: any) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> }

/** Delete a user's account in one database transaction. `userId` must be the signed-in user's own id. Never throws. */
export async function deleteUserAccount(
    supabase: RpcClient,
    userId: string,
): Promise<{ result: DeleteAccountResult; message?: undefined } | { result: Exclude<DeleteAccountResult, { ok: true }> | null; message: string }> {
    const { data, error } = await supabase.rpc('delete_user_account', { p_user_id: userId })
    if (error) console.error('[account delete]', error.code, error.message)
    const result = error ? null : parseDeleteAccountResult(data)
    if (result?.ok) return { result }
    return { result: result as Exclude<DeleteAccountResult, { ok: true }> | null, message: describeDeleteBlock(result as Exclude<DeleteAccountResult, { ok: true }> | null) }
}
