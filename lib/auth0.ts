import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";
import { createClient } from '@/lib/server';

// Validate at module load time so you get a clear error on startup,
// not a cryptic TypeError buried inside a callback.
const BASE_URL = process.env.APP_BASE_URL;
if (!BASE_URL) {
    throw new Error("Missing required environment variable: APP_BASE_URL");
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
            domain: process.env.NODE_ENV === 'production' ? '.menengai.cloud' : 'localhost',
        }
    },

    async onCallback(error, context, session) {
        if (error) {
            return NextResponse.redirect(
                toURL(`/auth/login?error=${encodeURIComponent(error.message)}`)
            );
        }

        if (session?.user) {
            const { sub: userId, email, name, picture } = session.user;
            const supabase = await createClient();

            await supabase.from('users').upsert({
                id: userId,
                email,
                name,
                avatar_url: picture,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

            const { data: membership } = await supabase
                .from('store_members')
                .select('store_id, role')
                .eq('user_id', userId)
                .eq('role', 'owner')
                .single();

            if (membership) {
                const { data: store } = await supabase
                    .from('stores')
                    .select('slug')
                    .eq('id', membership.store_id)
                    .single();

                if (store?.slug) {
                    return NextResponse.redirect(
                        toURL(`https://${store.slug}.menengai.cloud/settings`)
                    );
                }
            }

            const returnTo = context.returnTo
                ? `&returnTo=${encodeURIComponent(context.returnTo)}`
                : '';
            return NextResponse.redirect(toURL(`/onboarding?${returnTo}`));
        }

        // Fallback
        return NextResponse.redirect(toURL(context.returnTo || '/'));
    }
});