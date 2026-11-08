// Deleting a store: the database does it in one transaction (`delete_store_cascade`,
// migrations/20261108_close_org_and_delete_personal_stores.sql): products, orders, customers, pages,
// members and the rest, or nothing. Callers check that the signed-in user owns the store first.
// Storage files and the custom domain are not touched here (SPI-73).

export type DeleteStoreFailure = 'unpaid_payouts' | 'failed'

/** The database refuses with this message while Reach vendor payouts have not been paid out. */
export function classifyDeleteStoreError(error: { message?: string } | null | undefined): DeleteStoreFailure | null {
    if (!error) return null
    return (error.message ?? '').includes('store_has_unpaid_payouts') ? 'unpaid_payouts' : 'failed'
}

/** What to tell the owner when the store was not deleted. Nothing was changed in either case. */
export function describeDeleteStoreFailure(failure: DeleteStoreFailure): string {
    return failure === 'unpaid_payouts'
        ? 'This store still owes Reach vendors payouts that have not been paid out. Pay them first, then delete the store. Nothing was changed.'
        : 'The store could not be deleted. Nothing was changed; try again.'
}

/** The part of a Supabase client this needs. Loose on purpose: the generated types list functions only once they are applied. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RpcClient = { rpc: (fn: any, args: any) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> }

/** Delete one store and everything under it. The caller must already have checked ownership. Never throws. */
export async function deleteStoreCascade(
    supabase: RpcClient,
    storeId: string,
): Promise<{ ok: true } | { ok: false; failure: DeleteStoreFailure; message: string }> {
    const { error } = await supabase.rpc('delete_store_cascade', { p_store_id: storeId })
    const failure = classifyDeleteStoreError(error)
    if (!failure) return { ok: true }
    if (failure === 'failed') console.error('[delete store]', error?.code, error?.message)
    return { ok: false, failure, message: describeDeleteStoreFailure(failure) }
}
