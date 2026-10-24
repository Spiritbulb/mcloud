import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { Database } from './database.types'

/**
 * Service-role client for request-time server code. Bypasses RLS: the caller authorizes.
 *
 * It reads `cookies()` only so that callers stay dynamic (pages and layouts rely on that), and
 * never hands those cookies to Supabase. It used to (an `@supabase/ssr` cookie client): a request
 * carrying a shopper's Supabase Auth cookie then sent the shopper's JWT instead of the service
 * key, so every "service-role" query ran as `authenticated` under RLS and failed or came back
 * short (seen as `permission denied for table users`). Shopper sessions belong to
 * `@mcloud/db/customer-server`.
 */
export async function createClient() {
  await cookies()
  return createPublicClient()
}

// Deduplicated per-render store lookup. React cache() ensures that even if
// layout.tsx and a page.tsx both call this with the same slug, Supabase is
// only hit once per server render.
export const getStore = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('stores')
    .select('*')
    .eq('slug', slug)
    .single()
  return data
})

/**
 * Service-role client that never touches request data. Same privileges as
 * {@link createClient}, but reading `cookies()` is what makes a page dynamic, and the
 * service-role key makes those cookies irrelevant anyway (identity is WorkOS, not
 * Supabase Auth). Use this for any read that renders a public, cacheable page, so the
 * page can be served from the CDN instead of running a function per view.
 *
 * Bypasses RLS like createClient: only select what a visitor may see.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
