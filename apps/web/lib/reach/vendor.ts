import { reachDb } from './db'

/** The vendor a logged-in user manages, or null if they aren't one. */
export async function vendorIdFor(userId: string): Promise<string | null> {
    const db = await reachDb()
    const { data } = await db
        .from('reach_vendor_users')
        .select('vendor_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
    return data?.vendor_id ?? null
}