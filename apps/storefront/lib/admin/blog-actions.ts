'use server'
// Blog posts and authors for the settings screens. Writing requires the Hobby plan or higher
// (PLAN_LIMITS.*.features.blogPages), which direct browser inserts never enforced.
import { createClient } from '@mcloud/db/server'
import { planHasFeature } from '@mcloud/merchant/plans'
import { getStorePlan } from '@mcloud/merchant/plans-server'
import { requireManagedStore, type ActionResult } from './access'
import { revalidateStoreById } from '@/lib/revalidate-store'

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

export interface BlogAuthorInput {
    name: string
    bio: string | null
    avatar_url: string | null
}

export interface BlogPostInput {
    title: string
    slug: string
    excerpt: string | null
    content: string
    cover_image: string | null
    author_id: string | null
    tags: string[]
    is_published: boolean
    reading_time_minutes: number
    /** Pins the post at the top of the blog (metadata.featured). Left out = unchanged. */
    featured?: boolean
}

async function requireBlogAccess(storeId: string) {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    const plan = await getStorePlan(gate.storeId)
    if (!planHasFeature(plan, 'blogPages')) {
        return { ok: false as const, error: 'Blog and content pages require the Hobby plan or higher.' }
    }
    return gate
}

export async function createBlogAuthor(storeId: string, input: BlogAuthorInput) {
    const gate = await requireBlogAccess(storeId)
    if (!gate.ok) return { ok: false as const, error: gate.error }
    const name = text(input?.name, 120).trim()
    if (!name) return { ok: false as const, error: 'Name is required' }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('blog_authors')
        .insert({
            store_id: gate.storeId,
            name,
            bio: input.bio ? text(input.bio, 1000).trim() || null : null,
            avatar_url: input.avatar_url ? text(input.avatar_url, 1000).trim() || null : null,
        })
        .select()
        .single()
    if (error || !data) return { ok: false as const, error: 'Could not create the author.' }
    return { ok: true as const, author: data }
}

export async function saveBlogPost(storeId: string, postId: string | null, input: BlogPostInput) {
    const gate = await requireBlogAccess(storeId)
    if (!gate.ok) return { ok: false as const, error: gate.error }

    const title = text(input?.title, 300).trim()
    const slug = text(input?.slug, 300).trim()
    if (!title) return { ok: false as const, error: 'Title is required' }
    if (!slug) return { ok: false as const, error: 'Slug is required' }

    const supabase = await createClient()

    // An author must belong to this store.
    if (input.author_id) {
        const { data: author } = await supabase
            .from('blog_authors').select('id').eq('id', input.author_id).eq('store_id', gate.storeId).maybeSingle()
        if (!author) return { ok: false as const, error: 'Author not found' }
    }

    // The stored row, for what an update must keep: its other metadata and its first publish date.
    const { data: existing } = postId
        ? await supabase.from('blog_posts').select('metadata, published_at').eq('id', postId).eq('store_id', gate.storeId).maybeSingle()
        : { data: null }
    if (postId && !existing) return { ok: false as const, error: 'Post not found' }
    const metadata = existing?.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {}

    const is_published = !!input.is_published
    const payload = {
        store_id: gate.storeId,
        title,
        slug,
        excerpt: input.excerpt ? text(input.excerpt, 1000).trim() || null : null,
        content: text(input.content, 500_000),
        cover_image: input.cover_image ? text(input.cover_image, 1000).trim() || null : null,
        author_id: input.author_id || null,
        tags: (Array.isArray(input.tags) ? input.tags : []).filter((t) => typeof t === 'string').slice(0, 30),
        is_published,
        // Set when a post is first published (a draft published later included), then kept.
        published_at: is_published && !existing?.published_at ? new Date().toISOString() : undefined,
        ...(typeof input.featured === 'boolean' && { metadata: { ...metadata, featured: input.featured } }),
        reading_time_minutes: Math.max(1, Math.floor(Number(input.reading_time_minutes) || 1)),
    }

    const query = postId
        ? supabase.from('blog_posts').update(payload).eq('id', postId).eq('store_id', gate.storeId)
        : supabase.from('blog_posts').insert(payload)
    const { data, error } = await query.select('*, author:blog_authors(*)').single()
    if (error || !data) return { ok: false as const, error: error?.message || 'Could not save the post.' }
    await revalidateStoreById(gate.storeId)
    return { ok: true as const, post: data }
}

export async function deleteBlogPost(storeId: string, postId: string): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    const supabase = await createClient()
    const { error } = await supabase.from('blog_posts').delete().eq('id', postId).eq('store_id', gate.storeId)
    if (error) return { ok: false, error: 'Could not delete the post.' }
    await revalidateStoreById(gate.storeId)
    return { ok: true }
}
