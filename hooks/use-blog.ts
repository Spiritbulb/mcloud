// hooks/useBlog.ts
// Client-side data hooks for storefront blog pages.
// These mirror the pattern used by the rest of your storefront (local state +
// Supabase client direct), so they slot in exactly like useProducts etc.

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    getPublishedPosts,
    getPostBySlug,
    getRelatedPosts,
} from '@/lib/blog'
import type { BlogPost } from '@/src/themes/types'

// ─── Blog list ────────────────────────────────────────────────────────────────

export function useBlogPosts(storeId: string) {
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetch = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await getPublishedPosts(storeId)
            setPosts(data)
        } catch (e: any) {
            setError(e.message ?? 'Failed to load posts')
        } finally {
            setLoading(false)
        }
    }, [storeId])

    useEffect(() => { fetch() }, [fetch])

    return { posts, loading, error, retry: fetch }
}

// ─── Single post + related ────────────────────────────────────────────────────

export function useBlogPost(storeId: string, slug: string) {
    const [post, setPost] = useState<BlogPost | null>(null)
    const [related, setRelated] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetch = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await getPostBySlug(storeId, slug)
            if (!data) {
                setError('Post not found')
                return
            }
            setPost(data)

            // Load related posts in parallel — non-blocking; failure is silent
            getRelatedPosts(storeId, data.id, data.tags)
                .then(setRelated)
                .catch(() => { })
        } catch (e: any) {
            setError(e.message ?? 'Failed to load post')
        } finally {
            setLoading(false)
        }
    }, [storeId, slug])

    useEffect(() => { fetch() }, [fetch])

    return { post, related, loading, error, retry: fetch }
}