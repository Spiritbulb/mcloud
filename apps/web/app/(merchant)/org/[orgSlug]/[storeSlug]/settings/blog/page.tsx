// app/settings/[slug]/blog/page.tsx

import { createClient, getStore } from '@mcloud/db/server'
import { notFound } from 'next/navigation'
import { BlogSettingsClient } from './blog-client'
import type { BlogPost, BlogAuthor } from '@mcloud/themes/types'

interface Props {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}

export default async function BlogSettingsPage({ params }: Props) {
    const { storeSlug: slug } = await params
    const store = await getStore(slug)
    if (!store) notFound()

    const supabase = await createClient()

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