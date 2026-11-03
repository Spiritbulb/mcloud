// Verify a shopper's Supabase access token sent as a bearer header (the Reach mobile app), the
// way customer-server.ts does with storefront cookies. The publishable-key client asks Supabase
// Auth to check the token, so a forged or expired one comes back as null.
import { createClient } from '@supabase/supabase-js'

export interface VerifiedCustomer {
    /** Supabase Auth user id. */
    id: string
    email: string
    emailConfirmed: boolean
}

export async function verifyCustomerToken(token: string): Promise<VerifiedCustomer | null> {
    if (!token) return null
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const { data, error } = await supabase.auth.getUser(token)
    const user = data?.user
    if (error || !user?.email) return null
    return { id: user.id, email: user.email.toLowerCase(), emailConfirmed: !!user.email_confirmed_at }
}
