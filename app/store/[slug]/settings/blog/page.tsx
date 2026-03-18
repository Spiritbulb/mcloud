// app/settings/[slug]/blog/page.tsx

import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import { BlogSettingsClient } from './blog-client'
import type { BlogPost, BlogAuthor } from '@/src/themes/types'

interface Props {
    params: Promise<{ slug: string }>
}

export default async function BlogSettingsPage({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()

    // No manual auth check needed here. The Supabase server client already
    // carries the session cookie. If the user is unauthenticated or not a
    // member of this store, the RLS policies on blog_posts / blog_authors
    // will return empty results — or the store lookup itself returns null.
    // The settings shell (client-side) handles the auth redirect separately.
    const { data: store } = await supabase
        .from('stores')
        .select('id, name, slug')
        .eq('slug', slug)
        .single()

    if (!store) notFound()

    // Fetch posts (all, including drafts) + authors in parallel.
    // RLS on blog_posts has a member-write policy so only store members
    // will get draft rows back — no extra membership query needed.
    const [{ data: posts }, { data: authors }] = await Promise.all([
        supabase
            .from('blog_posts')
            .select(`
                *,
                author:blog_authors (
                    id, name, bio, avatar_url, user_id,
                    store_id, created_at, updated_at
                )
            `)
            .eq('store_id', store.id)
            .order('created_at', { ascending: false }),

        supabase
            .from('blog_authors')
            .select('*')
            .eq('store_id', store.id)
            .order('name'),
    ])

    return (
        <BlogSettingsClient
            storeId={store.id}
            storeSlug={store.slug}
            posts={(posts ?? []) as BlogPost[]}
            authors={(authors ?? []) as BlogAuthor[]}
        />
    )
}