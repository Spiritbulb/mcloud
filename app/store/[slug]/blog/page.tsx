import '@/app/store/[slug]/storefront.css'
import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import { BlogListPage } from '@/components/store/blog/list-shell'
import type { BlogPost } from '@/src/themes/types'

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

    const { data: store } = await supabase
        .from('stores').select('id, slug, settings')
        .eq('slug', slug).eq('is_active', true).single()
    if (!store) notFound()

    const themeId: string = (store.settings as any)?.themeId ?? 'classic'

    const { data: posts } = await supabase
        .from('blog_posts')
        .select(`*, author:blog_authors(id, name, bio, avatar_url, user_id, store_id, created_at, updated_at)`)
        .eq('store_id', store.id)
        .eq('is_published', true)
        .order('published_at', { ascending: false })

    return (
        <BlogListPage
            themeId={themeId}
            storeSlug={slug}
            posts={(posts ?? []) as BlogPost[]}
        />
    )
}