import '@/app/store/[slug]/storefront.css'
import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import { markdownToHtml } from '@/lib/md'
import { BlogPostPage } from '@/components/store/blog/post-shell'
import type { BlogPost } from '@/src/themes/types'

export const revalidate = 60

interface Props {
    params: Promise<{ slug: string; 'post-slug': string }>
}

export async function generateMetadata({ params }: Props) {
    const { slug, 'post-slug': postSlug } = await params
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores').select('id, name')
        .eq('slug', slug).eq('is_active', true).single()
    if (!store) return { title: 'Store not found' }

    const { data: post } = await supabase
        .from('blog_posts').select('title, excerpt, cover_image, metadata')
        .eq('store_id', store.id).eq('slug', postSlug).eq('is_published', true).single()
    if (!post) return { title: store.name }

    const meta = post.metadata as any
    return {
        title: meta?.seo_title ?? `${post.title} — ${store.name}`,
        description: meta?.seo_description ?? post.excerpt ?? '',
        openGraph: {
            title: meta?.seo_title ?? post.title,
            description: meta?.seo_description ?? post.excerpt ?? '',
            images: post.cover_image ? [post.cover_image] : [],
        },
    }
}
export default async function BlogPostRoute({ params }: Props) {
    const { slug, 'post-slug': postSlug } = await params
    const supabase = await createClient()

    const { data: store, error: storeError } = await supabase
        .from('stores').select('id, slug, settings')
        .eq('slug', slug).eq('is_active', true).single()

    console.log('[blog-post] slug:', slug, 'store:', store?.id ?? null, 'storeError:', storeError?.message)
    if (!store) notFound()

    const { data: post, error: postError } = await supabase
        .from('blog_posts')
        .select(`*, author:blog_authors(id, name, bio, avatar_url, user_id, store_id, created_at, updated_at)`)
        .eq('store_id', store.id).eq('slug', postSlug).eq('is_published', true)
        .maybeSingle()

    console.log('[blog-post] postSlug:', postSlug, 'post:', post?.id ?? null, 'postError:', postError?.message)
    if (!post) notFound()

    const themeId: string = (store.settings as any)?.themeId ?? 'classic'

    const tags: string[] = (post as any).tags ?? []
    let relatedPosts: BlogPost[] = []

    if (tags.length > 0) {
        const { data: byTag } = await supabase
            .from('blog_posts')
            .select(`*, author:blog_authors(id, name, bio, avatar_url, user_id, store_id, created_at, updated_at)`)
            .eq('store_id', store.id).eq('is_published', true)
            .neq('id', post.id).overlaps('tags', tags)
            .order('published_at', { ascending: false }).limit(3)
        relatedPosts = (byTag ?? []) as BlogPost[]
    }

    if (relatedPosts.length < 3) {
        const { data: latest } = await supabase
            .from('blog_posts')
            .select(`*, author:blog_authors(id, name, bio, avatar_url, user_id, store_id, created_at, updated_at)`)
            .eq('store_id', store.id).eq('is_published', true)
            .neq('id', post.id)
            .order('published_at', { ascending: false }).limit(3)

        const seen = new Set(relatedPosts.map((p: BlogPost) => p.id))
        for (const p of (latest ?? []) as BlogPost[]) {
            if (!seen.has(p.id)) { relatedPosts.push(p); seen.add(p.id) }
            if (relatedPosts.length === 3) break
        }
    }

    // Convert markdown on the server — no browser APIs, no Turbopack issues
    const contentHtml = await markdownToHtml(post.content ?? '')

    return (
        <BlogPostPage
            themeId={themeId}
            storeSlug={slug}
            post={post as BlogPost}
            relatedPosts={relatedPosts}
            contentHtml={contentHtml}
        />
    )
}  