import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";
import { createClient } from '@/lib/server';

// Validate at module load time so you get a clear error on startup,
// not a cryptic TypeError buried inside a callback.
const BASE_URL = process.env.APP_BASE_URL;
const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL;
if (!BASE_URL) {
    throw new Error("Missing required environment variable: APP_BASE_URL");
}
if (!ADMIN_BASE_URL) {
    throw new Error("Missing required environment variable: ADMIN_BASE_URL");
}

function toURL(path: string): URL {
    try {
        // If path is already absolute, use it directly.
        return new URL(path);
    } catch {
        // Otherwise resolve it relative to BASE_URL.
        return new URL(path, BASE_URL);
    }
}

export const auth0 = new Auth0Client({
    session: {
        cookie: {
            domain: process.env.NODE_ENV === 'production' ? `.menengai.cloud` : 'localhost',
        }
    },

    async onCallback(error, context, session) {
        if (error) {
            return NextResponse.redirect(
                toURL(`${BASE_URL}/auth/login?error=${encodeURIComponent(error.message)}`)
            )
        }

        if (session?.user) {
            const { sub: userId, email, name, picture } = session.user
            const supabase = await createClient()

            await supabase.from('users').upsert({
                id: userId,
                email,
                name,
                avatar_url: picture,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })

            // Check if user belongs to any org
            const { data: firstOrg } = await supabase
                .from('org_members')
                .select('org:orgs(slug)')
                .eq('user_id', userId)
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle()

            const orgSlug = firstOrg ? (firstOrg.org as any)?.slug : null

            // New user → onboarding, existing user → their first org
            return NextResponse.redirect(new URL(orgSlug ? `/org/${orgSlug}` : '/onboarding', ADMIN_BASE_URL))
        }

        return NextResponse.redirect(toURL('/'))
    },
});