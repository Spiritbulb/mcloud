// lib/customer-client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/app/types/database.types'

export function createCustomerClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
}