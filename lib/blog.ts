// lib/blog.ts
// All Supabase queries for blog posts and authors.
// Import { createClient } from wherever your app creates its browser/server client.

import { createClient } from '@/lib/client'   // adjust to your path
import type { BlogPost, BlogAuthor } from '@/src/themes/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Rough reading-time estimate: ~200 words per minute */
export function estimateReadingTime(content: string): number {
    const words = content.trim().split(/\s+/).length
    return Math.max(1, Math.round(words / 200))
}

// The Supabase select fragment used everywhere we need a full post + author.
const POST_SELECT = `
  *,
  author:blog_authors (
    id,
    name,
    bio,
    avatar_url,
    user_id,
    store_id,
    created_at,
    updated_at
  )
` as const

// ─── Public storefront queries ────────────────────────────────────────────────

/**
 * Fetch all published posts for a store (ordered newest first).
 * Used by the blog list page.
 */
export async function getPublishedPosts(storeId: string): Promise<BlogPost[]> {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('blog_posts')
        .select(POST_SELECT)
        .eq('store_id', storeId)
        .eq('is_published', true)
        .order('published_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as BlogPost[]
}

/**
 * Fetch a single published post by slug.
 * Used by the blog post detail page.
 */
export async function getPostBySlug(
    storeId: string,
    slug: string
): Promise<BlogPost | null> {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('blog_posts')
        .select(POST_SELECT)
        .eq('store_id', storeId)
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle()

    if (error) throw error
    return (data as BlogPost) ?? null
}

/**
 * Fetch up to `limit` related posts (same tags, excluding current post).
 * Falls back to latest posts if no tag overlap found.
 */
export async function getRelatedPosts(
    storeId: string,
    currentPostId: string,
    tags: string[],
    limit = 3
): Promise<BlogPost[]> {
    const supabase = createClient()

    // Try to find posts sharing at least one tag
    if (tags.length > 0) {
        const { data, error } = await supabase
            .from('blog_posts')
            .select(POST_SELECT)
            .eq('store_id', storeId)
            .eq('is_published', true)
            .neq('id', currentPostId)
            .overlaps('tags', tags)
            .order('published_at', { ascending: false })
            .limit(limit)

        if (!error && data && data.length > 0) return data as BlogPost[]
    }

    // Fallback: just the latest posts
    const { data, error } = await supabase
        .from('blog_posts')
        .select(POST_SELECT)
        .eq('store_id', storeId)
        .eq('is_published', true)
        .neq('id', currentPostId)
        .order('published_at', { ascending: false })
        .limit(limit)

    if (error) throw error
    return (data ?? []) as BlogPost[]
}

// ─── Dashboard / admin queries ────────────────────────────────────────────────
// These return all posts (including drafts) and are intended for your
// store management UI, not the public storefront.

export async function getAllPostsForStore(storeId: string): Promise<BlogPost[]> {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('blog_posts')
        .select(POST_SELECT)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as BlogPost[]
}

export async function getAuthorsForStore(storeId: string): Promise<BlogAuthor[]> {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('blog_authors')
        .select('*')
        .eq('store_id', storeId)
        .order('name')

    if (error) throw error
    return (data ?? []) as BlogAuthor[]
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createAuthor(
    storeId: string,
    input: Pick<BlogAuthor, 'name' | 'bio' | 'avatar_url' | 'user_id'>
): Promise<BlogAuthor> {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('blog_authors')
        .insert({ store_id: storeId, ...input })
        .select()
        .single()

    if (error) throw error
    return data as BlogAuthor
}

export async function upsertPost(
    storeId: string,
    post: Partial<BlogPost> & { title: string; slug: string; content: string }
): Promise<BlogPost> {
    const supabase = createClient()

    const reading_time_minutes = estimateReadingTime(post.content)
    const payload = {
        store_id: storeId,
        reading_time_minutes,
        ...post,
        // Auto-set published_at when flipping to published for the first time
        published_at:
            post.is_published && !post.published_at
                ? new Date().toISOString()
                : post.published_at ?? null,
    }

    const { data, error } = await supabase
        .from('blog_posts')
        .upsert(payload, { onConflict: 'store_id,slug' })
        .select(POST_SELECT)
        .single()

    if (error) throw error
    return data as BlogPost
}

export async function deletePost(postId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId)

    if (error) throw error
}