import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";
import { createClient } from '@/lib/server';

export const auth0 = new Auth0Client({
    session: {
        cookie: {
            domain: process.env.NODE_ENV === 'production' ? '.menengai.cloud' : 'localhost',
        }
    },

    async onCallback(error, context, session) {
        if (error) {
            return NextResponse.redirect(
                new URL(`/auth/login?error=${error.message}`, process.env.AUTH0_BASE_URL)
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
                        new URL(`https://${store.slug}.menengai.cloud/settings`)
                    );
                }
            }

            return NextResponse.redirect(
                new URL('/onboarding', process.env.AUTH0_BASE_URL)
            );
        }

        // Fallback
        return NextResponse.redirect(
            new URL(context.returnTo || '/', process.env.AUTH0_BASE_URL)
        );
    }
});
