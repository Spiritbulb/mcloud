// Tell the storefront app to drop its cached public pages for these stores.
// The storefront serves public pages from the CDN; this app writes data they show
// (plan, status, products via the mobile API) but cannot reach that cache directly.
// Fire-and-forget: a failure only means the page updates at its next scheduled
// revalidation instead of immediately, so it must never fail the write that called it.
import { createClient } from '@mcloud/db/server'
import { storefrontSiteUrl } from '@mcloud/merchant/storefront-url'

export async function revalidateStorefront(...slugs: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(slugs.filter((s): s is string => !!s))]
  const secret = process.env.REVALIDATE_SECRET
  if (unique.length === 0 || !secret) return
  try {
    await fetch(storefrontSiteUrl('/api/revalidate'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ slugs: unique }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.error('[web] storefront revalidate failed:', err)
  }
}

/** For writers that only know the store id (admin routes, org actions). */
export async function revalidateStorefrontById(storeId: string): Promise<void> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('stores').select('slug').eq('id', storeId).maybeSingle()
    await revalidateStorefront(data?.slug)
  } catch (err) {
    console.error('[web] storefront revalidate lookup failed:', err)
  }
}
