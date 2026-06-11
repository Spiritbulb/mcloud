import '@/app/store/[slug]/storefront.css'
import { createClient } from '@mcloud/db/server'
import { notFound } from 'next/navigation'
import type { BlogPost } from '@mcloud/themes/types'
import { resolveTheme } from '@mcloud/themes/resolver'

export const revalidate = 60

interface Props {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores').select('name, description')
        .eq('slug', slug).eq('is_active', true).single()
    if (!store) return { title: 'Store not found' }
    return {
        title: `Journal — ${store.name}`,
        description: store.description ?? `Read the latest from ${store.name}`,
    }
}

export default async function BlogListRoute({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: rawStore } = await supabase
        .from('stores').select('*')
        .eq('slug', slug).eq('is_active', true).single()
    if (!rawStore) notFound()

    const { data: posts } = await supabase
        .from('blog_posts')
        .select('*, author:blog_authors(id, name, bio, avatar_url, user_id, store_id, created_at, updated_at)')
        .eq('store_id', rawStore.id)
        .eq('is_published', true)
        .order('published_at', { ascending: false })

    const blogPosts = (posts ?? []) as BlogPost[]
    const themeId = (rawStore.settings as any)?.themeId ?? 'classic'
    const { BlogListPage } = await resolveTheme(themeId)

    return (
        <BlogListPage
            storeSlug={slug}
            posts={blogPosts}
        />
    )
}
